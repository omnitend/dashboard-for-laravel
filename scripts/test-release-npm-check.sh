#!/bin/bash
# Exercises scripts/release-npm-check.sh against stubbed `npm` and `curl`, in
# real time (it takes about three and a half minutes: the slow cases wait out the real
# retry schedule). Run by hand after changing the check:
#
#   bash scripts/test-release-npm-check.sh
#
# Not part of the vitest suite, which runs in a browser and cannot run bash.
# Uses /bin/bash on purpose: macOS ships 3.2, and release.sh runs under it.

set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1
CHECK_SCRIPT=${CHECK_SCRIPT:-"$PWD/scripts/release-npm-check.sh"}
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Stubs read STUB_START (epoch seconds) and their mode from the environment.
mkdir -p "$WORK_DIR/bin"
cat >"$WORK_DIR/bin/npm" <<'STUB'
#!/bin/bash
# STUB_NPM: never | hang | after:<s> | slow_after:<s> (each call takes 12 s)
case "$STUB_NPM" in
    never) exit 1 ;;
    hang) sleep 600; exit 1 ;;
    slow_after:*)
        sleep 12
        if [ $(($(date +%s) - STUB_START)) -ge "${STUB_NPM#slow_after:}" ]; then
            echo "$STUB_VERSION"; exit 0
        fi
        exit 1 ;;
    after:*)
        if [ $(($(date +%s) - STUB_START)) -ge "${STUB_NPM#after:}" ]; then
            echo "$STUB_VERSION"; exit 0
        fi
        exit 1 ;;
esac
STUB
cat >"$WORK_DIR/bin/curl" <<'STUB'
#!/bin/bash
# STUB_CURL: never (a 404) | listed | unlisted | time_only (unpublished:
# the timestamp stays, the manifest goes) | listed_but_fails (exits non-zero)
echo "$*" >>"$STUB_CURL_LOG"
LISTED="{\"versions\":{\"$STUB_VERSION\":{\"version\":\"$STUB_VERSION\"}},\"time\":{\"$STUB_VERSION\":\"2026-10-11T00:00:00Z\"}}"
case "$STUB_CURL" in
    never) exit 22 ;;
    listed) echo "$LISTED" ;;
    listed_but_fails) echo "$LISTED"; exit 28 ;;
    unlisted) echo '{"time":{"0.1.0":"x"},"versions":{}}' ;;
    time_only) echo "{\"versions\":{},\"time\":{\"$STUB_VERSION\":\"2026-10-11T00:00:00Z\"}}" ;;
esac
STUB
chmod +x "$WORK_DIR/bin/npm" "$WORK_DIR/bin/curl"

# $1 name, $2 npm mode, $3 curl mode. Writes "<result> <elapsed> " to a file.
run_case() {
    local name=$1
    env PATH="$WORK_DIR/bin:$PATH" STUB_NPM="$2" STUB_CURL="$3" \
        STUB_VERSION=1.2.3 STUB_START="$(date +%s)" \
        STUB_CURL_LOG="$WORK_DIR/$name.curl" \
        /bin/bash -c '
            set -euo pipefail  # as release.sh runs it
            PACKAGE_NAME=@example/pkg VERSION=1.2.3
            source "$1"
            started=$(date +%s)
            if wait_for_npm_version; then result=found; else result=missing; fi
            echo "$result $(($(date +%s) - started))"' _ "$CHECK_SCRIPT" \
        >"$WORK_DIR/$name.result"
}

run_case npm_late after:120 never &
run_case registry_only never listed &
run_case npm_hangs hang listed &
run_case neither never unlisted &
run_case neither_hang hang never &
run_case slow_late slow_after:180 never &
run_case time_only never time_only &
run_case curl_fails never listed_but_fails &
wait

FAILURES=0
# $1 name, $2 expected result, $3 min seconds, $4 max seconds
expect() {
    local result elapsed
    read -r result elapsed <"$WORK_DIR/$1.result"
    if [ "$result" = "$2" ] && [ "$elapsed" -ge "$3" ] && [ "$elapsed" -le "$4" ]; then
        echo "ok   $1: $result after ${elapsed}s"
    else
        echo "FAIL $1: $result after ${elapsed}s (expected $2 in $3-$4 s)"
        FAILURES=$((FAILURES + 1))
    fi
}

expect npm_late found 120 180       # the #203 case: npm sees it after 2 min
expect registry_only found 0 3      # npm never does, the registry document does
expect npm_hangs found 14 20        # a hung npm leaves the registry its reserve
expect neither missing 178 184      # the last ask is at about 180 s
expect neither_hang missing 190 201 # slow asks: never past the 200 s deadline
expect slow_late found 180 201      # 12 s asks still get one in after 180 s
expect time_only missing 178 184    # an unpublished version keeps its time entry
expect curl_fails missing 178 184   # a failed fetch counts for nothing

# The registry request must bypass caches (the header and a fresh query) and
# ignore ~/.curlrc (-q, first).
if grep -q "^-q " "$WORK_DIR/registry_only.curl" \
    && grep -q "Cache-Control: no-cache" "$WORK_DIR/registry_only.curl" \
    && grep -q "registry.npmjs.org/@example%2fpkg?t=[0-9]" "$WORK_DIR/registry_only.curl"; then
    echo "ok   registry request is uncached"
else
    echo "FAIL registry request: $(cat "$WORK_DIR/registry_only.curl")"
    FAILURES=$((FAILURES + 1))
fi

[ "$FAILURES" -eq 0 ] && echo "all passed" || { echo "$FAILURES failed"; exit 1; }
