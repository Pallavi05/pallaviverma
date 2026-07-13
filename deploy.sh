#!/usr/bin/env bash
# Build, commit, and push the site to github.com/Pallavi05/pallaviverma.
#
# Usage:
#   ./deploy.sh                    # commit message defaults to the date
#   ./deploy.sh "added new work"   # custom commit message
#
# When git asks for a password, paste a GitHub Personal Access Token
# for the Pallavi05 account (the same fine-grained token used by the
# admin page works: Contents → Read and write on this repository).
set -euo pipefail
cd "$(dirname "$0")"

REPO_URL="https://Pallavi05@github.com/Pallavi05/pallaviverma.git"
MSG="${1:-Update site $(date '+%Y-%m-%d %H:%M')}"

if [ ! -d .git ]; then
  git init -b main
fi

# Commit as Pallavi, not whatever identity this machine is configured with.
git config user.name "Pallavi Verma"
git config user.email "Pallavi05@users.noreply.github.com"

git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "$REPO_URL" || git remote add origin "$REPO_URL"

# 1. Commit whatever changed locally.
git add -A
if git diff --cached --quiet && [ -n "$(git rev-list -n1 --all 2>/dev/null)" ]; then
  echo "No local changes to commit."
else
  git commit -m "$MSG"
fi

# 2. Bring down edits made through the online editor (and the rebuild bot).
#    If the same line changed in both places, the online edit wins — the
#    generated pages get rebuilt from scratch right after anyway.
if git -c credential.helper= fetch origin main 2>/dev/null; then
  git merge -X theirs --no-edit origin/main
fi

# 3. Rebuild the pages from the merged content.
node scripts/build.mjs
git add -A
git diff --cached --quiet || git commit -m "Rebuild site"

# 4. Push. credential.helper= turns off the macOS keychain for this push,
#    so git prompts for the Pallavi05 login instead of reusing the other
#    GitHub account already saved on this machine.
git -c credential.helper= push -u origin main

echo
echo "Pushed. Live in a minute or two at:"
echo "  https://pallavi05.github.io/pallaviverma/"
echo "  https://pallavi05.github.io/pallaviverma/admin/"
