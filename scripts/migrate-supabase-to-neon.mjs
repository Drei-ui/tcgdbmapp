/**
 * One-time migration script: Supabase → Neon
 * Copies all data table-by-table, respecting foreign key order.
 *
 * Usage: node scripts/migrate-supabase-to-neon.mjs
 */
import pg from "pg";
const { Client } = pg;

// ── Connection strings ──
// Set these in your environment or .env file — never hardcode credentials
const SUPABASE_URL = process.env.SUPABASE_MIGRATION_URL;
const NEON_URL = process.env.NEON_MIGRATION_URL;

if (!SUPABASE_URL || !NEON_URL) {
  console.error("Error: SUPABASE_MIGRATION_URL and NEON_MIGRATION_URL must be set in your environment.");
  process.exit(1);
}

// Tables in FK-safe order (parents first, children after)
const TABLES = [
  "users",
  "suppliers",
  "product_catalog",
  "purchases",
  "purchase_line_items",
  "inventory_lots",
  "sales",
  "sale_line_items",
  "cash_transactions",
  "audit_log",
];

async function migrate() {
  const source = new Client({ connectionString: SUPABASE_URL });
  const target = new Client({ connectionString: NEON_URL });

  try {
    console.log("Connecting to Supabase...");
    await source.connect();
    console.log("Connecting to Neon...");
    await target.connect();

    for (const table of TABLES) {
      console.log(`\nMigrating "${table}"...`);

      // Read all rows from Supabase
      const { rows } = await source.query(`SELECT * FROM "${table}"`);
      console.log(`  Found ${rows.length} rows`);

      if (rows.length === 0) continue;

      // Get column names from first row
      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `"${c}"`).join(", ");
      const placeholders = columns
        .map((_, i) => `$${i + 1}`)
        .join(", ");

      // Insert row by row (safe for mixed types, handles nulls)
      let inserted = 0;
      for (const row of rows) {
        const values = columns.map((c) => {
          const val = row[c];
          // Convert JS objects (JSON columns) to string
          if (val !== null && typeof val === "object" && !(val instanceof Date)) {
            return JSON.stringify(val);
          }
          return val;
        });

        try {
          await target.query(
            `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            values
          );
          inserted++;
        } catch (err) {
          console.error(`  Error inserting row in "${table}":`, err.message);
          console.error(`  Row:`, JSON.stringify(row).slice(0, 200));
        }
      }

      console.log(`  Inserted ${inserted}/${rows.length} rows`);
    }

    console.log("\n✅ Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await source.end();
    await target.end();
  }
}

migrate();
