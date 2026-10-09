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
# retries, and is killed if it is still running after its time limit
# (NPM_CHECK_LIMIT seconds, or less when the caller has less left) whatever
# npm does. A check that times out counts as "not there".
#
# Timed with bash's SECONDS (macOS ships bash 3.2, which has no sub-second
# clock): SECONDS counts whole seconds since the shell started, so it never
# runs ahead of real time, and a limit of N seconds kills npm within N
# seconds plus one 0.2 s poll.

NPM_CHECK_LIMIT=15

# $1: time limit in seconds (default NPM_CHECK_LIMIT).
npm_has_version() {
    local output_file npm_pid published
    local kill_at=$((SECONDS + ${1:-$NPM_CHECK_LIMIT}))
    output_file=$(mktemp)
    npm view "${PACKAGE_NAME}@${VERSION}" version --prefer-online \
        --fetch-timeout=10000 --fetch-retries=0 >"$output_file" 2>/dev/null &
    npm_pid=$!
    while kill -0 "$npm_pid" 2>/dev/null; do
        if [ "$SECONDS" -ge "$kill_at" ]; then
            kill "$npm_pid" 2>/dev/null || true
            wait "$npm_pid" 2>/dev/null || true
            rm -f "$output_file"
            return 1
        fi
        sleep 0.2
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
# calling it missing. Never past 90 s, however slow each check is: the wait
# before a check and the check itself both come out of what is left.
wait_for_npm_version() {
    local delay remaining deadline=$((SECONDS + 90))
    if npm_has_version "$NPM_CHECK_LIMIT"; then return 0; fi
    for delay in 2 4 8 16 30; do
        # Not worth waiting if there would be under a second left to ask.
        if [ $((deadline - SECONDS - delay)) -lt 1 ]; then return 1; fi
        sleep "$delay"
        remaining=$((deadline - SECONDS))
        if [ "$remaining" -lt 1 ]; then return 1; fi
        if [ "$remaining" -gt "$NPM_CHECK_LIMIT" ]; then remaining=$NPM_CHECK_LIMIT; fi
        if npm_has_version "$remaining"; then return 0; fi
    done
    return 1
}
