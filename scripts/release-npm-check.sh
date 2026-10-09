# Is this version on npm? Sourced by release.sh, and kept in its own file so
# it can be exercised against a stubbed `npm` without running a release.
# Expects PACKAGE_NAME and VERSION to be set by the caller.
#
# Read UNCACHED, through `npm view --prefer-online`. Both the npm CLI's cache
# and the registry's CDN serve a stale document for a while after a publish:
# the CLI cache misled the 0.40.0 release, and a plain `curl` of the registry
# (what this used to do) still showed the previous `latest` after 0.42.0 had
# published (#184). `--prefer-online` revalidates and saw it at once.
#
# The same check answers both questions the script asks: "is this a resume?"
# before anything happens, and "did the publish land?" at the end.

npm_has_version() {
    local published
    published=$(npm view "${PACKAGE_NAME}@${VERSION}" version --prefer-online 2>/dev/null) || return 1
    [ "$published" = "$VERSION" ]
}

# After a publish: a fresh version can take a moment to show up, so keep
# asking for about a minute (2+4+8+16+30 s between six attempts) before
# calling it missing.
wait_for_npm_version() {
    local delay
    if npm_has_version; then return 0; fi
    for delay in 2 4 8 16 30; do
        sleep "$delay"
        if npm_has_version; then return 0; fi
    done
    return 1
}
