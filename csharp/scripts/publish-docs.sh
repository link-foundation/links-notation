#!/bin/bash
# Builds the DocFX site and publishes it to the gh-pages branch of this repository
# under /csharp. Run from the csharp/ directory.
#
# Required environment:
#   GITHUB_TOKEN       token with contents:write on this repository
#   GITHUB_REPOSITORY  owner/name (provided by GitHub Actions)
set -e

TARGET_BRANCH="gh-pages"
SHA=$(git rev-parse --verify HEAD)
REPOSITORY="github.com/${GITHUB_REPOSITORY}"

docfx docfx.json

# The PDF is produced by a separate job and downloaded as an artifact.
if [ -f pdf-artifact/Link.Foundation.Links.Notation.pdf ]; then
  cp -v pdf-artifact/Link.Foundation.Links.Notation.pdf _site/
else
  echo "::warning::PDF artifact not found, publishing documentation without it"
fi

# Clone the existing gh-pages, or start it empty on the very first deploy.
git clone "https://${REPOSITORY}" out
(cd out && (git checkout "$TARGET_BRANCH" || git checkout --orphan "$TARGET_BRANCH"))

mkdir -p out/csharp
rm -rf out/csharp/*
cp -r _site/* out/csharp/
# DocFX names the landing page after the source file, GitHub Pages wants index.html.
cp out/csharp/README.html out/csharp/index.html

cd out
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add --all
if git diff --cached --quiet; then
  echo "Documentation is already up to date, nothing to publish"
else
  git commit -m "Deploy to GitHub Pages: $SHA"
  git push "https://x-access-token:${GITHUB_TOKEN}@${REPOSITORY}.git" "$TARGET_BRANCH"
fi
cd ..

rm -rf out
