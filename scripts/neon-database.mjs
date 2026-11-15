import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { loadNeonEnv, root } from "./neon-env.mjs";
loadNeonEnv();
const expectedProject = "gentle-recipe-84314203";
const link = JSON.parse(readFileSync(root + ".neon", "utf8"));
if (link.projectId !== expectedProject || link.branch !== "production")
  throw new Error("Unexpected Neon project or branch; provisioning refused.");
const adminUrl = new URL(process.env.DATABASE_URL_UNPOOLED ?? "");
if (!adminUrl.hostname.endsWith(".neon.tech"))
  throw new Error("A Neon direct connection is required.");
adminUrl.searchParams.set("sslmode", "verify-full");
const local = root + ".env.neon.local";
const admin = new pg.Client({
  connectionString: adminUrl.href,
  connectionTimeoutMillis: 30000,
});
let target;
try {
  await admin.connect();
  const databases = await admin.query(
    "SELECT datname FROM pg_database WHERE datname='smartpricing_demo'",
  );
  const roles = await admin.query(
    "SELECT rolname FROM pg_roles WHERE rolname IN ('smartpricing_demo','smartpricing_demo_admin')",
  );
  if (databases.rowCount || roles.rowCount) {
    if (!existsSync(local))
      throw new Error(
        "Existing demo database or roles found without local setup credentials. Preserved; no passwords or data were changed.",
      );
    console.log(
      "Existing demo setup found; verifying identity without changing data.",
    );
  } else {
    const password = randomBytes(32).toString("hex");
    const appUrl = new URL(adminUrl);
    appUrl.username = "smartpricing_demo";
    appUrl.password = password;
    appUrl.pathname = "/smartpricing_demo";
    writeFileSync(
      local,
      `# Generated private restricted application connection. Never commit.\nNEON_APP_DATABASE_URL=${appUrl.href}\n`,
      { flag: "wx", mode: 0o600 },
    );
    process.env.NEON_APP_DATABASE_URL = appUrl.href;
    await admin.query(
      "CREATE ROLE smartpricing_demo_admin NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION",
    );
    await admin.query(
      `CREATE ROLE smartpricing_demo LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
    );
    const user = (await admin.query("SELECT current_user AS name")).rows[0]
      .name;
    const ident = '"' + user.replaceAll('"', '""') + '"';
    await admin.query(
      `GRANT smartpricing_demo_admin, smartpricing_demo TO ${ident}`,
    );
    await admin.query(
      "CREATE DATABASE smartpricing_demo OWNER smartpricing_demo",
    );
    console.log(
      "Created dedicated smartpricing_demo database and separated roles.",
    );
  }
  const targetUrl = new URL(adminUrl);
  targetUrl.pathname = "/smartpricing_demo";
  target = new pg.Client({
    connectionString: targetUrl.href,
    connectionTimeoutMillis: 30000,
  });
  await target.connect();
  const marker = await target.query(
    "SELECT to_regclass('demo_control.environment') AS marker",
  );
  if (!marker.rows[0].marker) {
    const tables = await target.query(
      "SELECT count(*)::int AS count FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')",
    );
    if (tables.rows[0].count !== 0)
      throw new Error(
        "Unmarked nonempty database preserved; bootstrap refused.",
      );
    await target.query("BEGIN");
    try {
      await target.query(
        "CREATE SCHEMA demo_control AUTHORIZATION smartpricing_demo_admin",
      );
      await target.query("SET LOCAL ROLE smartpricing_demo_admin");
      await target.query(
        readFileSync(root + "infra/neon/demo-control.sql", "utf8"),
      );
      await target.query("COMMIT");
    } catch (e) {
      await target.query("ROLLBACK");
      throw e;
    }
  }
  const check = await target.query(
    "SELECT marker,pg_get_userbyid(c.relowner) AS owner,has_table_privilege('smartpricing_demo','demo_control.environment','INSERT,UPDATE,DELETE,TRUNCATE') AS writable FROM demo_control.environment CROSS JOIN pg_class c WHERE c.oid='demo_control.environment'::regclass AND id=1",
  );
  const row = check.rows[0];
  if (
    row?.marker !== "SMARTPRICING_ISOLATED_PORTFOLIO_V1" ||
    row.owner !== "smartpricing_demo_admin" ||
    row.writable
  )
    throw new Error(
      "Demo identity verification failed; application startup must remain blocked.",
    );
  console.log(
    "Verified portfolio identity: separate marker owner; application cannot modify marker.",
  );
  console.log(
    "Private application connection saved in .env.neon.local. Next: npm run build, npm run neon:seed, npm start.",
  );
} catch (e) {
  console.error(
    "Neon setup failed:",
    e.code ?? "",
    e.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[redacted connection]"),
  );
  process.exitCode = 1;
} finally {
  if (target) await target.end();
  await admin.end();
}
