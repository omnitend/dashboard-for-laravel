#!/bin/bash

# Release Script for Dashboard for Laravel
# Handles version bumping, building, testing, and publishing

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "\n${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

# Check if version argument provided
if [ -z "$1" ]; then
    print_error "Version argument required"
    echo "Usage: npm run release <version>"
    echo "Example: npm run release 0.4.6"
    exit 1
fi

VERSION=$1

# Confirm version
echo -e "\n${YELLOW}About to release version ${VERSION}${NC}"
echo "This will:"
echo "  1. Run tests (headless)"
echo "  2. Run TypeScript checks"
echo "  3. Update package.json version"
echo "  4. Build package"
echo "  5. Commit changes"
echo "  6. Create git tag with release notes"
echo "  7. Push to GitHub"
echo "  8. Create GitHub release"
echo "  9. Publish to NPM"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 1
fi

# Step 1: Run tests
print_step "Running tests..."
npm run test:headless

# Step 2: TypeCheck
print_step "Running TypeScript checks..."
npm run typecheck

# Step 3: Update version in package.json
print_step "Updating package.json to version ${VERSION}..."
npm version $VERSION --no-git-tag-version

# Step 4: Build package
print_step "Building package..."
npm run build

# Step 5: Commit version bump
print_step "Committing version bump..."
/usr/bin/git add package.json
/usr/bin/git commit -m "Bump version to ${VERSION}"

# Step 6: Create git tag
print_step "Creating git tag v${VERSION}..."
echo "Enter release notes (press Ctrl+D when done):"
RELEASE_NOTES=$(cat)

/usr/bin/git tag -a "v${VERSION}" -m "${RELEASE_NOTES}"

# Step 7: Push to GitHub
print_step "Pushing to GitHub..."
/usr/bin/git push origin main --tags

# Step 8: Create GitHub Release
print_step "Creating GitHub release..."
gh release create "v${VERSION}" --title "v${VERSION}" --notes "${RELEASE_NOTES}"

# Step 9: Publish to NPM
print_step "Publishing to NPM..."
npm publish

print_step "✅ Release ${VERSION} complete!"
echo ""
echo "Published:"
echo "  - NPM: @omnitend/dashboard-for-laravel@${VERSION}"
echo "  - Git: v${VERSION}"
echo "  - GitHub Release: https://github.com/omnitend/dashboard-for-laravel/releases/tag/v${VERSION}"
echo ""
