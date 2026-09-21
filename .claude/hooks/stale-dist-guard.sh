#!/usr/bin/env bash
# Refuses a verify script while dist/ is older than the sources it was built from.
#
# All three verification scripts read the BUILT OUTPUT, not the source:
# verify-lang extracts the redirector out of dist/ and runs it, verify-changelog
# compares the changelog texts against the built HTML, and verify-seo reads the
# metadata and JSON-LD off the built pages. That is deliberate and it is the
# only reason they have teeth — the language redirector once shipped to
# production inert, because Astro turned the inline script body into a string,
# and every check of the form "is there a script" or "does it contain this
# expression" passed it. Running the built artifact is the check.
#
# The cost of reading dist/ is that a stale dist/ reports success about a site
# that no longer exists. Green without a fresh `yarn build` means the previous
# build was verified, the edit was not, and nothing says so: the scripts have no
# way to know how old the directory they are reading is.
#
# The Pages workflow is safe — it builds in a clean checkout and verifies right
# after. This is a local-only trap, which is exactly why no CI step can catch it,
# and a push here deploys straight to production.
#
# Shaped after dist-before-cargo.sh in spacetrace-desktop, which gates the mirror
# image of this in the other direction: there a missing dist/ makes the command
# fail with a confusing error, here a stale dist/ makes it PASS with a confident
# one. A false pass is the worse of the two, so this also refuses rather than
# warns.
set -uo pipefail

command=$(jq -r '.tool_input.command // empty' 2>/dev/null)
[ -n "$command" ] || exit 0

# The yarn scripts and the three scripts themselves, however they are invoked.
case "$command" in
*yarn\ verify* | *verify-lang.mjs* | *verify-changelog.mjs* | *verify-seo.mjs*) ;;
*) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-$PWD}"

if [ ! -d "$root/dist" ]; then
	cat >&2 <<'EOF'
dist/ does not exist, and every verification script reads the built output rather
than the source.

Build it first:

  yarn build

dist/ is gitignored, so a clean clone always needs this once.
EOF
	exit 2
fi

# index.html is written on every build, so its timestamp is the build's.
stamp="$root/dist/index.html"
[ -f "$stamp" ] || stamp="$root/dist"

# Everything a build reads. astro.config and package.json change the output as
# surely as a page does.
newer=$(
	find "$root/src" "$root/public" -type f -newer "$stamp" -print 2>/dev/null
	find "$root" -maxdepth 1 -type f \
		\( -name 'astro.config.*' -o -name 'package.json' -o -name 'tsconfig.json' \) \
		-newer "$stamp" -print 2>/dev/null
)
[ -n "$newer" ] || exit 0

count=$(printf '%s\n' "$newer" | grep -c .)

cat >&2 <<EOF
dist/ is older than $count source file(s), so this would verify the previous
build and report success about a site that no longer exists:

$(printf '%s\n' "$newer" | sed "s|^$root/|  |" | head -10)$(
	[ "$count" -gt 10 ] && printf '\n  … and %d more' "$((count - 10))"
)

Rebuild first, then verify:

  yarn build && yarn verify && yarn verify:changelog && yarn verify:seo

verify-lang.mjs extracts the redirector from dist/ and runs it; verify-changelog
and verify-seo read the built HTML. Reading the built output is what gives them
teeth — the redirector once shipped inert and only running it caught that — and
it is also why a stale directory turns them into a false pass.
EOF
exit 2
