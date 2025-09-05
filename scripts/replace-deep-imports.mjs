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
    } else if (entry.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

const packagesDir = "packages";
let replaced = 0;

try {
  const files = await findTsFiles(packagesDir);
  
  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    let changed = false;
    
    // Replace deep imports with barrel imports
    const deepImportRegex = /from\s+["']@glyph\/([^"']+)\/src\/([^"']+)["']/g;
    const newContent = content.replace(deepImportRegex, (match, pkg, path) => {
      changed = true;
      return `from "@glyph/${pkg}"`;
    });
    
    if (changed) {
      fs.writeFileSync(file, newContent);
      console.log(`Fixed: ${file}`);
      replaced++;
    }
  }
  
  console.log(`\nReplaced deep imports in ${replaced} files`);
} catch (error) {
  console.error("Error:", error.message);
}
