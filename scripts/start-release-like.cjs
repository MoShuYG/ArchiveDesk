const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const serverEntry = path.join(repoRoot, "dist", "src", "server.js");
const frontendIndex = path.join(repoRoot, "frontend", "dist", "index.html");

if (!fs.existsSync(serverEntry)) {
  console.error("Missing build output: dist/src/server.js");
  process.exit(1);
}

if (!fs.existsSync(frontendIndex)) {
  console.error("Missing build output: frontend/dist/index.html");
  process.exit(1);
}

const child = spawn(process.execPath, [serverEntry], {
  cwd: repoRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    REQUIRE_HTTPS: process.env.REQUIRE_HTTPS ?? "false"
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
