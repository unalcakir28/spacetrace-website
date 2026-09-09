/**
 * The changelog, as the apps and the release notes see it.
 *
 * `changelog.json` is a copy. The original lives in the core repo at
 * `crates/changelog/changelog.json`, which is also what gets compiled into the
 * CLI, the desktop app and the hub — so the page below and the What's new
 * dialog in the app cannot disagree. Refresh the copy with
 * `yarn sync:changelog`.
 *
 * The types here are the point, not decoration. `text` is a `Record<Locale,
 * string>`, so an entry that is missing German fails `yarn typecheck` instead
 * of rendering a gap on a live page — the same guarantee the UI dictionaries
 * get from being typed against English, applied to content that arrives as
 * data. The assignment at the bottom is where it is enforced: TypeScript infers
 * the real shape of the JSON and refuses it if any entry falls short.
 */
import raw from "./changelog.json";
import { LOCALES, type Locale } from "../i18n/config";

/** Same set, and the same order, as the generated CHANGELOG.md. */
export const KINDS = [
  "added",
  "changed",
  "performance",
  "fixed",
  "removed",
  "security",
] as const;
export type Kind = (typeof KINDS)[number];

export const COMPONENTS = ["desktop", "cli", "hub"] as const;
export type Component = (typeof COMPONENTS)[number];

export interface Entry {
  kind: Kind;
  /** Every locale, always. Commands and flags inside are not translated. */
  text: Record<Locale, string>;
}

export interface Release {
  version: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /**
   * False for a development milestone that was never tagged. It has no
   * downloadable files, so the page must not offer any.
   */
  published: boolean;
  entries: Entry[];
}

export interface ComponentLog {
  unreleased: Entry[];
  /** Newest first, guaranteed by a test in the core repo. */
  releases: Release[];
}

export interface Changelog {
  schema: number;
  components: Record<Component, ComponentLog>;
}

/**
 * The shape as TypeScript infers it from the JSON, with `kind` still a plain
 * string — a JSON import widens string literals, and no annotation can narrow
 * them back.
 *
 * **This assignment is the guarantee.** `text` is a `Record<Locale, string>`
 * here, so an entry missing a locale fails `yarn typecheck`. `kind` is checked
 * a few lines below instead, at build time, because it cannot be checked here.
 */
type Source = {
  schema: number;
  components: Record<
    Component,
    {
      unreleased: { kind: string; text: Record<Locale, string> }[];
      releases: {
        version: string;
        date: string;
        published: boolean;
        entries: { kind: string; text: Record<Locale, string> }[];
      }[];
    }
  >;
};

const source: Source = raw;

/** Fails the build rather than rendering an entry under no heading. */
function toKind(value: string): Kind {
  if ((KINDS as readonly string[]).includes(value)) return value as Kind;
  throw new Error(
    `changelog.json: unknown kind ${JSON.stringify(value)}; expected one of ${KINDS.join(", ")}`,
  );
}

export const changelog: Changelog = {
  schema: source.schema,
  components: Object.fromEntries(
    COMPONENTS.map((component) => {
      const log = source.components[component];
      const narrow = (entries: { kind: string; text: Record<Locale, string> }[]) =>
        entries.map((entry) => ({ kind: toKind(entry.kind), text: entry.text }));
      return [
        component,
        {
          unreleased: narrow(log.unreleased),
          releases: log.releases.map((release) => ({
            ...release,
            entries: narrow(release.entries),
          })),
        },
      ];
    }),
  ) as Record<Component, ComponentLog>,
};

/** Release tags follow the same contract as `CHANNELS` in `releases.ts`. */
export function releaseTag(component: Component, version: string): string {
  const prefix = component === "cli" ? "v" : `${component}-v`;
  return `${prefix}${version}`;
}

/**
 * Entries grouped by kind, in `KINDS` order, skipping kinds with nothing in
 * them. Source order is kept inside each group.
 */
export function byKind(entries: Entry[]): { kind: Kind; entries: Entry[] }[] {
  return KINDS.map((kind) => ({
    kind,
    entries: entries.filter((entry) => entry.kind === kind),
  })).filter((group) => group.entries.length > 0);
}

/** Newest first across every component, for a single combined timeline. */
export function timeline(): {
  component: Component;
  release: Release;
}[] {
  const all = COMPONENTS.flatMap((component) =>
    changelog.components[component].releases.map((release) => ({
      component,
      release,
    })),
  );
  // Same date happens: three components released together. Falling back to
  // version keeps the order stable between builds rather than leaving it to
  // whatever sort the engine happens to use.
  return all.sort((a, b) => {
    if (a.release.date !== b.release.date) {
      return a.release.date < b.release.date ? 1 : -1;
    }
    return a.release.version < b.release.version ? 1 : -1;
  });
}

/** What has landed but is not in any release yet, per component. */
export function pending(): { component: Component; entries: Entry[] }[] {
  return COMPONENTS.map((component) => ({
    component,
    entries: changelog.components[component].unreleased,
  })).filter((group) => group.entries.length > 0);
}

/** Guards against a locale being added to the site but not to the changelog. */
export function missingLocales(): string[] {
  const gaps: string[] = [];
  const every = [
    ...COMPONENTS.flatMap((c) => changelog.components[c].unreleased),
    ...timeline().flatMap(({ release }) => release.entries),
  ];
  for (const entry of every) {
    for (const locale of LOCALES) {
      if (!entry.text[locale]) gaps.push(locale);
    }
  }
  return [...new Set(gaps)];
}
