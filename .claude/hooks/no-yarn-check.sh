#!/usr/bin/env bash
# Refuses the bare `yarn check`, which is not this repository's type check.
#
# `check` is yarn 1.x's own builtin (it verifies the lockfile against
# node_modules). It SHADOWS a script of the same name, so a package.json script
# called `check` can never be reached. That is why this repository's script is
# named `typecheck` — and it is also why typing `yarn check` is dangerous here:
# it exits 0 with "Folder in sync" and no type checking happens at all.
#
# The cost of not catching it is higher here than anywhere else in the
# workspace: the dictionaries are typed against English, so a missing
# translation key is a COMPILE error and nothing else looks for it — and a push
# to this repository goes straight to production.
#
# `yarn check:plugins` and `yarn typecheck` are different commands and must not
# be caught; the pattern therefore refuses `check` only when a word boundary,
# not a colon, follows it.
set -uo pipefail

command=$(jq -r '.tool_input.command // empty' 2>/dev/null)
[ -n "$command" ] || exit 0

[[ "$command" =~ yarn[[:space:]]+check([[:space:]]|$|\;|\&|\|) ]] || exit 0

cat >&2 <<'EOF'
`yarn check` is yarn 1.x's builtin, not a type check.

It compares the lockfile against node_modules, prints "Folder in sync" and
exits 0 without type checking anything — so it reports success at exactly the
moment you were trying to find a failure.

The type check here is:

  yarn typecheck     # astro check

The script is named `typecheck` precisely because `check` is unreachable: the
builtin shadows it. This matters more here than elsewhere — the five language
dictionaries are typed against English, so a forgotten translation key is a
compile error and nothing else catches it, and a push to this repository
deploys to production.
EOF
exit 2
