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

function getRelativePath(fromFile, toPath) {
  const fromDir = path.dirname(fromFile);
  const toDir = path.dirname(toPath);
  const toFile = path.basename(toPath, path.extname(toPath));
  
  let relative = path.relative(fromDir, toDir);
  if (relative === '') relative = '.';
  if (!relative.startsWith('.')) relative = './' + relative;
  
  return path.join(relative, toFile).replace(/\\/g, '/');
}

const packagesDir = "packages";
const appsDir = "apps";
let fixed = 0;

try {
  const files = [...await findTsFiles(packagesDir), ...await findTsFiles(appsDir)];

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    let changed = false;

    // Find @/ imports and convert to relative paths
    const aliasRegex = /from\s+["']@\/([^"']+)["']/g;
    const newContent = content.replace(aliasRegex, (match, importPath) => {
      // Try to find the target file
      const possiblePaths = [
        path.join(path.dirname(file), 'src', importPath + '.ts'),
        path.join(path.dirname(file), 'src', importPath + '.tsx'),
        path.join(path.dirname(file), importPath + '.ts'),
        path.join(path.dirname(file), importPath + '.tsx'),
      ];

      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          const relative = getRelativePath(file, possiblePath);
          changed = true;
          return `from "${relative}"`;
        }
      }

      // If not found, try common patterns
      if (importPath.includes('components/')) {
        const relative = getRelativePath(file, path.join('src', importPath));
        changed = true;
        return `from "${relative}"`;
      }
      if (importPath.includes('lib/')) {
        const relative = getRelativePath(file, path.join('src', importPath));
        changed = true;
        return `from "${relative}"`;
      }
      if (importPath.includes('state/')) {
        const relative = getRelativePath(file, path.join('src', importPath));
        changed = true;
        return `from "${relative}"`;
      }

      return match; // keep original if can't resolve
    });

    if (changed) {
      fs.writeFileSync(file, newContent);
      console.log(`alias→relative: ${file}`);
      fixed++;
    }
  }
  console.log(`\nConverted @/ aliases to relative paths in ${fixed} files`);
} catch (error) {
  console.error("Error:", error.message);
}
