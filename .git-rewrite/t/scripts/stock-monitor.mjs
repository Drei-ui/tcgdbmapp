import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_FILE = path.join(__dirname, ".stock-snapshot.json");
const PRODUCTS_URL = "https://www.coolshit.co.nz/products.json";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Email config from .env
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || "587");
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO;

function createTransporter() {
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS || !EMAIL_TO) {
    console.warn(
      "[WARN] Email not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_TO in .env"
    );
    console.warn("[WARN] Falling back to console-only notifications.\n");
    return null;
  }
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_FILE)) return {};
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
}

function saveSnapshot(snapshot) {
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
}

async function fetchProducts() {
  const res = await fetch(PRODUCTS_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

function detectChanges(oldSnapshot, products) {
  const changes = { newProducts: [], restocked: [], statusChanges: [] };

  for (const product of products) {
    const id = String(product.id);
    const old = oldSnapshot[id];

    if (!old) {
      changes.newProducts.push(product);
    } else {
      if (old.status === "sold-out" && product.status !== "sold-out") {
        changes.restocked.push(product);
      } else if (old.status !== product.status) {
        changes.statusChanges.push({
          product,
          from: old.status,
          to: product.status,
        });
      }
    }
  }

  return changes;
}

function buildSnapshot(products) {
  const snapshot = {};
  for (const p of products) {
    snapshot[String(p.id)] = {
      name: p.name,
      status: p.status,
      price: p.default_price,
      url: p.url,
    };
  }
  return snapshot;
}

function formatPrice(cents) {
  if (!cents) return "N/A";
  return `$${(cents / 100).toFixed(2)}`;
}

function buildNotificationHtml(changes) {
  let html = `<h2>Cool Shit NZ - Stock Update</h2>`;
  html += `<p>Detected at ${new Date().toLocaleString("en-NZ")}</p>`;

  if (changes.newProducts.length > 0) {
    html += `<h3>🆕 New Products (${changes.newProducts.length})</h3><ul>`;
    for (const p of changes.newProducts) {
      html += `<li><a href="${p.url}">${p.name}</a> — ${formatPrice(p.default_price)} (${p.status})</li>`;
    }
    html += `</ul>`;
  }

  if (changes.restocked.length > 0) {
    html += `<h3>🔄 Restocked (${changes.restocked.length})</h3><ul>`;
    for (const p of changes.restocked) {
      html += `<li><a href="${p.url}">${p.name}</a> — ${formatPrice(p.default_price)} (${p.status})</li>`;
    }
    html += `</ul>`;
  }

  if (changes.statusChanges.length > 0) {
    html += `<h3>📋 Status Changes (${changes.statusChanges.length})</h3><ul>`;
    for (const { product, from, to } of changes.statusChanges) {
      html += `<li><a href="${product.url}">${product.name}</a> — ${from} → ${to}</li>`;
    }
    html += `</ul>`;
  }

  return html;
}

function buildNotificationText(changes) {
  const lines = ["=== Cool Shit NZ - Stock Update ===", ""];

  if (changes.newProducts.length > 0) {
    lines.push(`NEW PRODUCTS (${changes.newProducts.length}):`);
    for (const p of changes.newProducts) {
      lines.push(`  + ${p.name} — ${formatPrice(p.default_price)} (${p.status})`);
      lines.push(`    ${p.url}`);
    }
    lines.push("");
  }

  if (changes.restocked.length > 0) {
    lines.push(`RESTOCKED (${changes.restocked.length}):`);
    for (const p of changes.restocked) {
      lines.push(`  + ${p.name} — ${formatPrice(p.default_price)} (${p.status})`);
      lines.push(`    ${p.url}`);
    }
    lines.push("");
  }

  if (changes.statusChanges.length > 0) {
    lines.push(`STATUS CHANGES (${changes.statusChanges.length}):`);
    for (const { product, from, to } of changes.statusChanges) {
      lines.push(`  ~ ${product.name} — ${from} → ${to}`);
      lines.push(`    ${product.url}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function sendNotification(transporter, changes) {
  const text = buildNotificationText(changes);
  console.log(text);

  if (!transporter) return;

  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: EMAIL_TO,
      subject: `Cool Shit NZ — ${changes.newProducts.length} new, ${changes.restocked.length} restocked`,
      text,
      html: buildNotificationHtml(changes),
    });
    console.log(`[OK] Email sent to ${EMAIL_TO}`);
  } catch (err) {
    console.error(`[ERR] Failed to send email:`, err.message);
  }
}

async function check(transporter) {
  const timestamp = new Date().toLocaleTimeString("en-NZ");
  try {
    const products = await fetchProducts();
    const oldSnapshot = loadSnapshot();
    const isFirstRun = Object.keys(oldSnapshot).length === 0;
    const changes = detectChanges(oldSnapshot, products);
    const newSnapshot = buildSnapshot(products);
    saveSnapshot(newSnapshot);

    const hasChanges =
      changes.newProducts.length > 0 ||
      changes.restocked.length > 0 ||
      changes.statusChanges.length > 0;

    if (isFirstRun) {
      console.log(
        `[${timestamp}] First run — saved snapshot of ${products.length} products.`
      );
    } else if (hasChanges) {
      console.log(`[${timestamp}] Changes detected!`);
      await sendNotification(transporter, changes);
    } else {
      console.log(`[${timestamp}] No changes.`);
    }
  } catch (err) {
    console.error(`[${timestamp}] Error:`, err.message);
  }
}

// Main
console.log("=== Cool Shit NZ Stock Monitor ===");
console.log(`Checking every ${CHECK_INTERVAL_MS / 1000 / 60} minutes`);
console.log(`Products URL: ${PRODUCTS_URL}\n`);

const transporter = createTransporter();

// Initial check
await check(transporter);

// Schedule recurring checks
setInterval(() => check(transporter), CHECK_INTERVAL_MS);
