import fs from "node:fs";
import { glob } from "glob";

const files = await glob("packages/**/src/**/*.ts");
for (const f of files) { 
  const t = fs.readFileSync(f, "utf8"); 
  if (/export\s+\*/.test(t)) console.log("STAR:", f); 
}
