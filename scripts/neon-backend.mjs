import { spawn } from "node:child_process";
import { copyFileSync, mkdtempSync, rmdirSync, unlinkSync } from "node:fs";
import { appEnvironment, root } from "./neon-env.mjs";
try {
  const env = appEnvironment();
  const seed = process.argv.includes("--seed");
  // Windows locks a running JAR. Keep Maven's output free for subsequent builds.
  const runtimeDirectory = mkdtempSync(root + "backend/target/neon-runtime-");
  const runtimeJar = runtimeDirectory + "/app.jar";
  copyFileSync(
    root + "backend/target/smartpricing-0.0.1-SNAPSHOT.jar",
    runtimeJar,
  );
  const cleanup = () => {
    try {
      unlinkSync(runtimeJar);
      rmdirSync(runtimeDirectory);
    } catch {
      /* A stopped runtime can be removed by Maven clean. */
    }
  };
  const args = ["-Xmx384m", "-jar", runtimeJar];
  if (seed)
    args.push("--spring.main.web-application-type=none", "--demo.action=seed");
  const child = spawn("java", args, { cwd: root, env, stdio: "inherit" });
  child.on("error", () => {
    cleanup();
    console.error(
      "Java 21 could not start. Install JDK 21 and run npm run build.",
    );
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    cleanup();
    process.exitCode = code ?? 1;
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
} catch {
  console.error(
    "Neon app configuration is missing or invalid. Run npm run neon:setup after neon deploy.",
  );
  process.exitCode = 1;
}
