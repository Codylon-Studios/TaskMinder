const fs = require("fs-extra");
const path = require("path");

const sourceDir = process.argv[2];
const destDir = process.argv[3];

async function copyDirectory(src, dest) {
  const files = await fs.readdir(src);
  await fs.ensureDir(dest);

  for (const file of files) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);

    const stat = await fs.stat(srcFile);

    if (stat.isDirectory()) {
      await copyDirectory(srcFile, destFile);
    }
    else if (!file.endsWith(".scss") && !file.endsWith(".ts") && !file.endsWith(".html")) {
      await fs.copy(srcFile, destFile);
    }
  }
}

copyDirectory(sourceDir, destDir)
  .then(() => console.log("Successfully copied files"))
  .catch(err => console.error("Couldn't copy files:", err));
