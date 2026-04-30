#!/usr/bin/env node
// Cool Shit NZ - Stock Drop Monitor
// No external dependencies — uses Node.js built-in fetch (Node 18+) and fs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data");
const SNAPSHOT_PATH = join(DATA_DIR, "coolshit-snapshot.json");

const PRODUCTS_URL = "https://www.coolshit.co.nz/products.json";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO ?? "johnandreilapid@gmail.com";

// Only alert for these product categories
const WATCHED_CATEGORIES = new Set(["pokemon", "one-piece"]);

// Statuses that are worth alerting on when transitioning to them
const INTERESTING_STATUSES = new Set(["active", "pre-order"]);

async function fetchProducts() {
  const res = await fetch(PRODUCTS_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

function detectChanges(products, snapshot) {
  const changes = [];

  for (const product of products) {
    // Skip products not in watched categories
    const inWatchedCategory = product.categories?.some(c => WATCHED_CATEGORIES.has(c.permalink));
    if (!inWatchedCategory) continue;

    const prev = snapshot[product.id];
    const current = {
      id: product.id,
      name: product.name,
      status: product.status,
      url: product.url,
      price: product.default_price,
    };

    if (!prev) {
      // Brand new product — only alert if it's available/interesting
      if (INTERESTING_STATUSES.has(product.status)) {
        changes.push({ type: "new", product: current });
      }
    } else if (prev.status !== current.status && INTERESTING_STATUSES.has(current.status)) {
      // Status changed to something interesting (e.g. coming-soon -> active)
      changes.push({ type: "status_change", from: prev.status, to: current.status, product: current });
    }
  }

  return changes;
}

function buildEmailText(changes) {
  const lines = ["Hey, something just dropped on Cool Shit NZ:\n"];

  for (const change of changes) {
    const { product } = change;
    const price = product.price != null ? `$${(product.price / 100).toFixed(2)}` : "N/A";
    const url = `https://www.coolshit.co.nz${product.url}`;
    const label = change.type === "new" ? "New" : `Back in stock (was ${change.from})`;
    lines.push(`${label}: ${product.name}`);
    lines.push(`Price: ${price}`);
    lines.push(url);
    lines.push("");
  }

  lines.push("- Cool Shit Monitor");
  return lines.join("\n");
}

async function sendEmail(changes) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY env var is not set");
  if (!ALERT_EMAIL_TO) throw new Error("ALERT_EMAIL_TO env var is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Cool Shit Monitor <onboarding@resend.dev>",
      to: [ALERT_EMAIL_TO],
      subject: `${changes.length} new drop(s) on Cool Shit NZ`,
      text: buildEmailText(changes),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${res.status} ${err}`);
  }

  console.log("Email sent via Resend.");
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  // Load existing snapshot
  let snapshot = {};
  if (existsSync(SNAPSHOT_PATH)) {
    try {
      snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
    } catch (e) {
      console.warn("Could not parse snapshot, starting fresh:", e.message);
    }
  } else {
    console.log("No snapshot yet — first run will baseline current products (no alerts sent).");
  }

  const isFirstRun = Object.keys(snapshot).length === 0;

  // Fetch current products
  console.log("Fetching products from Cool Shit NZ...");
  const products = await fetchProducts();
  console.log(`Fetched ${products.length} products.`);

  // Detect changes (skip alerts on first run — just baseline)
  const changes = isFirstRun ? [] : detectChanges(products, snapshot);

  if (changes.length > 0) {
    console.log(`\nFound ${changes.length} change(s):`);
    changes.forEach((c) => {
      if (c.type === "new") console.log(`  [NEW]    ${c.product.name}`);
      else console.log(`  [STOCK]  ${c.product.name} (${c.from} → ${c.to})`);
    });
    await sendEmail(changes);
  } else {
    if (isFirstRun) {
      console.log("First run — snapshot created. Alerts will fire on future changes.");
    } else {
      console.log("No new drops detected.");
    }
  }

  // Save updated snapshot
  const newSnapshot = {};
  for (const product of products) {
    newSnapshot[product.id] = {
      id: product.id,
      name: product.name,
      status: product.status,
      url: product.url,
      price: product.default_price,
    };
  }
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2), "utf8");
  console.log("Snapshot saved.");
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
