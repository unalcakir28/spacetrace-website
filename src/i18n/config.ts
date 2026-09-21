/** The five shipped languages. `en` is the default and carries no URL prefix. */
export const LOCALES = ["en", "tr", "it", "fr", "de"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Endonyms — each language named in itself. A switcher that lists "Turkish"
 * to somebody who only reads Turkish is a switcher they cannot use.
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
};

/** For `hreflang` and the `lang` attribute. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en",
  tr: "tr",
  it: "it",
  fr: "fr",
  de: "de",
};

/**
 * For `og:locale`, which is the one place the bare code above is wrong.
 *
 * Open Graph wants `language_TERRITORY` with an underscore, and a bare `en` is
 * ignored by the scrapers that read it. `hreflang` and the `lang` attribute
 * want exactly the opposite — a bare code claims the language without claiming
 * a country, which is what this site actually ships — so these are two maps on
 * purpose. Do not collapse them.
 *
 * The territory in each is the largest readership rather than a statement about
 * dialect; Open Graph has no way to say "this language, no particular country".
 */
export const OG_LOCALES: Record<Locale, string> = {
  en: "en_US",
  tr: "tr_TR",
  it: "it_IT",
  fr: "fr_FR",
  de: "de_DE",
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
