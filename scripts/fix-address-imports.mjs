import fs from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

async function findTsFiles(dir) {
  const files = [];
  const entries = await readdir(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      files.push(...await findTsFiles(fullPath));
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

const packagesDir = "packages";
const appsDir = "apps";
let fixed = 0;

try {
  const files = [...await findTsFiles(packagesDir), ...await findTsFiles(appsDir)];

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    let changed = false;

    // Fix Address value imports to type-only (only for pure type imports)
    const addressValueRegex = /import\s*{\s*([^}]*Address[^}]*)\s*}\s*from\s*["']@glyph\/glyph-drive["']/g;
    const newContent1 = content.replace(addressValueRegex, (match, imports) => {
      if (imports.includes('type')) return match; // already type-only
      // Only convert if it's ONLY Address type imports
      if (imports.trim() === 'Address' || imports.trim() === 'type Address') {
        changed = true;
        return `import type { Address } from "@glyph/glyph-drive"`;
      }
      return match; // keep value imports for functions
    });

    // Fix @glyph/glyph-drive/index to @glyph/glyph-drive
    const indexRegex = /from\s+["']@glyph\/glyph-drive\/index["']/g;
    const newContent2 = newContent1.replace(indexRegex, (match) => {
      changed = true;
      return 'from "@glyph/glyph-drive"';
    });

    if (changed) {
      fs.writeFileSync(file, newContent2);
      console.log(`Fixed: ${file}`);
      fixed++;
    }
  }
  console.log(`\nFixed address imports in ${fixed} files`);
} catch (error) {
  console.error("Error:", error.message);
}
