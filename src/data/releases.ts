/**
 * The download contract.
 *
 * Tag names and asset names here are the same strings the three release
 * workflows produce (see docs/RELEASING.md). Renaming one on either side
 * breaks every download link on the site, so they live in exactly one place
 * and nothing else on the site hard-codes a URL.
 */

export const OWNER = "unalcakir28";
export const REPO = "spacetrace";
export const REPO_SLUG = `${OWNER}/${REPO}`;
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
// Only the public repository is ever linked from the site. The desktop and
// hub sources are private, so a link to them would send a visitor to a sign-in
// page; their downloads are published into the public repo instead, which is
// what the asset URLs below point at.
export const RELEASES_API = `https://api.github.com/repos/${REPO_SLUG}/releases?per_page=40`;
export const INSTALL_SH = `https://raw.githubusercontent.com/${REPO_SLUG}/main/install.sh`;

export type Component = "desktop" | "cli" | "hub";

/**
 * The pattern that recognises a stable release, and one real tag to fall back
 * on before the API answers.
 *
 * There used to be a rolling `…-continuous` tag here and the fallbacks pointed
 * at it, which is why they never went stale: it was republished on every push
 * to main. That channel was removed on 19 September 2026 — a build now happens
 * only when a version is named — so these have to name a version too.
 *
 * **`fallback` is a live link on a production page.** It is the `href` baked
 * into the HTML and the tag in the `curl` line under the checksums, and the
 * script only upgrades it once the releases API answers. Point it at a tag
 * that does not exist and every download button 404s for anyone whose
 * JavaScript did not run. It moves with each release; `download-contract` is
 * the skill that checks it still resolves.
 */
export const CHANNELS: Record<Component, { fallback: string; stable: RegExp }> = {
  desktop: { fallback: "desktop-v0.7.0", stable: /^desktop-v\d/ },
  cli: { fallback: "v0.8.0", stable: /^v\d/ },
  hub: { fallback: "hub-v0.5.0", stable: /^hub-v\d/ },
};

export type Os = "macos" | "windows" | "linux";

export interface Asset {
  /** Which release the file comes from. */
  component: Component;
  /** A substring that identifies the file within a release's asset list. */
  match: string;
  /** The file name in the rolling channel — the fallback href. */
  fallbackName: string;
  /** Which platform card this belongs to, if any. */
  os?: Os;
  /** Set on the one file a visitor on that platform should take first. */
  primary?: boolean;
}

function url(component: Component, name: string): string {
  return `${REPO_URL}/releases/download/${CHANNELS[component].fallback}/${name}`;
}

/** The href to use before (or without) the releases API answering. */
export function fallbackUrl(asset: Asset): string {
  return url(asset.component, asset.fallbackName);
}

export function checksumsUrl(component: Component): string {
  return url(component, "SHA256SUMS");
}

export const DESKTOP_ASSETS: Asset[] = [
  {
    component: "desktop",
    match: "macos-universal.dmg",
    fallbackName: "spacetrace-desktop-v0.7.0-macos-universal.dmg",
    os: "macos",
    primary: true,
  },
  {
    component: "desktop",
    match: "windows-x86_64-setup.exe",
    fallbackName: "spacetrace-desktop-v0.7.0-windows-x86_64-setup.exe",
    os: "windows",
    primary: true,
  },
  {
    component: "desktop",
    match: "linux-x86_64.deb",
    fallbackName: "spacetrace-desktop-v0.7.0-linux-x86_64.deb",
    os: "linux",
    primary: true,
  },
  {
    component: "desktop",
    match: "linux-x86_64.rpm",
    fallbackName: "spacetrace-desktop-v0.7.0-linux-x86_64.rpm",
    os: "linux",
  },
  {
    component: "desktop",
    match: "linux-x86_64.AppImage",
    fallbackName: "spacetrace-desktop-v0.7.0-linux-x86_64.AppImage",
    os: "linux",
  },
];

export const CLI_ASSETS: Asset[] = [
  {
    component: "cli",
    match: "aarch64-apple-darwin.tar.gz",
    fallbackName: "spacetrace-v0.8.0-aarch64-apple-darwin.tar.gz",
    os: "macos",
  },
  {
    component: "cli",
    match: "x86_64-apple-darwin.tar.gz",
    fallbackName: "spacetrace-v0.8.0-x86_64-apple-darwin.tar.gz",
    os: "macos",
  },
  {
    component: "cli",
    match: "x86_64-unknown-linux-musl.tar.gz",
    fallbackName: "spacetrace-v0.8.0-x86_64-unknown-linux-musl.tar.gz",
    os: "linux",
  },
  {
    component: "cli",
    match: "aarch64-unknown-linux-musl.tar.gz",
    fallbackName: "spacetrace-v0.8.0-aarch64-unknown-linux-musl.tar.gz",
    os: "linux",
  },
  {
    component: "cli",
    match: "x86_64-pc-windows-msvc.zip",
    fallbackName: "spacetrace-v0.8.0-x86_64-pc-windows-msvc.zip",
    os: "windows",
    primary: true,
  },
];

export const HUB_ASSETS: Asset[] = [
  {
    component: "hub",
    match: "x86_64-unknown-linux-musl.tar.gz",
    fallbackName: "spacetrace-hub-v0.5.0-x86_64-unknown-linux-musl.tar.gz",
    os: "linux",
  },
  {
    component: "hub",
    match: "aarch64-unknown-linux-musl.tar.gz",
    fallbackName: "spacetrace-hub-v0.5.0-aarch64-unknown-linux-musl.tar.gz",
    os: "linux",
  },
  {
    component: "hub",
    match: "aarch64-apple-darwin.tar.gz",
    fallbackName: "spacetrace-hub-v0.5.0-aarch64-apple-darwin.tar.gz",
    os: "macos",
  },
  {
    component: "hub",
    match: "x86_64-apple-darwin.tar.gz",
    fallbackName: "spacetrace-hub-v0.5.0-x86_64-apple-darwin.tar.gz",
    os: "macos",
  },
];

export const AGENT_IMAGE = `ghcr.io/${OWNER}/spacetrace`;
export const HUB_IMAGE = `ghcr.io/${OWNER}/spacetrace-hub`;

/** The one-liner the site puts in front of people more than anything else. */
export const INSTALL_COMMAND = `curl -fsSL ${INSTALL_SH} | sh`;
