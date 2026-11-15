import { writeFileSync } from "node:fs";
import { appEnvironment, root } from "./neon-env.mjs";
try {
  const arg = process.argv.find((value) =>
    value.startsWith("--frontend-origin="),
  );
  const origin = new URL(arg?.slice("--frontend-origin=".length) ?? "");
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error("HTTPS frontend origin required");
  const env = appEnvironment();
  const output = [
    "# Private Render environment. Paste values into the Render dashboard; never commit.",
    `NEON_JDBC_URL=${env.NEON_JDBC_URL}`,
    `NEON_DB_PASSWORD=${env.NEON_DB_PASSWORD}`,
    `FRONTEND_ORIGIN=${origin.origin}`,
    "",
  ].join("\n");
  writeFileSync(root + ".env.render.local", output, { mode: 0o600 });
  console.log(
    "Wrote Git-ignored .env.render.local (NEON_JDBC_URL, NEON_DB_PASSWORD, FRONTEND_ORIGIN). Values were not printed.",
  );
} catch {
  console.error(
    "Usage: npm run render:env -- --frontend-origin=https://YOUR-PROJECT.pages.dev (after Neon setup)",
  );
  process.exitCode = 1;
}
