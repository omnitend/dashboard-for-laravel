#!/usr/bin/env bash
# Run the browser suite (or the test files given) in CI's browser: Linux
# Chromium, from Playwright's Docker image, driven by this machine's vitest.
# Linux lays text out differently from macOS (each glyph's advance is
# rounded per font size, so text width grows in steps rather than in
# proportion to the size), which hid CI-only failures in measurement-driven
# code such as DXStatCard's value fit. Needs Docker.
#
#   npm run test:linux -- tests/components/DXStatCard-Fit.test.ts
#
# Build first (`npm run build:lib`), as for `npm run test:headless`.
set -euo pipefail

cd "$(dirname "$0")/.."
version="$(node -p "require('playwright-core/package.json').version")"
port="${DX_LINUX_BROWSER_PORT:-3555}"
container="dfl-linux-browser-$$"

docker run -d --rm --name "$container" --init --ipc=host \
  -p "127.0.0.1:${port}:${port}" \
  "mcr.microsoft.com/playwright:v${version}-noble" \
  /bin/sh -c "npx -y playwright@${version} run-server --port ${port} --host 0.0.0.0" > /dev/null
trap 'docker stop "$container" > /dev/null 2>&1 || true' EXIT

# The server prints its endpoint once it listens.
for _ in $(seq 1 120); do
  if docker logs "$container" 2>&1 | grep -q "Listening on"; then break; fi
  sleep 1
done
docker logs "$container" 2>&1 | grep -q "Listening on" || {
  echo "Playwright server did not start:" >&2
  docker logs "$container" >&2
  exit 1
}

DX_PLAYWRIGHT_WS_ENDPOINT="ws://127.0.0.1:${port}/" npx vitest --run --browser.headless "$@"
