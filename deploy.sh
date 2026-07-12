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

node scripts/build.mjs

if [ ! -d .git ]; then
  git init -b main
fi

# Commit as Pallavi, not whatever identity this machine is configured with.
git config user.name "Pallavi Verma"
git config user.email "Pallavi05@users.noreply.github.com"

git add -A
if git diff --cached --quiet && [ -n "$(git rev-list -n1 --all 2>/dev/null)" ]; then
  echo "Nothing new to commit; pushing current state."
else
  git commit -m "$MSG"
fi

git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "$REPO_URL" || git remote add origin "$REPO_URL"

# credential.helper= turns off the macOS keychain for this one push,
# so git prompts for the Pallavi05 login instead of reusing the other
# GitHub account already saved on this machine.
git -c credential.helper= push -u origin main

echo
echo "Pushed. If Pages isn't enabled yet, do it once at:"
echo "  https://github.com/Pallavi05/pallaviverma/settings/pages"
echo "  → Source: Deploy from a branch → Branch: main / (root) → Save"
echo
echo "Live site: https://pallavi05.github.io/pallaviverma/"
echo "Admin:     https://pallavi05.github.io/pallaviverma/admin/"
