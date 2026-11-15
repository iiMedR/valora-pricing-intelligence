import { spawnSync } from "node:child_process";
import { root } from "./neon-env.mjs";
function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(
  process.execPath,
  ["node_modules/@angular/cli/bin/ng.js", "build"],
  root + "frontend",
);
if (process.platform === "win32")
  run(
    "cmd.exe",
    ["/d", "/c", "mvnw.cmd -DskipTests package"],
    root + "backend",
  );
else run("./mvnw", ["-DskipTests", "package"], root + "backend");
