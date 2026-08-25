#!/bin/bash

# Release Script for Dashboard for Laravel
#
# RESUMABLE BY DESIGN — if it stops half-way, run the SAME command again.
#
# This script does nine things, the irreversible ones last, and any stumble in
# the middle used to leave the version bumped and committed but nothing
# published. Re-running then died immediately at `npm version`, because the
# version already matched — so recovery meant doing the remaining steps by hand
# and knowing which those were. Both 0.39.1 and 0.40.0 wedged exactly this way
# (a denied SSH key prompt at the push). 0.39.1 was never published at all and
# nobody noticed for weeks, because the local repo said 0.40.0 was next.
#
# So every step below asks whether it has already happened and skips if so.
# Nothing here is destructive on a second run.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step()    { echo -e "\n${GREEN}==>${NC} $1"; }
print_skip()    { echo -e "\n${BLUE}==> [already done]${NC} $1"; }
print_error()   { echo -e "${RED}Error:${NC} $1" >&2; }
print_warning() { echo -e "${YELLOW}Warning:${NC} $1"; }

if [ -z "${1:-}" ]; then
    print_error "Version argument required"
    echo "Usage: npm run release <version>"
    echo "Example: npm run release 0.4.6"
    exit 1
fi

VERSION=$1
TAG="v${VERSION}"

if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
    print_error "'${VERSION}' is not a semver version (expected e.g. 0.41.0)"
    exit 1
fi

PACKAGE_NAME=$(node -p "require('./package.json').name")
# The registry directly, NOT `npm view` — the CLI caches, and a stale cache
# reporting the previous version after a successful publish is indistinguishable
# from a publish that failed. Seen on the 0.40.0 release.
REGISTRY_URL="https://registry.npmjs.org/${PACKAGE_NAME/\//%2F}"

# ---------------------------------------------------------------------------
# State — what is already true. Every one of these is a question the old script
# assumed the answer to.
# ---------------------------------------------------------------------------

pkg_version()         { node -p "require('./package.json').version"; }
tag_exists_locally()  { /usr/bin/git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null 2>&1; }
tag_exists_remotely() { [ -n "$(/usr/bin/git ls-remote --tags origin "refs/tags/${TAG}" 2>/dev/null)" ]; }
release_exists()      { gh release view "${TAG}" >/dev/null 2>&1; }
working_tree_clean()  { [ -z "$(/usr/bin/git status --porcelain)" ]; }

# Scoped to the two files the bump touches, NOT the whole tree. Whole-tree
# cleanliness is a proxy, and a wrong one: unrelated dirt during a resume would
# read as "bump not committed", sending step 5 into `git commit` with nothing
# staged — which fails, and under `set -e` kills the release.
version_files_dirty() { [ -n "$(/usr/bin/git status --porcelain -- package.json package-lock.json)" ]; }
bump_committed()      { [ "$(pkg_version)" = "$VERSION" ] && ! version_files_dirty; }

main_is_pushed() {
    local local_head remote_head
    local_head=$(/usr/bin/git rev-parse main)
    remote_head=$(/usr/bin/git rev-parse origin/main 2>/dev/null || echo none)
    [ "$local_head" = "$remote_head" ]
}

npm_has_version() {
    local body
    body=$(curl -fsS --max-time 20 "$REGISTRY_URL" 2>/dev/null) || return 1
    VERSION="$VERSION" node -e '
        let raw = "";
        process.stdin.on("data", d => raw += d).on("end", () => {
            try {
                const versions = JSON.parse(raw).versions || {};
                process.exit(versions[process.env.VERSION] ? 0 : 1);
            } catch { process.exit(1); }
        });
    ' <<< "$body"
}

# Release notes, in preference order:
#   1. the annotation on an existing tag — so a RESUME reuses exactly what was
#      tagged, and the tag and the GitHub release can never disagree;
#   2. this version's CHANGELOG section — the notes are already written there,
#      and requiring it catches the "shipped with no changelog entry" case that
#      lost 0.39.1's entry entirely;
#   3. typed in, if the CHANGELOG has no section for this version.
changelog_section() {
    awk -v header="## [${VERSION}]" '
        index($0, header) == 1 { found = 1; next }
        found && /^## \[/      { exit }
        found                  { print }
    ' CHANGELOG.md | sed -e '/./,$!d' | tac | sed -e '/./,$!d' | tac
}

tag_annotation() {
    /usr/bin/git tag -l --format='%(contents)' "${TAG}"
}

# ---------------------------------------------------------------------------
# Preflight — fail BEFORE mutating anything, not half-way through
# ---------------------------------------------------------------------------

print_step "Preflight checks..."

CURRENT_BRANCH=$(/usr/bin/git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_error "On branch '${CURRENT_BRANCH}' — releases are cut from main"
    exit 1
fi

if ! working_tree_clean && [ "$(pkg_version)" != "$VERSION" ]; then
    print_error "Working tree is dirty. Commit or stash before releasing:"
    /usr/bin/git status --short
    exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
    print_error "gh is not authenticated (needed for the GitHub release)"
    exit 1
fi

if ! npm whoami >/dev/null 2>&1; then
    print_error "npm is not authenticated (needed to publish). Run: npm login"
    exit 1
fi

if [ -z "$(changelog_section)" ] && ! tag_exists_locally; then
    print_error "CHANGELOG.md has no '## [${VERSION}]' section."
    echo "  Retitle '## [Unreleased]' to '## [${VERSION}] - $(date +%Y-%m-%d)'"
    echo "  and add a fresh empty '## [Unreleased]' above it, then re-run."
    echo "  (This is how 0.39.1 shipped with no changelog entry at all.)"
    exit 1
fi

# Report the plan against what is already true, so the confirmation reflects
# what will ACTUALLY happen on a resume rather than a fixed list of nine steps.
echo -e "\n${YELLOW}About to release ${PACKAGE_NAME}@${VERSION}${NC}"
echo ""
ALREADY_PUBLISHED=false
if npm_has_version; then
    ALREADY_PUBLISHED=true
    print_warning "${VERSION} is ALREADY on npm — this is a resume."
    echo "  A published version is immutable, so tests are skipped: they can no"
    echo "  longer change the artifact. Only the git/GitHub side will be fixed up."
    echo ""
fi

status_line() { if $2; then echo "  [done] $1"; else echo "  [todo] $1"; fi; }
status_line "Tests + typecheck"              "$ALREADY_PUBLISHED"
status_line "package.json at ${VERSION}"     "$([ "$(pkg_version)" = "$VERSION" ] && echo true || echo false)"
status_line "Version bump committed"         "$(bump_committed && echo true || echo false)"
status_line "Tag ${TAG} created"             "$(tag_exists_locally && echo true || echo false)"
status_line "main + tag pushed"              "$(main_is_pushed && tag_exists_remotely && echo true || echo false)"
status_line "GitHub release"                 "$(release_exists && echo true || echo false)"
status_line "Published to npm"               "$ALREADY_PUBLISHED"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 1
fi

# ---------------------------------------------------------------------------
# Step 1-2: Build, test, typecheck
# ---------------------------------------------------------------------------

if $ALREADY_PUBLISHED; then
    print_skip "Tests and typecheck (${VERSION} is already published — the artifact is immutable)"
else
    # The explicit build:lib matters: with `ignore-scripts=true` in ~/.npmrc
    # (supply-chain hardening), npm SKIPS the `pretest:headless` hook, so
    # without it the bundle-guard tests (icon font, chart/axios optional peers,
    # scoped-deep) would certify whatever stale dist/ is on disk — typically the
    # PREVIOUS release's bundle.
    print_step "Building library for tests..."
    npm run build:lib

    print_step "Running tests..."
    npm run test:headless

    print_step "Running TypeScript checks..."
    npm run typecheck
fi

# ---------------------------------------------------------------------------
# Step 3-4: Version bump + build
# ---------------------------------------------------------------------------

if [ "$(pkg_version)" = "$VERSION" ]; then
    print_skip "package.json is already at ${VERSION}"
else
    print_step "Updating package.json to version ${VERSION}..."
    npm version "$VERSION" --no-git-tag-version
fi

if $ALREADY_PUBLISHED; then
    print_skip "Build + AI docs (nothing left to publish)"
else
    print_step "Building package..."
    npm run build

    # llms.txt / api-reference.json / docs-map.md are gitignored but listed in
    # package.json "files", so npm publish ships whatever copy sits on disk —
    # without this a stale local copy (built from old component docstrings)
    # publishes silently.
    print_step "Regenerating AI docs..."
    npm run docs:generate:ai
fi

# ---------------------------------------------------------------------------
# Step 5: Commit the bump
# ---------------------------------------------------------------------------

if bump_committed; then
    print_skip "Version bump already committed"
else
    # `npm version` writes the new version into package-lock.json too. Stage
    # BOTH, or the lock keeps the previous version and drifts a little further
    # every release — it sat at 0.34.0 while package.json read 0.39.1.
    print_step "Committing version bump..."
    /usr/bin/git add package.json package-lock.json
    /usr/bin/git commit -m "Bump version to ${VERSION}"
fi

# ---------------------------------------------------------------------------
# Step 6: Tag (carrying the release notes)
# ---------------------------------------------------------------------------

if tag_exists_locally; then
    print_skip "Tag ${TAG} already exists"
    RELEASE_NOTES=$(tag_annotation)
else
    RELEASE_NOTES=$(changelog_section)
    if [ -n "$RELEASE_NOTES" ]; then
        print_step "Release notes taken from CHANGELOG.md '## [${VERSION}]'"
        echo "---"
        echo "$RELEASE_NOTES"
        echo "---"
    else
        print_step "Enter release notes"
        echo -e "${YELLOW}Type or paste, then press Ctrl+D on a blank line to finish.${NC}"
        echo -e "${YELLOW}(Enter alone just adds a newline — it will look like nothing happened.)${NC}"
        RELEASE_NOTES=$(cat)
    fi

    if [ -z "$RELEASE_NOTES" ]; then
        print_error "Release notes are empty — refusing to tag"
        exit 1
    fi

    print_step "Creating git tag ${TAG}..."
    /usr/bin/git tag -a "$TAG" -m "$RELEASE_NOTES"
fi

# ---------------------------------------------------------------------------
# Step 7: Push
# ---------------------------------------------------------------------------

if main_is_pushed && tag_exists_remotely; then
    print_skip "main and ${TAG} are already on origin"
else
    print_step "Pushing to GitHub..."
    # Pushed separately and explicitly: `--tags` alongside a branch means one
    # refusal (a denied SSH key prompt) takes BOTH down, and the tag silently
    # not arriving is what wedged 0.39.1 and 0.40.0.
    if ! main_is_pushed; then
        /usr/bin/git push origin main
    fi
    if ! tag_exists_remotely; then
        /usr/bin/git push origin "$TAG"
    fi
fi

# ---------------------------------------------------------------------------
# Step 8: GitHub release
# ---------------------------------------------------------------------------

if release_exists; then
    print_skip "GitHub release ${TAG} already exists"
else
    print_step "Creating GitHub release..."
    gh release create "$TAG" --title "$TAG" --notes "$RELEASE_NOTES"
fi

# ---------------------------------------------------------------------------
# Step 9: npm publish
# ---------------------------------------------------------------------------

if $ALREADY_PUBLISHED; then
    print_skip "${PACKAGE_NAME}@${VERSION} is already on npm"
else
    print_step "Publishing to NPM..."
    npm publish
fi

# ---------------------------------------------------------------------------
# Verify — assert the artifacts EXIST rather than trusting the exit codes above.
# A release that half-happened must not print a success banner.
# ---------------------------------------------------------------------------

print_step "Verifying the release..."
FAILED=false
check() {
    if $2; then
        echo -e "  ${GREEN}✓${NC} $1"
    else
        echo -e "  ${RED}✗${NC} $1"
        FAILED=true
    fi
}

# npm's registry is read through a CDN, so a just-published version can take a
# moment to appear. Retry rather than reporting a false failure.
NPM_OK=false
for _ in 1 2 3 4 5 6; do
    if npm_has_version; then NPM_OK=true; break; fi
    sleep 5
done

check "npm has ${PACKAGE_NAME}@${VERSION}" "$NPM_OK"
check "tag ${TAG} on origin"               "$(tag_exists_remotely && echo true || echo false)"
check "main pushed"                        "$(main_is_pushed && echo true || echo false)"
check "GitHub release ${TAG}"              "$(release_exists && echo true || echo false)"

if $FAILED; then
    echo ""
    print_error "Release ${VERSION} is INCOMPLETE — see the ✗ above."
    echo "Re-run the same command to finish it; completed steps will be skipped:"
    echo "  npm run release ${VERSION}"
    exit 1
fi

print_step "✅ Release ${VERSION} complete!"
echo ""
echo "Published:"
echo "  - NPM: ${PACKAGE_NAME}@${VERSION}"
echo "  - Git: ${TAG}"
echo "  - GitHub Release: https://github.com/omnitend/dashboard-for-laravel/releases/tag/${TAG}"
echo ""
