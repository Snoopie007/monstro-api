import { expect, test } from "bun:test";
import { Glob } from "bun";
import path from "node:path";

const src = path.resolve(import.meta.dir, "../..");
const routeFolder = path.join(src, "routes/x/loc/addonsBundles");
const specifiers = /(?:from|import\(|mock\.module\(|require\()\s*["']([^"']+)["']/g;

function resolveSpecifier(file: string, specifier: string) {
  if (specifier.startsWith("@/")) return path.join(src, specifier.slice(2));

  if (specifier.startsWith(".")) return path.resolve(path.dirname(file), specifier);

  return null;
}

// The bundle purchase lifecycle lives in src/handlers. Webhooks and other
// handlers depend on it there, never on the add-ons & bundles HTTP routes.
test("webhooks and handlers do not import the add-ons & bundles route folder", async () => {
  const offenders: string[] = [];

  for (const directory of ["routes/webhooks", "handlers"]) {
    for await (const relativeFile of new Glob("**/*.{ts,tsx}").scan(path.join(src, directory))) {
      const file = path.join(src, directory, relativeFile);
      const source = await Bun.file(file).text();

      for (const [, specifier = ""] of source.matchAll(specifiers)) {
        const target = resolveSpecifier(file, specifier);

        if (target === routeFolder || target?.startsWith(routeFolder + path.sep)) {
          offenders.push(`${path.relative(src, file)} imports ${specifier}`);
        }
      }
    }
  }

  expect(offenders).toEqual([]);
});
