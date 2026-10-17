/**
 * Firebase (Firestore) → MongoDB migration for Ledger — REST edition.
 *
 * Why this exists: the old app's Firestore rules only allow
 *   request.auth.uid == resource.data.userId
 * so a service-account key (firebase-admin) was the only way in. This script
 * instead authenticates the way the old web app did — with the project's
 * *public* web config plus a signed-in user — then reads through the Firestore
 * REST API. No Admin SDK, no service-account JSON.
 *
 * ── Credentials (one of) ───────────────────────────────────────────────────
 *   A) The Firebase ID token from a logged-in browser session:
 *        $env:FIREBASE_ID_TOKEN="eyJhbGciOi..."
 *        (Firebase console → Authentication → Users → ⋮ → "Copy ID token", or
 *         run the snippet in the old app's console — see README.)
 *   B) The Firebase account password (email + password sign-in):
 *        $env:FIREBASE_PASSWORD="your-firebase-password"
 *
 * ── Run ────────────────────────────────────────────────────────────────────
 *   node scripts/migrate-firebase-rest.mjs --dry-run
 *   node scripts/migrate-firebase-rest.mjs --fresh --sync-verified
 *
 * Flags:
 *   --dry-run            Parse + map + print counts; write nothing.
 *   --fresh              Delete existing Ledger rows for this user first so the
 *                        import can be re-run without duplicating.
 *   --sync-verified      Mirror Firebase's verified flag onto the MongoDB user.
 *   --email=you@x.com    Whose data to migrate (required with a password; with
 *                        a token it is read from the token, but the flag wins).
 *   --token=...          ID token on the command line (prefer the env var).
 *
 * Field mapping matches scripts/migrate-firebase.mjs (see that header).
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

const args = process.argv.slice(2);
const flags = new Set(args);
const DRY_RUN = flags.has("--dry-run");
const FRESH = flags.has("--fresh");
const SYNC_VERIFIED = flags.has("--sync-verified");

const valOf = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).trim() : null;
};

const env = { ...loadEnv(), ...process.env };
const MONGODB_URI = env.MONGODB_URI;

// Public web config — safe to ship (it is embedded in the old app's bundle).
const API_KEY =
  valOf("api-key") || env.FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || "AIzaSyDDPunEV2hkg8uWlADJmTUPGDM5bV0AHic";
const PROJECT_ID =
  valOf("project") || env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || "monthly-finance-tracker";

const ID_TOKEN = valOf("token") || env.FIREBASE_ID_TOKEN || null;
const PASSWORD = env.FIREBASE_PASSWORD || null;
let ONLY_EMAIL = (valOf("email") || env.FIREBASE_EMAIL || "").toLowerCase() || null;

if (!MONGODB_URI) fail("MONGODB_URI is not set (checked .env.local and the environment).");
if (!ID_TOKEN && !PASSWORD) {
  fail("No credentials. Set FIREBASE_ID_TOKEN (recommended) or FIREBASE_PASSWORD.");
}

// ── Firebase REST helpers ──────────────────────────────────────────────────
const IDENTITY = "https://identitytoolkit.googleapis.com/v1";
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function authError(code) {
  switch (code) {
    case "EMAIL_NOT_FOUND":
    case "INVALID_LOGIN_CREDENTIALS":
    case "INVALID_PASSWORD":
      return "Wrong email or password.";
    case "USER_DISABLED":
      return "That Firebase account has been disabled.";
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return "Too many attempts. Try again later.";
    default:
      return code ? `Firebase sign-in failed: ${code}` : "Firebase sign-in failed.";
  }
}

async function signInWithPassword(email, password) {
  const res = await fetch(`${IDENTITY}/accounts:signInWithPassword?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) fail(authError(data?.error?.message));
  return data.idToken;
}

async function lookupUser(token) {
  const res = await fetch(`${IDENTITY}/accounts:lookup?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.users?.length) {
    fail(`Could not read the account from that token (${data?.error?.message || res.status}).`);
  }
  const u = data.users[0];
  return {
    uid: u.localId,
    email: (u.email || "").toLowerCase(),
    emailVerified: !!u.emailVerified,
    displayName: u.displayName || "",
  };
}

// Firestore REST returns typed values; flatten them to plain JS.
function decodeValue(v) {
  if (v == null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue; // ISO string
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decodeValue);
  if ("referenceValue" in v) return v.referenceValue;
  if ("geoPointValue" in v) return v.geoPointValue;
  return undefined;
}

function decodeFields(fields) {
  const out = {};
  for (const [k, val] of Object.entries(fields)) out[k] = decodeValue(val);
  return out;
}

/** Reads a whole collection for one user. The userId filter is required — it is
 *  what satisfies the security rule for a list query. */
async function queryCollection(collectionId, uid, token) {
  const LIMIT = 300;
  let offset = 0;
  const out = [];
  for (;;) {
    const res = await fetch(`${FIRESTORE}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId }],
          where: {
            fieldFilter: {
              field: { fieldPath: "userId" },
              op: "EQUAL",
              value: { stringValue: uid },
            },
          },
          offset,
          limit: LIMIT,
        },
      }),
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      throw new Error(data?.error?.message || `runQuery ${collectionId} failed (${res.status})`);
    }
    const batch = (Array.isArray(data) ? data : [])
      .filter((r) => r.document)
      .map((r) => ({
        id: r.document.name.split("/").pop(),
        data: decodeFields(r.document.fields || {}),
      }));
    out.push(...batch);
    if (batch.length < LIMIT) break;
    offset += LIMIT;
  }
  return out;
}

// ── mapping helpers ────────────────────────────────────────────────────────
const toDate = (v) => {
  if (!v) return undefined;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};
const trimStr = (v) => (typeof v === "string" ? v.trim() : "");

// Normalise the old app's category vocabulary onto the new app's presets so
// migrated rows are selectable/editable in the new UI. Anything unrecognised
// falls back to "Other".
const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Rent",
  "Books and supplies",
  "Data and airtime",
  "Health",
  "Social",
  "Fees",
  "Savings",
  "Other",
];
const INCOME_CATEGORIES = [
  "Allowance",
  "Salary",
  "Freelance",
  "Gift",
  "Scholarship",
  "Refund",
  "Other",
];
const CATEGORY_MAP = {
  // expense
  Shopping: "Other",
  Bills: "Other",
  Entertainment: "Social",
  Healthcare: "Health",
  Education: "Books and supplies",
  // income
  "Initial Balance": "Other",
  Investment: "Other",
};

function normalizeCategory(raw, type) {
  const name = trimStr(raw);
  const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const mapped = CATEGORY_MAP[name] || name;
  return list.includes(mapped) ? mapped : "Other";
}

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

const MAPPERS = {
  transactions(d, userId) {
    const amount = Number(d.amount);
    const valid = isFinite(amount) && amount > 0;
    // The old app stored type as 'Income' / 'Expense' (capitalised).
    const isIncome = String(d.type || "").trim().toLowerCase() === "income";
    return {
      valid,
      doc: {
        userId,
        type: isIncome ? "income" : "expense",
        amount: valid ? amount : 0,
        category: normalizeCategory(d.category, isIncome ? "income" : "expense"),
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
        category: normalizeCategory(d.category, "expense"),
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
        notes: trimStr(d.notes) || undefined,
        dueDate: toDate(d.dueDate),
        status: total > 0 && paid >= total ? "paid" : "active",
      },
    };
  },
  notes(d, userId) {
    const content = trimStr(d.content);
    return { valid: !!content, doc: { userId, title: noteTitleFrom(content), content } };
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
  console.log(`\n▶ Firebase REST → MongoDB migration${DRY_RUN ? "  (DRY RUN — no writes)" : ""}`);
  console.log(`  project : ${PROJECT_ID}`);

  // 1) Authenticate --------------------------------------------------------
  let token = ID_TOKEN;
  if (!token) {
    if (!ONLY_EMAIL) fail("Signing in with a password needs --email=you@x.com (or FIREBASE_EMAIL).");
    console.log(`  auth    : password sign-in as ${ONLY_EMAIL}`);
    token = await signInWithPassword(ONLY_EMAIL, PASSWORD);
  } else {
    console.log("  auth    : using a supplied ID token");
  }

  const who = await lookupUser(token);
  const email = (ONLY_EMAIL || who.email).toLowerCase();
  const uid = who.uid;
  if (!email) fail("Could not determine the account email.");
  console.log(`  account : ${email}  (uid ${uid})`);
  console.log(`  mongo   : ${MONGODB_URI.replace(/\/\/[^@]*@/, "//***@")}\n`);

  if (who.email && email !== who.email && !ID_TOKEN) {
    fail(`Token/account mismatch: token is ${who.email} but --email is ${email}.`);
  }

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const db = mongoose.connection.db;
  const usersCol = db.collection("users");

  // 2) Resolve the MongoDB user -------------------------------------------
  let mongoUser = await usersCol.findOne({ email });
  if (mongoUser) {
    console.log(`  user    : reusing existing Ledger account ${mongoUser._id}`);
    if (SYNC_VERIFIED && who.emailVerified && !mongoUser.emailVerified && !DRY_RUN) {
      await usersCol.updateOne(
        { _id: mongoUser._id },
        { $set: { emailVerified: new Date(), updatedAt: new Date() } }
      );
      console.log("          → marked email verified");
    }
  } else if (DRY_RUN) {
    mongoUser = { _id: new mongoose.Types.ObjectId() };
    console.log(`  user    : would create a new Ledger account (${mongoUser._id})`);
  } else {
    const random = crypto.randomBytes(32).toString("hex");
    const now = new Date();
    const res = await usersCol.insertOne({
      name: trimStr(who.displayName) || email.split("@")[0],
      email,
      emailVerified: who.emailVerified ? new Date() : null,
      password: await bcrypt.hash(random, 12),
      currency: "XAF",
      preferences: { theme: "system", notifications: true },
      createdAt: now,
      updatedAt: now,
    });
    mongoUser = { _id: res.insertedId };
    console.log(`  user    : created Ledger account ${mongoUser._id} (must reset password)`);
  }

  const userId = mongoUser._id;

  // 3) Pull + map + insert -------------------------------------------------
  const summary = [];
  for (const [col, mapper] of Object.entries(MAPPERS)) {
    let found = [];
    try {
      found = await queryCollection(col, uid, token);
    } catch (e) {
      console.warn(`  · ${col}: ${e.message}`);
      summary.push({ collection: col, found: "error", inserted: 0, skipped: 0 });
      continue;
    }

    const target = db.collection(col);
    let inserted = 0;
    let skipped = 0;

    if (FRESH && !DRY_RUN) {
      await target.deleteMany({ userId });
    }

    for (const { data } of found) {
      const { doc: mapped, valid } = mapper(data, userId);
      if (!valid) {
        skipped++;
        continue;
      }
      const now = new Date();
      const row = {
        ...mapped,
        createdAt: toDate(data.createdAt) || now,
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
        console.warn(`  · ${col} insert failed: ${e.message}`);
        skipped++;
      }
    }
    summary.push({ collection: col, found: found.length, inserted, skipped });
  }

  // 4) Report --------------------------------------------------------------
  console.log("\nCollection        found   imported   skipped");
  for (const s of summary) {
    console.log(
      `${s.collection.padEnd(16)} ${String(s.found).padStart(5)}   ${String(s.inserted).padStart(8)}   ${String(s.skipped).padStart(7)}`
    );
  }
  console.log(
    `\n${DRY_RUN ? "Dry run complete." : "Migration complete."}\n`
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("\n✖ Migration failed:", err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
