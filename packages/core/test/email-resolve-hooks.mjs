/**
 * Resolver hooks untuk selftest email-guard (lihat register.mjs).
 *
 * File app ditulis untuk SvelteKit/Vite: import pakai alias `$app/*` serta
 * ekstensi `.js` untuk file TypeScript (gaya NodeNext). Node polos tak
 * memahami itu, jadi hooks ini menerjemahkannya:
 *
 *  - `$app/environment`  → `test/stubs/app-environment.ts`
 *  - `./render.js`       → `./render.ts`
 *  - `../tokens`         → `../tokens.ts`
 *
 * `@socio/db` TIDAK distub — modul db .id lazy (Proxy), import aman tanpa DB.
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HOOK_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Kandidat path nyata untuk sebuah base (dengan/.tanpa ekstensi). */
function realFile(base) {
  const cands = base.endsWith(".js")
    ? [base.slice(0, -3) + ".ts", base]
    : [base + ".ts", base + ".js", path.join(base, "index.ts"), path.join(base, "index.js")];
  for (const c of cands) {
    try {
      if (existsSync(c) && statSync(c).isFile()) return c;
    } catch {
      /* abaikan */
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "$app/environment") {
    return nextResolve(pathToFileURL(path.join(HOOK_DIR, "stubs", "app-environment.ts")).href, context);
  }

  // Import relatif: .js → .ts, tanpa ekstensi → .ts
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const hit = realFile(path.resolve(parentDir, specifier));
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
  }

  return nextResolve(specifier, context);
}
