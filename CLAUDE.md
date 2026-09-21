# spacetrace site — Claude Code notes

This repo only marketing site. Product, release pipeline, download contract live in [core repo](https://github.com/unalcakir28/spacetrace); `docs/RELEASING.md` there describe channel and asset name.

**Download contract defined there, not here.** Tag and file name in `src/data/releases.ts` must match string three core release workflow make, exact. Rename break every download link silent.

## Commands

```bash
yarn install --frozen-lockfile   # how CI installs
yarn dev                         # astro dev
yarn typecheck                   # astro check — runs BEFORE build
yarn build                       # astro build → dist/
yarn preview                     # serve the built dist/
yarn verify                      # extracts the redirector from dist/, runs it
yarn verify:changelog            # changelog texts against the built HTML
yarn sync:changelog              # refreshes the changelog.json copy from core
```

**Node 22, pinned nowhere.** No `.nvmrc`, no `engines`, no `packageManager`. Single source be `node-version: 22` in `pages.yml`. Other version local diverge from CI, say nothing.

**No test runner, no linter.** No vitest/jest/playwright, no ESLint, no Prettier. `scripts/verify-lang.mjs` and `scripts/verify-changelog.mjs` be whole test suite; `astro check` be whole lint. Write new verification as third `.mjs`, not test framework — both existing one run against built `dist/`, only way they catch bug class below.

**Do not type `yarn check`.** It be yarn 1.x builtin and shadow the script: it print "Folder in sync" and type-check nothing. That why script named `typecheck`, and why `no-yarn-check` hook refuse bare command.

## What this is

Astro 7. Five language (en, tr, it, fr, de) and **36 static pages** (7 route × 5 language under `src/pages/`, plus `404`). `pages.yml` build it, upload to GitHub Pages, served from `spacetrace.teknobakkall.com`.

Layer: `src/pages/[lang]/*.astro` be thin wrapper that only set up `getStaticPaths` and call view. Content be seven file in `src/views/`; single layout be `src/layouts/Base.astro`. **No Tailwind** — one hand-written `src/styles/global.css` (16 KB, typography and layout system redesigned in `6c2449a`) plus `src/components/demo/treemap.css` for React island. No content collection; data be plain TS/JSON in `src/data/`. `trailingSlash: "always"`.

What break easy:

- **Dictionary typed against English.** `src/i18n/ui/en.ts` be source; other four conform through `Dictionary` type. Key added to one language and forgotten elsewhere be `yarn typecheck` error, not blank on live page. That why workflow type-check before build.
- **Download contract be one file:** `src/data/releases.ts`.
- **Static download link name real version tag and must move with it.** `CHANNELS[…].fallback` hold `v0.8.0`, `desktop-v0.7.0`, `hub-v0.5.0` — these be `href` baked into markup. They used to point at rolling `…-continuous` tag, which never go stale because republished every push; those tag removed 19 September 2026. Bump fallback in same commit as release, or every download button 404 for anyone whose JavaScript not run.
- **Download page that work with JS off be mandatory.** Markup link real file; `src/scripts/releases.ts` only layer version, date, size on top and upgrade link to newest stable release. Every step guarded, error swallowed.
- **Interactive treemap be only React island** (`src/components/demo/`). Drawn with reasonable geometry on server too, so it look filled without JS.
- **`base: "/"`** — every internal link go through `localeUrl()`. Hand-written path work in `astro dev` and 404 in production. That indirection let site leave core repo for own domain in one line.
- **`public/CNAME` carry domain.** Delete it and Pages fall back to default address; certificate drop with it.

`@astrojs/sitemap` run with `i18n` config; output be `dist/sitemap-index.xml` (35 URL, 404 excluded). **`robots.txt` not in repo** — absence be SEO work not done, not decision. Rest of SEO and AI-discoverability work, with measurement, sit in core repo `TODO.md` under "Post-launch — SEO and AISEO".

## Claude tooling kept in the repo

| Tool | When |
| ---- | ---- |
| `preflight` (skill) | Before a push; a push goes straight to production |
| `web-design-guidelines` (skill) | UI review; vendored from `vercel-labs/agent-skills` (`23cb294`) |
| `no-yarn-check` (hook) | Refuses the bare `yarn check` |

`preflight` **trigger on own**; push here deploy, so that where it worth most.

Until 16 September 2026 vendored skill sat under `.agents/skills/` and never load — Claude Code read `.claude/skills/`. Dangling symlink to it in core repo deleted same time. One real copy, here.

From shared `spacetrace-tools` plugin (install it, and full list, sit in workspace note and plugin README), the one that matter here be **`download-contract`**: it compare tag and asset name in `src/data/releases.ts` against what core release workflow make. **This repo be other end of that contract and no CI see both end**, so plugin be only check either side get — skill compare them, and `download-contract-drift` Stop hook ask when session move `releases.ts` and leave producing end alone.

**That hook read `git status`, so it blind to release cut in earlier session** — tree clean, hook silent. `release-landed-guard` SessionStart hook cover that side: it ask GitHub what be published and compare against `CHANNELS[…].fallback` here and against last successful `pages.yml` run. It catch exact thing that got missed — `desktop-v0.8.0` out 19 September 15:04 UTC, last site build 10:49 same day, page offer 0.7.0 for two day. `release-landed` skill be manual form of same four check. Also `doc-drift-auditor`, `workspace-audit`, `code-reviewer`. Plugin private and this repo public, so it named not linked.

### Automatic language detection

Pages static, so nothing read `Accept-Language` on server. Detection be inline script in `src/components/LangRedirect.astro`, at very top of `<head>` — before stylesheet and font, so no request spent on page about to be abandoned.

Four rule, each one there to keep feature from work against reader:

1. **Run only on unprefixed (English) page.** Address that name language, like `/tr/hub/`, be deliberate choice or shared link.
2. **Explicit choice win permanently.** Switcher, "English" in notice bar, or dismiss bar write `spacetrace.lang` into `localStorage`; script never run again.
3. **English ahead of other four in browser preference list mean nothing happen.** Order read: `["en-GB","tr"]` stay, `["tr-TR","en-US"]` go Turkish. Unsupported language stay on English — the `x-default` in `hreflang`.
4. **Every error leave page where it is.** `localStorage` throw in private tab; `navigator.languages` may not exist.

After redirect, target page show notice bar once (`LangNotice.astro`): one sentence in that language, and **English** as way out. Being moved without being told be part people dislike; way back must be one click and word they can read. Bar one-shot through `sessionStorage` flag, deleted as read. Detection off on `404` (`detectLanguage={false}`) — its path not translated route.

#### Verification is mandatory, and against the built output

`yarn verify` (`scripts/verify-lang.mjs`) extract redirector from `dist/` and run it in fake browser, measure where reader land in 21 case. Run after `yarn build` in Pages workflow.

**Local `dist/` can be stale.** `verify` and `verify:changelog` read built output, not source. Green without fresh `yarn build` mean you verified old site.

Step exist because feature once **shipped to production inert**. In Astro, wrap inline script body as JSX child with `` {`…`} `` print wrapper into HTML: code become string, evaluated in block, discarded. Build green, script on page, `window.location.replace` appear inside it, nothing happen. Any check for "is there a script" or "does it contain this expression" would pass it. Run it — only check with teeth.

Second trap: `define:vars` and `set:html` cannot combine — `define:vars` win and body vanish. So one mechanism: whole script, value included, assembled as string in frontmatter and handed over with `set:html`.

Change behaviour, change case in `verify-lang.mjs` with it.

## Changelog page

`/changelog/` in five language and **source not this repo**: `src/data/changelog.json` be copy of `crates/changelog/changelog.json` in core. Same file compiled into CLI, desktop app, hub, so page and app "What's new" cannot diverge. Fix text in core, not here.

```bash
yarn sync:changelog    # refreshes the copy
```

**Refresh run inside Pages workflow**, on every push to `main` and on `workflow_dispatch`: download, verify, commit if anything changed, build, publish.

**No `schedule:` — 19 September 2026.** It used to rebuild every six hour to carry core release across on own: four build a day for thing that happen few time a month, still up to six hour stale exactly when it matter. **Rule that replace it be manual: release not finish until site rebuilt.** Step in each repo `release` skill. By hand: `gh workflow run pages.yml`. If nobody do it, site keep describe previous version and nothing warn anyone.

Separate "sync" workflow tried and **not work**: it commit, but Pages never run, because push made with `GITHUB_TOKEN` deliberately not trigger other workflow. One workflow, one deployment path — do not split it.

Download step not fatal. Committed copy be valid page, and network error or corrupt upstream file must not take deployment down.

**`unreleased` never rendered.** Those entry describe code sitting on core `main` that be in nobody download. Same rule hold in desktop app "What's new" panel and hub About card. They stay in data layer so `missingLocales()` catch missing translation before release cut.

`yarn verify:changelog` check this **against built HTML** and run in Pages workflow. First version compared raw text to raw HTML and missed all French: apostrophe land on page as `&#39;`. Measured by mutation — put block back, caught 15 of 15 text there were that day (20 locale string now; measurement not repeated).

`const source: Source = raw` in `src/data/changelog.ts` **be the check**: `text` be `Record<Locale, string>`, so missing German entry break `yarn typecheck` — data-side counterpart of type dictionary against English. Verified by deleting one, not assumed. `kind` cannot be checked there, because JSON import widen string literal, so `toKind` throw at build time.

`` `backtick` `` span inside entry text render as `<code translate="no">`: command and flag same in all five language, and browser offering to translate `--no-clone-dedupe` would offer to break it.
