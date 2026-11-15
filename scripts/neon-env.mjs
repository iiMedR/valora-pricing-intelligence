import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
export const root = fileURLToPath(new URL("../", import.meta.url));
export function loadNeonEnv() {
  const file = existsSync(root + ".env") ? ".env" : ".env.local";
  if (existsSync(root + file)) loadEnvFile(root + file);
  if (existsSync(root + ".env.neon.local"))
    loadEnvFile(root + ".env.neon.local");
}
export function appEnvironment() {
  loadNeonEnv();
  if (!process.env.NEON_APP_DATABASE_URL)
    throw new Error(
      "Run npm run neon:setup first. The admin DATABASE_URL is never used as the demo application role.",
    );
  const url = new URL(process.env.NEON_APP_DATABASE_URL);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    decodeURIComponent(url.username) !== "smartpricing_demo" ||
    url.pathname !== "/smartpricing_demo" ||
    !url.hostname.endsWith(".neon.tech")
  )
    throw new Error(
      "A dedicated Neon smartpricing_demo database and role are required.",
    );
  const params = new URLSearchParams(url.search);
  params.delete("channel_binding");
  params.set("sslmode", "verify-full");
  params.set("connectTimeout", "30");
  params.set("sslfactory", "org.postgresql.ssl.DefaultJavaSSLFactory");
  return {
    ...process.env,
    SPRING_PROFILES_ACTIVE: "demo,portfolio,neon",
    NEON_JDBC_URL: `jdbc:postgresql://${url.host}${url.pathname}?${params}`,
    NEON_DB_PASSWORD: decodeURIComponent(url.password),
  };
}
