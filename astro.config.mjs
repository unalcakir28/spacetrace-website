// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

// Served from its own domain, so the site sits at the root and `base` is "/".
// It used to be a GitHub Pages *project* site under /spacetrace, where the
// repository name was the URL path. Every internal link still goes through
// localeUrl() in src/i18n/routing.ts rather than being written by hand: that
// indirection is what made this move a one-line change instead of a sweep.
export default defineConfig({
  site: "https://spacetrace.teknobakkall.com",
  base: "/",
  trailingSlash: "always",
  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: { en: "en", tr: "tr", it: "it", fr: "fr", de: "de" },
      },
    }),
  ],
  build: {
    // Inline nothing: the interactive islands are small enough that an extra
    // request costs less than blocking the parser.
    inlineStylesheets: "auto",
  },
});
