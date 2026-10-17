/**
 * Firebase (Firestore + Auth) → MongoDB migration for Ledger.
 *
 * Passwords CANNOT be migrated: Firebase stores its own hashes that bcrypt
 * cannot verify. Every migrated user gets a random invalid password and must
 * use "Forgot password" to set a new one. Email-verification state is kept.
 *
 * ── Setup ──────────────────────────────────────────────────────────────────
 *  1. Firebase console → Project settings → Service accounts →
 *     "Generate new private key". Save the JSON somewhere safe (NOT in git).
 *  2. Make sure MONGODB_URI is set in .env.local (and, for Atlas, that this
 *     machine's IP is allow-listed).
 *  3. Install the Admin SDK (dev-only):
 *         npm i -D firebase-admin
 *  4. Dry run, then the real import (PowerShell):
 *         $env:FIREBASE_SERVICE_ACCOUNT="C:\path\to\serviceAccount.json"
 *         node scripts/migrate-firebase.mjs --dry-run
 *         node scripts/migrate-firebase.mjs
 *
 * Flags:
 *   --dry-run   Parse + map everything and print counts; write nothing.
 *   --fresh     Delete existing Ledger data for the migrated users first, so
 *               the import can be re-run without duplicating rows.
 *
 * Field mapping (old Firestore → Ledger):
 *   transactions  userId,date,type,description,category,amount
 *                 → userId,date,type,amount,category,description
 *                   (paymentMethod / notes / isRecurring are dropped)
 *   budgets       userId,category,amount,period,createdAt
 *                 → + startDate/endDate derived from createdAt + period
 *   debts         userId,type('owed'|'owing'),personName,reason,totalAmount,
 *                 paidAmount,dueDate
 *                 → type('owed_to_me'|'i_owe'),person,amount=remaining,
 *                   description=reason,status,dueDate
 *   notes         userId,content → title (first line),content
 *   todos         userId,text,completed → title,completed,priority='medium'
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// ── env ────────────────────────────────────────────────────────────────────
function loadEnv() {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function fail(msg) {
  console.error("\n✖ " + msg + "\n");
  process.exit(1);
}

const flags = new Set(process.argv.slice(2));
const DRY_RUN = flags.has("--dry-run");
const FRESH = flags.has("--fresh");

const env = { ...loadEnv(), ...process.env };
const MONGODB_URI = env.MONGODB_URI;
const SA_PATH = env.FIREBASE_SERVICE_ACCOUNT;

if (!MONGODB_URI) fail("MONGODB_URI is not set (checked .env.local and the environment).");
if (!SA_PATH) fail("FIREBASE_SERVICE_ACCOUNT is not set — point it at your service-account JSON.");

// ── helpers ────────────────────────────────────────────────────────────────
const toDate = (v) => {
  if (!v) return undefined;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};
const trimStr = (v) => (typeof v === "string" ? v.trim() : "");

function periodWindow(period, ref) {
  const d = ref instanceof Date && !isNaN(ref.getTime()) ? ref : new Date();
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  if (period === "weekly") {
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }
  if (period === "yearly") {
    return {
      startDate: new Date(start.getFullYear(), 0, 1),
      endDate: new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  return {
    startDate: new Date(start.getFullYear(), start.getMonth(), 1),
    endDate: new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function noteTitleFrom(content) {
  const first = trimStr(content).split(/\r?\n/)[0].trim();
  if (!first) return "Imported note";
  return first.length > 60 ? first.slice(0, 57) + "…" : first;
}

const mapDebtType = (v) =>
  String(v) === "owing" || String(v) === "i_owe" ? "i_owe" : "owed_to_me";

// ── mappers (return {doc, valid}) ──────────────────────────────────────────
const MAPPERS = {
  transactions(d, userId) {
    const amount = Number(d.amount);
    const valid = isFinite(amount) && amount > 0;
    return {
      valid,
      doc: {
        userId,
        type: d.type === "income" ? "income" : "expense",
        amount: valid ? amount : 0,
        category: trimStr(d.category) || "Uncategorised",
        description: trimStr(d.description) || "Imported transaction",
        date: toDate(d.date) || new Date(),
      },
    };
  },
  budgets(d, userId) {
    const period = ["monthly", "weekly", "yearly"].includes(d.period) ? d.period : "monthly";
    const createdAt = toDate(d.createdAt) || new Date();
    const amount = Number(d.amount);
    const valid = isFinite(amount) && amount > 0;
    return {
      valid,
      doc: {
        userId,
        category: trimStr(d.category) || "Uncategorised",
        amount: valid ? amount : 0,
        period,
        ...periodWindow(period, createdAt),
        spent: 0,
      },
    };
  },
  debts(d, userId) {
    const total = Number(d.totalAmount);
    const paid = Number(d.paidAmount) || 0;
    const remaining = Math.max(total - paid, 0);
    const reason = trimStr(d.reason) || "Imported debt";
    return {
      valid: isFinite(total) && total > 0,
      doc: {
        userId,
        type: mapDebtType(d.type),
        person: trimStr(d.personName) || "Unknown",
        amount: remaining > 0 ? remaining : total,
        description: (paid > 0 ? `${reason} (paid ${paid} of ${total})` : reason).trim(),
        dueDate: toDate(d.dueDate),
        status: total > 0 && paid >= total ? "paid" : "active",
      },
    };
  },
  notes(d, userId) {
    const content = trimStr(d.content);
    return {
      valid: !!content,
      doc: { userId, title: noteTitleFrom(content), content },
    };
  },
  todos(d, userId) {
    const text = trimStr(d.text);
    return {
      valid: !!text,
      doc: { userId, title: text || "Imported task", completed: !!d.completed, priority: "medium" },
    };
  },
};

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  let admin;
  try {
    admin = (await import("firebase-admin")).default;
  } catch {
    fail("The 'firebase-admin' package is not installed. Run: npm i -D firebase-admin");
  }

  const sa = JSON.parse(fs.readFileSync(path.resolve(SA_PATH), "utf8"));
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
  const fdb = admin.firestore();
  const auth = admin.auth();

  console.log(`\n▶ Firebase → MongoDB migration${DRY_RUN ? "  (DRY RUN — no writes)" : ""}`);
  console.log(`  project : ${sa.project_id}`);
  console.log(`  mongo   : ${MONGODB_URI.replace(/\/\/[^@]*@/, "//***@")}\n`);

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const db = mongoose.connection.db;
  const usersCol = db.collection("users");

  // 1) Users ---------------------------------------------------------------
  const authUsers = [];
  let pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    authUsers.push(...res.users);
    pageToken = res.pageToken;
  } while (pageToken);

  console.log(`Firebase users found: ${authUsers.length}`);
  const uidToId = new Map();
  let createdUsers = 0;

  for (const u of authUsers) {
    const email = trimStr(u.email).toLowerCase();
    if (!email) {
      console.warn(`  · skipping user ${u.uid} (no email)`);
      continue;
    }
    let existing = await usersCol.findOne({ email });
    if (!existing && !DRY_RUN) {
      const random = crypto.randomBytes(32).toString("hex");
      const now = new Date();
      const res = await usersCol.insertOne({
        name: trimStr(u.displayName) || email.split("@")[0],
        email,
        emailVerified: u.emailVerified ? new Date() : null,
        password: await bcrypt.hash(random, 12),
        currency: "XAF",
        preferences: { theme: "system", notifications: true },
        createdAt: now,
        updatedAt: now,
      });
      existing = { _id: res.insertedId };
      createdUsers++;
    } else if (!existing) {
      existing = { _id: new mongoose.Types.ObjectId() };
      createdUsers++;
    }
    uidToId.set(u.uid, existing._id);
  }
  console.log(`  → users created: ${createdUsers}, reused: ${uidToId.size - createdUsers}\n`);

  // 2) Collections ---------------------------------------------------------
  const summary = [];

  for (const [col, mapper] of Object.entries(MAPPERS)) {
    const snap = await fdb.collection(col).get();
    const target = db.collection(col);
    let inserted = 0;
    let skipped = 0;

    // --fresh: remove this user set's existing rows in the collection.
    if (FRESH && !DRY_RUN) {
      await target.deleteMany({ userId: { $in: [...uidToId.values()] } });
    }

    for (const doc of snap.docs) {
      const raw = doc.data();
      const userId = uidToId.get(raw.userId);
      if (!userId) {
        skipped++;
        continue;
      }
      const { doc: mapped, valid } = mapper(raw, userId);
      if (!valid) {
        skipped++;
        continue;
      }
      const now = new Date();
      const row = {
        ...mapped,
        createdAt: toDate(raw.createdAt) || now,
        updatedAt: now,
      };
      if (DRY_RUN) {
        inserted++;
        continue;
      }
      try {
        await target.insertOne(row);
        inserted++;
      } catch (e) {
        console.warn(`  · ${col}/${doc.id} failed: ${e.message}`);
        skipped++;
      }
    }
    summary.push({ collection: col, found: snap.size, inserted, skipped });
  }

  // 3) Report --------------------------------------------------------------
  console.log("Collection        found   imported   skipped");
  for (const s of summary) {
    console.log(
      `${s.collection.padEnd(16)} ${String(s.found).padStart(5)}   ${String(s.inserted).padStart(8)}   ${String(s.skipped).padStart(7)}`
    );
  }
  console.log(
    `\n${DRY_RUN ? "Dry run complete." : "Migration complete."} ` +
      `Users created: ${createdUsers}. Migrated users must reset their passwords.\n`
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("\n✖ Migration failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
