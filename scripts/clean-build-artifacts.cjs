const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const targets = ["dist", path.join("frontend", "dist")];

for (const relativeTarget of targets) {
  const absoluteTarget = path.join(repoRoot, relativeTarget);
  fs.rmSync(absoluteTarget, { force: true, recursive: true });
  console.log(`Removed ${relativeTarget}`);
}
