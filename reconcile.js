// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

function toKobo(amount) {
  const n = typeof amount === "number" ? amount : Number(String(amount).replace(/,/g, "").trim());
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

const latest = new Map(); //tnx_id -> latest event for that tnx_id
const lines = fs.readFileSync("payments.jsonl", "utf8").split(/\r?\n/);

for (const line of lines) {
  if (line.trim().length === 0) continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // ignore invalid JSON
  }

  if(event === null || typeof event !== "object" || Array.isArray(event)) 
    continue;

  const id = event.txn_id;
  if (id === undefined || id === null || String(id).trim() === "") continue;

  const ts = Date.parse(event.ts);
  if (Number.isNaN(ts)) continue; // ignore events with invalid timestamp

  const prev = latest.get(id);
  if (!prev || ts >= prev.ts) 
    latest.set(id, { ts, status: event.status, amount: event.amount });
}

let totalKobo = 0;
let count = 0;

for (const e of latest.values()) {
  if (e.status !== "success") continue;
  const kobo = toKobo(e.amount);
  if (kobo === null) continue;
  totalKobo += kobo;
  count += 1;
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(totalKobo / 100)}`);
}
