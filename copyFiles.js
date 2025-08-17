import { readdir, ensureDir, stat as _stat, copy } from "fs-extra";
import { join } from "path";

const sourceDir = process.argv[2];
const destDir = process.argv[3];

async function copyDirectory(src, dest) {
  const files = await readdir(src);
  await ensureDir(dest);

  for (const file of files) {
    const srcFile = join(src, file);
    const destFile = join(dest, file);

    const stat = await _stat(srcFile);

    if (stat.isDirectory()) {
      await copyDirectory(srcFile, destFile);
    }
    else if (
      !file.endsWith(".scss") &&
      !file.endsWith(".ts") &&
      !file.endsWith(".html")
    ) {
      await copy(srcFile, destFile);
    }
  }
}

copyDirectory(sourceDir, destDir)
  .then(() => console.log("Successfully copied files"))
  .catch(err => console.error("Couldn't copy files:", err));
