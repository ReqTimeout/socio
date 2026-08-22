// Offline schema push helper.
// drizzle-kit 0.28 loads the TS schema via CJS require, which cannot resolve the
// `.js` import specifiers the schema uses (`./users.js` -> ./users.ts). This script
// bundles the schema with esbuild (remapping `.js` -> `.ts` and keeping node_module
// imports external), then writes a temp drizzle config that points at the bundle.
// Usage: node push-local.mjs   (then run drizzle-kit push --config <tmp config>)

import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = "/Users/maabook/Desktop/socio.id";
const PKG = path.join(ROOT, "packages/db");
const SCHEMA_DIR = path.join(PKG, "src/schema");
const OUT = "/tmp/socio-schema";

// Resolve esbuild from the pnpm store (nested under Vite's deps).
const esbuildPath = path.join(
  ROOT,
  "node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild/lib/main.js",
);
const esbuild = await import(esbuildPath);

const tsRemap = {
  name: "ts-remap",
  setup(build) {
    build.onResolve({ filter: /\.js$/ }, (args) => {
      if (args.kind === "entry-point") return;
      if (!args.path.startsWith(".")) return; // only relative schema imports
      const tsPath = path.resolve(
        args.resolveDir,
        args.path.replace(/\.js$/, ".ts"),
      );
      return { path: tsPath };
    });
  },
};

console.log("[push-local] bundling schema with esbuild...");
await esbuild.build({
  entryPoints: [path.join(SCHEMA_DIR, "index.ts")],
  bundle: true,
  outfile: path.join(OUT, "schema.bundle.js"),
  format: "cjs",
  platform: "node",
  packages: "external",
  plugins: [tsRemap],
  logLevel: "info",
});

const cfg = `const { defineConfig } = require('drizzle-kit');
module.exports = defineConfig({
  schema: '${OUT}/schema.bundle.js',
  out: '${PKG}/drizzle',
  dialect: 'mysql',
  dbCredentials: { url: process.env.SOCIO_DB_URL },
  verbose: true,
  strict: true,
});
`;
const fs = await import("node:fs");
fs.writeFileSync(path.join(OUT, "drizzle.local.config.js"), cfg);
console.log("[push-local] wrote temp config ->", path.join(OUT, "drizzle.local.config.js"));
