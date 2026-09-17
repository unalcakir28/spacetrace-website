# spacetrace site — Claude Code notes

This repo is only the marketing site. The product itself, the release
pipeline and the download contract live in the
[core repo](https://github.com/unalcakir28/spacetrace):
`docs/RELEASING.md` describes the channels and the asset names.

**The download contract is defined there, not here.** The tag and file
names in `src/data/releases.ts` must be exactly identical to the strings
produced by the three release workflows in the core repo; renaming one
silently breaks every download link.

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

**Node 22.** Pinned nowhere — there is no `.nvmrc`, no `engines` and no
`packageManager` field; the single source is `node-version: 22` in
`pages.yml`. Running a different version locally silently diverges from CI.

**No test runner and no linter.** There is no vitest/jest/playwright
configuration, no ESLint and no Prettier; `scripts/verify-lang.mjs` and
`scripts/verify-changelog.mjs` are effectively the entire test suite, and
`astro check` is the entire lint. When you write a new verification, add a
third `.mjs` script, do not set up a test framework — both of them run
against the built `dist/` and that is the only way they catch the class of
bug described below.

## What this is

This repo is an **Astro 7** project. It produces five languages (en, tr,
it, fr, de) and **36 static pages** (7 routes × 5 languages under
`src/pages/` + `404`); `pages.yml` builds it and uploads it to GitHub
Pages, and Pages serves it from the `spacetrace.teknobakkall.com` domain.

Layers: `src/pages/[lang]/*.astro` are thin wrappers — they only set up
`getStaticPaths` and call the view. The real content is in the seven files
under `src/views/`, and the single layout is `src/layouts/Base.astro`.
**No Tailwind**: a single hand-written global stylesheet
`src/styles/global.css` (16 KB, its typography and layout system redesigned
from scratch in `6c2449a`) and `src/components/demo/treemap.css`, which
belongs to the React island. No content collections — the data is plain
TS/JSON (`src/data/`). `trailingSlash: "always"`.

What breaks easily:

- **The dictionaries are typed against English.** `src/i18n/ui/en.ts` is
  the source; the other four languages conform to it through the
  `Dictionary` type. A key added to one language and forgotten in the
  others is a compile error from `yarn typecheck`, not a blank on the live
  page. That is why the workflow runs `typecheck` before `build`.
- **Do not type `yarn check`.** It is yarn 1.x's own builtin command and it
  shadows the script — it silently says "Folder in sync" and the type check
  never runs. That is why the script is named `typecheck`.
- **The download contract is in one place:** `src/data/releases.ts`. The
  tag names and the asset names must be the same as the ones in the table
  above; a rename there breaks every download link.
- **Leaving a download page that works with JS turned off is mandatory.**
  The links point at real files in the markup (`continuous` tags never
  move); `src/scripts/releases.ts` only layers information on top — the
  version, the date, the size, and upgrading the links to the stable
  release once one is out. Every step is guarded, errors are swallowed
  silently.
- **The interactive treemap is the only React island**
  (`src/components/demo/`). It is drawn with reasonable geometry on the
  server too, so it looks filled in without JS.
- **`base: "/"`** — every internal link goes through `localeUrl()`. A
  hand-written path works in `astro dev` and 404s in production. It is this
  indirection that let the site move from the core repo to its own domain
  with a one-line change.
- **`public/CNAME` carries the domain.** If it is deleted, Pages falls back
  to the default address and the certificate drops.

`@astrojs/sitemap` is enabled with the `i18n` configuration, the output is
`dist/sitemap-index.xml` (35 URLs, 404 excluded). **`robots.txt` is not in
the repo** — adding it is part of the SEO work; its absence is not a
deliberate decision.

The remaining work on SEO and AI discoverability is in the core repo's
TODO.md, in the "Post-launch — SEO and AISEO" section; the measurements are
there.

## Claude tooling kept in the repo

| Tool | When |
|------|----------|
| `preflight` (skill) | Before a push; a push goes straight to production |
| `web-design-guidelines` (skill) | UI review; vendored from `vercel-labs/agent-skills` (`23cb294`) |
| `no-yarn-check` (hook) | Refuses the bare `yarn check` — yarn 1.x's builtin, which reports success without type checking anything |

`preflight` **triggers on its own** — because a push goes straight to
production, it is most valuable right before a push.

**Until 16 September 2026 the vendored skill sat under `.agents/skills/`
and was never loaded** — Claude Code reads `.claude/skills/`. A symlink
dangling at the same skill had been left in the core repo too; that was
deleted as well. There is now a single real copy, here.

The shared tools come from the `spacetrace-tools` plugin, with the
`spacetrace-tools:` prefix. The one that concerns this repo:
**`download-contract`** — it compares the tag and asset names in
`src/data/releases.ts` against the ones the core's release workflows
produce. **This repo is the other end of the contract** and no CI sees both
of them, so the plugin is the only place either side is checked: the skill
compares them, and the `download-contract-drift` Stop hook asks when a
session changed `releases.ts` while the producing end stayed put. Also
`doc-drift-auditor`, `workspace-audit` and `code-reviewer`.

I do not keep the full list here, it is in the plugin's README; so is the
installation. The plugin is a private repo — since this repo is public, I
trust the name rather than a link.

### Automatic language detection

Pages is static, so there is no server to read `Accept-Language` — the
detection lives in the inline script inside
`src/components/LangRedirect.astro`, at the very top of `<head>` (before
the stylesheet and the fonts, so that no request is wasted on a page that
is about to be abandoned).

There are four rules, and each one exists to keep this from working
against the user:

1. **It only runs on unprefixed (English) pages.** An address that names
   the language, like `/tr/hub/`, is somebody's deliberate choice or a
   link they shared; moving them off it would be wrong.
2. **An explicit choice wins permanently.** Picking a language from the
   switcher, going back to "English" from the notice bar, or dismissing
   the bar writes `spacetrace.lang` into `localStorage`; after that this
   script never runs.
3. **If English comes before the other four languages in the browser's
   preference list, nothing happens.** The order is read: `["en-GB","tr"]`
   stays on English, `["tr-TR","en-US"]` goes to Turkish. An unsupported
   language also leaves the reader on English (this is the `x-default` in
   `hreflang`).
4. **Every error leaves the page where it is** — `localStorage` can throw
   in a private tab, `navigator.languages` may not exist.

After a redirect, a notice bar appears once on the target page
(`LangNotice.astro`): one sentence in that language and **English** as the
way out. Being moved without being told is the part of language detection
people dislike; the way out has to be one click and a word they can read.
The bar is one-shot through a `sessionStorage` flag — it is deleted the
moment it is read.

Detection is off on the `404` page (`detectLanguage={false}`): its path is
not one of the translated routes.

#### Verification is mandatory, and against the built output

`yarn verify` (`scripts/verify-lang.mjs`) **extracts the redirector from
`dist/` and runs it in a fake browser**, measuring where the reader ends up
in 21 cases. It runs after `yarn build` in the Pages workflow.

**A local `dist/` can be stale.** `verify` and `verify:changelog` look at
the built output, not at the source — a green result without running
`yarn build` means you verified the old site.

This step exists for a reason: the feature once **shipped to production
inert**. In Astro, wrapping an inline script body as a JSX child with
`` {`…`} `` prints the wrapper into the HTML as-is; the code that comes out
is a string that is evaluated inside a block and discarded. The result: the
build is green, the script is on the page, `window.location.replace`
**appears** inside it, and it does nothing. So a test that looks at "is
there a script" or "does it contain this expression" would have approved
it — the only check with teeth is running the script.

The second trap: `define:vars` and `set:html` cannot be used together,
`define:vars` wins and the body disappears entirely. That is why there is
only one mechanism — the whole script, values included, is assembled as a
string in the frontmatter and handed over with `set:html`.

When you change the behaviour, update the cases in `verify-lang.mjs` along
with it.

## Changelog page

`/changelog/` is in five languages, and its source is **not this repo**:
`src/data/changelog.json` is a copy of `crates/changelog/changelog.json`
in the core repo. The same file is compiled into the CLI, the desktop app
and the hub — so the text on the page and the text in the app's "What's
new" window cannot diverge. Do not fix the text here, fix it in core.

```bash
yarn sync:changelog    # refreshes the copy
```

**The refresh is inside the Pages workflow.** It runs on every push and
every six hours: it downloads, verifies, commits if anything changed, then
builds and publishes. To trigger it by hand: `gh workflow run pages.yml`.

It was tried as a separate "sync" workflow and it **did not work**: it
committed, but Pages never ran, because a push made with `GITHUB_TOKEN`
deliberately does not trigger other workflows. Do not try to split it; one
workflow, one deployment path.

The download step is not fatal — the committed copy is a valid page, and a
network error or a corrupt upstream file must not take the site's
deployment down.

**`unreleased` is never rendered onto the page.** Those entries describe
code that sits on the core repo's `main` and is in nobody's download;
announcing a change the reader cannot get would be wrong. The same rule
holds in the desktop app's "What's new" panel and in the hub's About card.
They stay in the data layer so that `missingLocales()` catches a missing
translation before a release is cut.

`yarn verify:changelog` verifies this **against the built HTML** and runs
in the Pages workflow. Its first version compared raw text against raw HTML
and missed all of French: the apostrophe lands on the page as `&#39;`. It
was measured by mutation — putting the block back caught 15 of the 15 texts
there were that day (there are 20 locale strings today; the measurement was
not repeated).

The `const source: Source = raw` in `src/data/changelog.ts` **is the check
itself**: because the `text` field is `Record<Locale, string>`, if German
is missing from an entry `yarn typecheck` breaks — the data-side
counterpart of typing the dictionaries against English. This was verified
by deleting and trying, not assumed.

The `kind` field cannot be checked there (a JSON import widens string
literals), so `toKind` throws at build time.

The `` `backtick` `` pieces inside entry texts are rendered as
`<code translate="no">`: commands and flags are the same in all five
languages, and the browser offering to translate `--no-clone-dedupe` would
be offering to break it.
