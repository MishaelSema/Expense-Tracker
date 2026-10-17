/**
 * Prints per-collection document counts for one Ledger account.
 *
 *   node scripts/db-stats.mjs --email=you@example.com
 */

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

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

const args = process.argv.slice(2);
const emailArg = args.find((a) => a.startsWith("--email="));
const email = (emailArg ? emailArg.slice(8) : "").trim().toLowerCase();

const env = { ...loadEnv(), ...process.env };
if (!env.MONGODB_URI) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}
if (!email) {
  console.error("Usage: node scripts/db-stats.mjs --email=you@example.com");
  process.exit(1);
}

const COLLECTIONS = [
  "transactions",
  "budgets",
  "debts",
  "notes",
  "todos",
  "goals",
  "wishlistitems",
  "bills",
  "reminders",
];

await mongoose.connect(env.MONGODB_URI, { bufferCommands: false });
const db = mongoose.connection.db;

const user = await db.collection("users").findOne({ email });
if (!user) {
  console.error(`No Ledger user with email ${email}`);
  await mongoose.disconnect();
  process.exit(1);
}

console.log(`\nUser: ${email}`);
console.log(`  _id            : ${user._id}`);
console.log(`  emailVerified  : ${user.emailVerified ? "yes" : "no"}`);
console.log(`  currency       : ${user.currency}`);
console.log(`  preferences    : ${JSON.stringify(user.preferences)}\n`);

let total = 0;
for (const c of COLLECTIONS) {
  const n = await db.collection(c).countDocuments({ userId: user._id });
  total += n;
  console.log(`  ${c.padEnd(16)} ${String(n).padStart(5)}`);
}
console.log(`  ${"TOTAL".padEnd(16)} ${String(total).padStart(5)}\n`);

if (args.includes("--samples")) {
  const byType = await db
    .collection("transactions")
    .aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: "$type", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ])
    .toArray();
  console.log("── transactions by type ──");
  for (const t of byType) console.log(`  ${String(t._id).padEnd(10)} ${t.count}  (sum ${t.total})`);

  const byCat = await db
    .collection("transactions")
    .aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
  console.log("\n── transactions by category ──");
  for (const c of byCat) console.log(`  ${String(c._id).padEnd(22)} ${c.count}`);
  console.log("");

  for (const c of ["transactions", "budgets", "debts", "todos"]) {
    const docs = await db.collection(c).find({ userId: user._id }).limit(2).toArray();
    console.log(`── ${c} ──`);
    console.log(JSON.stringify(docs, null, 2));
    console.log("");
  }
}

await mongoose.disconnect();
