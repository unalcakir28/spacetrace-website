---
name: preflight
description: Runs everything the Pages workflow runs, in its order. Use before any push to main — a push here deploys straight to the live site — after finishing a change and before committing it, after touching a locale dictionary, the language redirector or releases.ts, and whenever someone asks whether the site will still build — including Turkish phrasings like "push etmeden önce kontrol et", "site bozuldu mu", "CI geçer mi".
---

# Preflight — spacetrace-website

A push goes straight to production: `pages.yml` builds on every push to
`main`, uploads to GitHub Pages, and the site is served from
`spacetrace.teknobakkall.com`. Anything that breaks here shows up **live**,
not in CI.

The steps below are in the workflow's own order. **Do not break the
order** — especially `build`, because the last two steps look at `dist/`,
not at the source.

## 1. Install

```bash
yarn install --frozen-lockfile
```

Node 22. Pinned nowhere (no `.nvmrc`, no `engines`, no `packageManager`);
the single source is `pages.yml`. If you are running a different version, a
green result here does not represent CI.

## 2. Type check

```bash
yarn typecheck
```

**Do not type `yarn check`.** yarn 1.x's own builtin command shadows the
script, silently says "Folder in sync" and the type check never runs. That
is exactly why the script is named `typecheck`.

This step holds two things at once:

- **The dictionaries are typed against English.** `src/i18n/ui/en.ts` is
  the source, the other four languages conform to it through the
  `Dictionary` type. A key added to one language and forgotten in the
  others is a compile error here — not a blank on the live page.
- **The changelog texts too.** The `const source: Source = raw` in
  `src/data/changelog.ts` is the check itself: if German is missing from an
  entry, this is where it breaks.

## 3. Build

```bash
yarn build
```

**Not skippable, and the reason is the next two steps.** `verify` and
`verify:changelog` look at the built `dist/`; a green result you get
without running `build` has verified the **old site**. A local `dist/` can
silently stay stale for weeks.

## 4. Language redirector

```bash
yarn verify
```

`scripts/verify-lang.mjs` extracts the redirector from `dist/` and runs it
in a fake browser, 21 cases.

This step exists for a reason: the feature once **shipped to production
inert**. In Astro, wrapping an inline script body as a JSX child prints the
wrapper into the HTML as-is and the code turns into a string that is
evaluated and discarded — the build is green, the script is on the page,
`window.location.replace` **appears** in the text, and nothing happens. A
check that looks at "is there a script" would have approved it. The only
check with teeth is running the script.

If you changed the redirector's behaviour, update the cases in
`verify-lang.mjs` along with it.

## 5. Changelog texts

```bash
yarn verify:changelog
```

Verifies **against the built HTML**. Its first version compared raw text
against raw HTML and missed all of French: the apostrophe lands on the page
as `&#39;`.

## 6. Discoverability metadata

```bash
yarn verify:seo
```

Also **against the built output**. Every check in it is for something that
fails without a symptom: a dropped `og:image` turns a share back into a bare
link while the page looks identical, a relative one is ignored rather than
rejected, a JSON-LD typo is skipped rather than reported, and a renamed route
leaves `llms.txt` handing a 404 to exactly the crawlers it exists to serve.

## 7. Changelog freshness, if needed

```bash
yarn sync:changelog
```

The source is not this repo — `src/data/changelog.json` is a copy of
`crates/changelog/changelog.json` in core. **Do not fix the text here, fix
it in core.** The workflow does this itself on every push and every six
hours, so running it by hand is only necessary if you want to see a core
change immediately.

## 8. Download contract, if a release is near

Not a command. The tag and asset names in `src/data/releases.ts` must be
**exactly** the same as what the three release workflows in core produce.
**No single CI step catches this** — two separate repos. If a name changed
in core, update this repo the same day, or every download link silently
breaks.

## Report

State the result of each step plainly, and paste the output of anything
red. A skipped step is reported as skipped, not as passed. Finish with a
one-line verdict: is the push safe, and if not, what is blocking it.
