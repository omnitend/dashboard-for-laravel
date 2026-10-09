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

#
# Bounded in time. npm's defaults are a 5-minute fetch timeout and 2 retries
# (fetch-timeout=300000, fetch-retries=2), so a stalled registry could hold
# the resume check for minutes. Each check asks npm for a 10 s timeout and no
# retries, and is killed if it is still running after NPM_CHECK_LIMIT seconds
# whatever npm does. A check that times out counts as "not there".

NPM_CHECK_LIMIT=15

npm_has_version() {
    local output_file npm_pid published
    local polls=0 max_polls=$((NPM_CHECK_LIMIT * 5))
    output_file=$(mktemp)
    npm view "${PACKAGE_NAME}@${VERSION}" version --prefer-online \
        --fetch-timeout=10000 --fetch-retries=0 >"$output_file" 2>/dev/null &
    npm_pid=$!
    while kill -0 "$npm_pid" 2>/dev/null; do
        if [ "$polls" -ge "$max_polls" ]; then
            kill "$npm_pid" 2>/dev/null || true
            wait "$npm_pid" 2>/dev/null || true
            rm -f "$output_file"
            return 1
        fi
        sleep 0.2
        polls=$((polls + 1))
    done
    if ! wait "$npm_pid"; then
        rm -f "$output_file"
        return 1
    fi
    published=$(cat "$output_file")
    rm -f "$output_file"
    [ "$published" = "$VERSION" ]
}

# After a publish: a fresh version can take a moment to show up, so keep
# asking for about a minute (2+4+8+16+30 s between six attempts) before
# calling it missing. Never past 90 s, however slow each check is.
wait_for_npm_version() {
    local delay deadline=$((SECONDS + 90))
    if npm_has_version; then return 0; fi
    for delay in 2 4 8 16 30; do
        if [ $((SECONDS + delay)) -ge "$deadline" ]; then return 1; fi
        sleep "$delay"
        if npm_has_version; then return 0; fi
    done
    return 1
}
