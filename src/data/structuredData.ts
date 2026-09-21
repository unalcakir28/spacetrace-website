/**
 * JSON-LD for the `<head>`, built per page and per language.
 *
 * What this is for: the machine-readable answer to "what is this, which
 * operating systems, which licence, does it cost anything". A crawler that
 * reads it does not have to infer any of that from prose, and the AI crawlers
 * this site cares about do not run JavaScript, so a static graph in the markup
 * is the only form that reaches them.
 *
 * **Everything here has to stay true without anybody checking.** Two rules
 * follow from that, and both cost a rich-result feature on purpose:
 *
 * 1. **No version numbers.** `softwareVersion` would be a third place the
 *    release has to be bumped, next to `releases.ts` and the core's own files,
 *    and the one nothing guards. The download page carries the version,
 *    generated from the release itself.
 * 2. **`offers` only where the price is permanent.** The command line tool and
 *    the agent are Apache-2.0 and free, and will not stop being. The desktop
 *    app is currently free to download *while it is in phase 3* and the hub is
 *    commercial; structured data cannot say "for now", so declaring a price
 *    there would be a claim that expires quietly. Those two declare what they
 *    are and what they run on, and say nothing about money.
 */
import { LOCALE_TAGS, type Locale } from "../i18n/config";
import { localeUrl, type Page } from "../i18n/routing";

const CORE_REPO = "https://github.com/unalcakir28/spacetrace";
const APACHE = "https://www.apache.org/licenses/LICENSE-2.0";

/**
 * The three components, as they are actually shipped.
 *
 * `operatingSystem` is not the same list for all three: the hub publishes
 * Linux and macOS binaries and no Windows one. Copying the desktop's list
 * across would be the easy mistake and would tell a crawler something false.
 */
const SOFTWARE: Partial<
  Record<
    Page,
    {
      name: string;
      operatingSystem: string;
      category: string;
      /** Apache-2.0 components only; see rule 2 in the module comment. */
      free: boolean;
      license?: string;
    }
  >
> = {
  cli: {
    name: "spacetrace",
    operatingSystem: "macOS, Windows, Linux",
    category: "DeveloperApplication",
    free: true,
    license: APACHE,
  },
  desktop: {
    name: "spacetrace desktop",
    operatingSystem: "macOS, Windows, Linux",
    category: "UtilitiesApplication",
    free: false,
  },
  hub: {
    name: "spacetrace hub",
    operatingSystem: "Linux, macOS",
    category: "BusinessApplication",
    free: false,
  },
};

/**
 * A page title with the site suffix removed, for the breadcrumb leaf.
 *
 * Every page's `<title>` ends in ` — spacetrace`. The separator is the same
 * em dash in all five languages, so this is one rule rather than five; a title
 * that does not match is returned untouched rather than guessed at.
 */
function crumb(title: string): string {
  return title.replace(/\s+—\s+spacetrace\s*$/, "");
}

interface Input {
  locale: Locale;
  page: Page;
  /** The page's own title, already translated. */
  title: string;
  /** The page's own description, already translated. */
  description: string;
  /** `Astro.site`, so every `@id` and `url` is absolute. */
  site: URL;
}

/**
 * One `@graph` rather than several scripts: the nodes reference each other by
 * `@id`, which is what lets a consumer see that this page belongs to this site
 * and describes this piece of software, instead of reading three unrelated
 * fragments.
 */
export function structuredData(input: Input): object {
  const { locale, page, title, description, site } = input;
  const abs = (p: Page) => new URL(localeUrl(locale, p), site).href;
  const pageUrl = abs(page);
  const homeUrl = abs("");
  // One WebSite for the whole domain, identified at the origin rather than per
  // language. Five locale-scoped WebSite nodes carrying the same name would
  // describe five sites that happen to be called the same thing; the language
  // belongs on the WebPage, which is the thing that actually is in one
  // language.
  const siteId = `${site.origin}/#website`;
  const orgId = `${site.origin}/#organization`;
  const lang = LOCALE_TAGS[locale];

  const graph: object[] = [
    {
      "@type": "Organization",
      "@id": orgId,
      name: "spacetrace",
      url: site.origin,
      // The one external identity that exists. No social accounts are listed
      // because there are none; inventing a `sameAs` is worse than omitting it.
      sameAs: [CORE_REPO],
    },
    {
      "@type": "WebSite",
      "@id": siteId,
      url: `${site.origin}/`,
      name: "spacetrace",
      publisher: { "@id": orgId },
    },
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      inLanguage: lang,
      isPartOf: { "@id": siteId },
    },
  ];

  // No breadcrumb on the home page: a trail with one entry describes nothing,
  // and Google drops single-item lists anyway.
  if (page !== "") {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "spacetrace", item: homeUrl },
        // The leaf takes the page's own translated title rather than a
        // dictionary label, so it cannot disagree with the `<title>` — and the
        // dictionary has no entry for the changelog route to disagree with.
        // The site suffix comes off: a crumb reading "Command line —
        // spacetrace" inside a trail that already starts at spacetrace says it
        // twice.
        { "@type": "ListItem", position: 2, name: crumb(title), item: pageUrl },
      ],
    });
  }

  const software = SOFTWARE[page];
  if (software) {
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${pageUrl}#software`,
      name: software.name,
      description,
      applicationCategory: software.category,
      operatingSystem: software.operatingSystem,
      inLanguage: lang,
      url: pageUrl,
      downloadUrl: abs("download"),
      isPartOf: { "@id": siteId },
      publisher: { "@id": orgId },
      ...(software.license ? { license: software.license } : {}),
      ...(software.free
        ? {
            isAccessibleForFree: true,
            offers: {
              "@type": "Offer",
              price: 0,
              priceCurrency: "USD",
            },
          }
        : {}),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
