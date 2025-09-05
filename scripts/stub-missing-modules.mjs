import fs from "node:fs";
import path from "node:path";

// Create stubs directory
const stubsDir = "__stubs__";
if (!fs.existsSync(stubsDir)) {
  fs.mkdirSync(stubsDir, { recursive: true });
}

// List of missing modules to stub
const missingModules = [
  "apps/viewer/src/components/tgo/TGOApp",
  "apps/viewer/src/state/tgoStore", 
  "apps/viewer/src/lib/tgo/planner",
  "apps/viewer/src/lib/glyphTorus",
  "apps/viewer/src/scene/focusAddr",
  "apps/viewer/src/lib/tgo/scheduler",
  "packages/viewer/src/app/overlay/bindPinned",
  "packages/viewer/src/overlay/HeatOverlay"
];

// Create stub files
for (const modulePath of missingModules) {
  const stubPath = path.join(stubsDir, modulePath + ".ts");
  const stubDir = path.dirname(stubPath);
  
  if (!fs.existsSync(stubDir)) {
    fs.mkdirSync(stubDir, { recursive: true });
  }
  
  const moduleName = path.basename(modulePath);
  const stubContent = `// Stub for ${modulePath}
export const ${moduleName} = () => {
  throw new Error("Stub implementation - replace with real module");
};

export default ${moduleName};
`;

  fs.writeFileSync(stubPath, stubContent);
  console.log(`Created stub: ${stubPath}`);
}

console.log(`\nCreated ${missingModules.length} stub files in ${stubsDir}/`);
console.log("Add this to your tsconfig paths if needed:");
console.log('"@/*": ["__stubs__/*", "src/*"]');
