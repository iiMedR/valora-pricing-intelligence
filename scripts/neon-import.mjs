import { spawnSync } from "node:child_process";
import pg from "pg";
import { loadNeonEnv, root } from "./neon-env.mjs";
loadNeonEnv();
const url = new URL(process.env.NEON_APP_DATABASE_URL ?? "");
if (
  url.pathname !== "/smartpricing_demo" ||
  decodeURIComponent(url.username) !== "smartpricing_demo" ||
  !url.hostname.endsWith(".neon.tech")
)
  throw new Error("Dedicated demo target required.");
url.searchParams.set("sslmode", "verify-full");
const client = new pg.Client({
  connectionString: url.href,
  connectionTimeoutMillis: 30000,
});
const tables = [
  "business_settings",
  "app_metadata",
  "categories",
  "products",
  "product_variants",
  "variant_price_history",
  "variant_cost_history",
  "inventory_snapshots",
  "sales_orders",
  "sales_order_items",
  "sales_refunds",
  "demo_control.catalog_mappings",
  "demo_control.seed_runs",
];
const args = [
  "exec",
  "smartpricing-portfolio-postgres-portfolio-1",
  "pg_dump",
  "-U",
  "smartpricing_demo_admin",
  "-d",
  "smartpricing_demo",
  "--data-only",
  "--column-inserts",
  "--rows-per-insert=1000",
  "--no-owner",
  "--no-privileges",
  ...tables.map((t) => "--table=" + t),
];
const dump = spawnSync("docker", args, {
  encoding: "utf8",
  maxBuffer: 128 * 1024 * 1024,
});
if (dump.status !== 0)
  throw new Error(
    "Portfolio snapshot export failed; no remote changes attempted.",
  );
const sql = dump.stdout
  .split(/\r?\n/)
  .filter((line) => !line.startsWith("\\"))
  .join("\n")
  .replace(
    "SELECT pg_catalog.set_config('search_path', '', false);",
    "SET search_path TO public;",
  )
  .replace(
    /(INSERT INTO public.business_settings [\s\S]*?);/,
    "$1 ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name,currency_code=EXCLUDED.currency_code,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at,version=EXCLUDED.version;",
  );
try {
  await client.connect();
  await client.query("BEGIN");
  const counts = (
    await client.query(
      "SELECT (SELECT count(*) FROM products)::int AS products,(SELECT count(*) FROM sales_orders)::int AS orders,(SELECT count(*) FROM demo_control.seed_runs)::int AS seeds",
    )
  ).rows[0];
  if (counts.products || counts.orders || counts.seeds)
    throw new Error(
      "Nonempty demo preserved; snapshot import is initial-setup only.",
    );
  const marker = (
    await client.query("SELECT marker FROM demo_control.environment WHERE id=1")
  ).rows[0]?.marker;
  if (marker !== "SMARTPRICING_ISOLATED_PORTFOLIO_V1")
    throw new Error("Portfolio marker mismatch.");
  // Only replace Flyway initial defaults in the verified empty target; no reset path exists.
  await client.query(sql);
  await client.query("SET search_path TO public");
  const result = (
    await client.query(
      "SELECT generator_version,checksum,(SELECT count(*)::int FROM product_variants) AS variants,(SELECT count(*)::int FROM sales_orders) AS orders FROM demo_control.seed_runs WHERE id=1",
    )
  ).rows[0];
  if (
    result?.checksum !==
      "5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6" ||
    result.variants !== 30 ||
    result.orders !== 9863
  )
    throw new Error("Unexpected imported snapshot; transaction rolled back.");
  await client.query("COMMIT");
  console.log(
    "Imported verified frozen portfolio snapshot:",
    JSON.stringify(result),
  );
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Import failed:", e.code ?? "", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
