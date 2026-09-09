/**
 * Refresh `src/data/changelog.json` from the core repo.
 *
 * The changelog is written once, in `unalcakir28/spacetrace`, and compiled into
 * the CLI, the desktop app and the hub from there. The site keeps a copy rather
 * than fetching at build time, for the same reason the download links are real
 * URLs in the markup: a build that needs the network to produce a page is a
 * build that can produce a worse page.
 *
 * `.github/workflows/sync-changelog.yml` runs this on a schedule and commits
 * the result, so **everything below is validated before it is written**. An
 * automated commit that could push a malformed file past `yarn typecheck` — by
 * being valid TypeScript and wrong content — is worse than a stale copy, so a
 * file that fails any check here is refused and the existing copy is left
 * alone.
 *
 *   yarn sync:changelog
 */
import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SOURCE =
  "https://raw.githubusercontent.com/unalcakir28/spacetrace/main/crates/changelog/changelog.json";
const TARGET = fileURLToPath(new URL("../src/data/changelog.json", import.meta.url));

const LOCALES = ["en", "tr", "it", "fr", "de"];
const KINDS = ["added", "changed", "performance", "fixed", "removed", "security"];
const COMPONENTS = ["cli", "desktop", "hub"];

/** Every problem with a candidate file, as readable lines. */
function problems(data) {
  const found = [];
  if (data?.schema !== 1) {
    found.push(`schema is ${JSON.stringify(data?.schema)}, this site understands 1`);
    return found;
  }

  for (const component of COMPONENTS) {
    const log = data.components?.[component];
    if (!log) {
      found.push(`no ${component} component`);
      continue;
    }
    if (!Array.isArray(log.releases)) {
      found.push(`${component}.releases is not a list`);
      continue;
    }

    const check = (entries, where) => {
      if (!Array.isArray(entries)) {
        found.push(`${where} is not a list`);
        return;
      }
      entries.forEach((entry, index) => {
        const at = `${where}[${index}]`;
        if (!KINDS.includes(entry?.kind)) {
          found.push(`${at}: unknown kind ${JSON.stringify(entry?.kind)}`);
        }
        for (const locale of LOCALES) {
          const text = entry?.text?.[locale];
          // The same guarantee `Record<Locale, string>` gives the committed
          // copy, applied to one that arrives over the network.
          if (typeof text !== "string" || text.trim() === "") {
            found.push(`${at}: missing or empty ${locale}`);
          }
        }
      });
    };

    check(log.unreleased ?? [], `${component}.unreleased`);
    log.releases.forEach((release, index) => {
      const at = `${component}.releases[${index}]`;
      if (!/^\d+\.\d+\.\d+$/.test(release?.version ?? "")) {
        found.push(`${at}: version ${JSON.stringify(release?.version)}`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(release?.date ?? "")) {
        found.push(`${at}: date ${JSON.stringify(release?.date)}`);
      }
      check(release?.entries ?? [], `${at}.entries`);
    });
  }
  return found;
}

const response = await fetch(SOURCE).catch((error) => {
  console.error(`error: could not reach the core repo (${error.message})`);
  process.exit(1);
});
if (!response.ok) {
  console.error(`error: ${SOURCE} answered ${response.status}`);
  process.exit(1);
}

const text = await response.text();

// Parsed before anything else: a proxy or a captive portal answers 200 with
// HTML, and writing that over the changelog breaks the build in a way that
// looks like a TypeScript problem rather than a network one.
let parsed;
try {
  parsed = JSON.parse(text);
} catch (error) {
  console.error(`error: ${SOURCE} did not return JSON (${error.message})`);
  process.exit(1);
}

const found = problems(parsed);
if (found.length > 0) {
  console.error("error: the fetched changelog is not usable, keeping the current copy:");
  for (const problem of found.slice(0, 20)) console.error(`  ${problem}`);
  if (found.length > 20) console.error(`  … and ${found.length - 20} more`);
  process.exit(1);
}

const previous = await readFile(TARGET, "utf8").catch(() => "");
if (previous === text) {
  console.log("changelog.json is already current");
  process.exit(0);
}

await writeFile(TARGET, text);
console.log(`changelog.json updated from ${SOURCE}`);
