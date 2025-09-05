import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const pkgs = fs.readdirSync(path.join(ROOT, "packages")).filter(d =>
  fs.existsSync(path.join(ROOT, "packages", d, "package.json"))
);

const glyphPkgs = new Set(pkgs.map(n => `@glyph/${n}`));

for (const name of pkgs) {
  const pjPath = path.join(ROOT, "packages", name, "package.json");
  const pj = JSON.parse(fs.readFileSync(pjPath, "utf8"));

  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    if (!pj[field]) continue;
    for (const dep of Object.keys(pj[field])) {
      if (glyphPkgs.has(dep)) pj[field][dep] = "workspace:*";
    }
  }
  fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2) + "\n");
  console.log("pinned:", pj.name);
}
