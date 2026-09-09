/**
 * Refresh `src/data/changelog.json` from the core repo.
 *
 * The changelog is written once, in `unalcakir28/spacetrace`, and compiled into
 * the CLI, the desktop app and the hub from there. The site keeps a copy rather
 * than fetching at build time, for the same reason the download links are real
 * URLs in the markup: a build that needs the network to produce a page is a
 * build that can produce a worse page.
 *
 * So the copy can go stale, and nothing here can stop that — only a release in
 * the core repo triggering a rebuild here can, which is not wired up yet. Run
 * this before publishing anything that mentions a new version.
 *
 *   yarn sync:changelog
 */
import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SOURCE =
  "https://raw.githubusercontent.com/unalcakir28/spacetrace/main/crates/changelog/changelog.json";
const TARGET = fileURLToPath(new URL("../src/data/changelog.json", import.meta.url));

const response = await fetch(SOURCE);
if (!response.ok) {
  console.error(`error: ${SOURCE} answered ${response.status}`);
  process.exit(1);
}

const text = await response.text();

// Parse before writing. A proxy or a captive portal answers 200 with HTML, and
// writing that over the changelog would break the build in a way that looks
// like a TypeScript problem rather than a network one.
let parsed;
try {
  parsed = JSON.parse(text);
} catch (error) {
  console.error(`error: ${SOURCE} did not return JSON (${error.message})`);
  process.exit(1);
}
if (parsed.schema !== 1) {
  console.error(`error: changelog schema ${parsed.schema}, this site understands 1`);
  process.exit(1);
}

const previous = await readFile(TARGET, "utf8").catch(() => "");
if (previous === text) {
  console.log("changelog.json is already current");
  process.exit(0);
}

await writeFile(TARGET, text);
console.log(`changelog.json updated from ${SOURCE}`);
console.log("run `yarn typecheck` — a new locale or field shows up there first");
