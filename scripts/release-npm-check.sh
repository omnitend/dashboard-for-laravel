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
# The same check (version_is_published: npm, then the registry document)
# answers both questions the script asks: "is this a resume?" before anything
# happens, and "did the publish land?" at the end.

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

# The second source (#203): the registry document itself, asked not to be
# served from cache, with a query that makes the URL new each time. Counted
# only if the version is in BOTH `versions` and `time`: an unpublished
# version keeps its `time` entry, so `time` alone is not proof. 0.44.0 was
# there as soon as `npm view` saw it. curl's own --max-time bounds it, so
# there is nothing to poll; `-q` (which must come first) ignores any
# ~/.curlrc, whose retries would each get a fresh --max-time.
# $1: time limit in seconds.
registry_has_version() {
    local encoded_name=${PACKAGE_NAME/\//%2f}
    curl -q -fsS --max-time "$1" \
        -H 'Cache-Control: no-cache' -H 'Accept: application/json' \
        "https://registry.npmjs.org/${encoded_name}?t=$(date +%s)" 2>/dev/null \
        | VERSION="$VERSION" node -e '
            let body = "";
            process.stdin.on("data", (chunk) => (body += chunk));
            process.stdin.on("end", () => {
                try {
                    const doc = JSON.parse(body);
                    const version = process.env.VERSION;
                    const listed =
                        doc.versions?.[version]?.version === version &&
                        Boolean(doc.time?.[version]);
                    process.exit(listed ? 0 : 1);
                } catch {
                    process.exit(1);
                }
            });'
}

# Either source will do. npm goes first, leaving the registry at least
# REGISTRY_CHECK_RESERVE seconds of the limit, so a hung npm cannot starve it.
# $1: time limit in seconds (default VERSION_CHECK_LIMIT).
REGISTRY_CHECK_RESERVE=5
VERSION_CHECK_LIMIT=$((NPM_CHECK_LIMIT + REGISTRY_CHECK_RESERVE))

version_is_published() {
    local limit=${1:-$VERSION_CHECK_LIMIT}
    local started=$SECONDS npm_limit left
    npm_limit=$((limit - REGISTRY_CHECK_RESERVE))
    if [ "$npm_limit" -gt "$NPM_CHECK_LIMIT" ]; then npm_limit=$NPM_CHECK_LIMIT; fi
    if [ "$npm_limit" -lt 1 ]; then npm_limit=1; fi
    if npm_has_version "$npm_limit"; then return 0; fi
    left=$((limit - (SECONDS - started)))
    if [ "$left" -lt 1 ]; then return 1; fi
    registry_has_version "$left"
}

# After a publish: a fresh version can take minutes to show up (0.44.0 was
# still missing after the first minute and there 10 s later, #203), so ask at
# fixed times after the start, 0 2 6 14 30 60 90 120 150 180 s, before calling
# it missing. An ask that falls behind (slow checks) runs at once rather than
# shifting the rest, so the last one is always at or after 180 s. Never past
# NPM_VERIFY_DEADLINE seconds: each ask gets what is left, at most
# VERSION_CHECK_LIMIT, and the deadline leaves the 180 s ask its full limit.
NPM_VERIFY_DEADLINE=$((180 + VERSION_CHECK_LIMIT))

wait_for_npm_version() {
    local ask_at remaining started=$SECONDS
    local deadline=$((SECONDS + NPM_VERIFY_DEADLINE))
    for ask_at in 0 2 6 14 30 60 90 120 150 180; do
        if [ $((started + ask_at)) -gt "$SECONDS" ]; then
            sleep $((started + ask_at - SECONDS))
        fi
        remaining=$((deadline - SECONDS))
        # Not worth asking with under a second left.
        if [ "$remaining" -lt 1 ]; then return 1; fi
        if [ "$remaining" -gt "$VERSION_CHECK_LIMIT" ]; then remaining=$VERSION_CHECK_LIMIT; fi
        if version_is_published "$remaining"; then return 0; fi
    done
    return 1
}
