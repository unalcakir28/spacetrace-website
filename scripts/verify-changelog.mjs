// The changelog page must never show unreleased work.
//
// Those entries describe code that is on the core repo's `main` and in nobody's
// download. Listing them here tells a reader about a change they cannot get,
// on the one page whose whole job is saying what each version contains.
//
// This checks the *built* HTML rather than the template, for the reason
// verify-lang.mjs exists: a check that reads the source can pass while the
// shipped page does something else. The entry text is the needle, so the guard
// keeps working if the markup around it is rewritten.
//
// It is deliberately quiet when there is nothing unreleased — that is a real
// state right after a release, not a failure — but it says so, because a guard
// that silently checks nothing is worth knowing about.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALE_PATHS = ["changelog", "tr/changelog", "it/changelog", "fr/changelog", "de/changelog"];

const source = JSON.parse(readFileSync(join(root, "src/data/changelog.json"), "utf8"));

/** Every unreleased entry, as {component, locale, text}. */
const pending = [];
for (const [component, log] of Object.entries(source.components)) {
  for (const entry of log.unreleased ?? []) {
    for (const [locale, text] of Object.entries(entry.text)) {
      pending.push({ component, locale, text });
    }
  }
}

if (pending.length === 0) {
  console.log("verify-changelog: nothing is unreleased, so there is nothing to leak.");
  process.exit(0);
}

/**
 * Page HTML reduced to the words a reader sees.
 *
 * Both sides have to be normalised the same way or the guard develops blind
 * spots in exactly the wrong places. The first version compared raw entry text
 * against raw HTML and so missed every French entry and most Turkish ones: an
 * apostrophe reaches the page as `&#39;`, and those two languages use more of
 * them than the other three combined.
 */
function readable(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // Last, or it would turn `&amp;#39;` into an apostrophe that was never there.
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const problems = [];
for (const path of LOCALE_PATHS) {
  const file = join(root, "dist", path, "index.html");
  if (!existsSync(file)) {
    problems.push(`${path}/index.html was not built`);
    continue;
  }
  const page = readable(readFileSync(file, "utf8"));
  for (const { component, locale, text } of pending) {
    // A distinctive opening slice rather than the whole string: backticks
    // become <code> tags, so the words survive tag-stripping but the entry as
    // written does not. Words rather than characters, so the slice never ends
    // mid-word.
    const needle = text.replace(/`/g, "").replace(/\s+/g, " ").split(" ").slice(0, 8).join(" ");
    if (needle.length > 20 && page.includes(needle)) {
      problems.push(
        `${path}: unreleased ${component} entry (${locale}) is on the page — "${needle}…"`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error("verify-changelog failed:\n  " + problems.join("\n  "));
  process.exit(1);
}

console.log(
  `verify-changelog: ${pending.length} unreleased entry text(s) checked against ` +
    `${LOCALE_PATHS.length} pages, none published.`,
);
