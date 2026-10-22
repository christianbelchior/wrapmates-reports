# WrapMates Reports

Desktop app (Electron) that shows the WrapMates live report pages for Mark, Christian and Alessandro, with per-person PIN, its own Claude sign-in per person, and automatic updates from this repo's GitHub releases.

## Release a new version
1. Change the code, bump `version` in `package.json`.
2. Commit, then tag and push: `git tag v1.5.1 && git push origin main --tags`.
3. GitHub Actions builds the Windows installer and publishes the release; every installed app updates itself.

## 1.5.0
- Side panel can be collapsed to a thin bar (button at the top); the choice is remembered. Starts collapsed.
