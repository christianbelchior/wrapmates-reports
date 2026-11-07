# WrapMates Reports

Desktop app (Electron) that shows the WrapMates live report pages for Mark, Christian and Alessandro, with per-person PIN, its own Claude sign-in per person, and automatic updates from this repo's GitHub releases.

## Release a new version
1. Change the code, bump `version` in `package.json`.
2. Commit, then tag and push: `git tag v1.5.1 && git push origin main --tags`.
3. GitHub Actions builds the Windows installer and publishes the release; every installed app updates itself.

## 1.5.0
- Side panel can be collapsed to a thin bar (button at the top); the choice is remembered. Starts collapsed.

## 1.6.0
- "Needs action" dropdown in the side panel: lists the clients in the open report that need something from us, most urgent first (new enquiries, waiting too long, overdue/urgent flags, waiting on us, design needed, promises). Clicking a client opens their card. Done or snoozed clients are left out; the list re-checks every minute and after every reload. In the collapsed panel it shows as a warning icon with the count.

## 1.6.1
- "Needs action" list: each client now has a tick button. It marks the client Done in the report (the same shared Done the card's button uses, for Mark, Christian and Alessandro), so they leave the list and only come back when the client sends a new message. An Undo link shows for 10 seconds.

## 1.6.2
- **Back** now goes one step back inside the report instead of jumping to the home menu: photo → client card → section → menu. Only when there is nothing left to close does it go back to the previous page.
- Photos and files opened from the report open in their own window (Esc closes it), so the report stays exactly where it was.
- After Back, **Reload now** or the hourly refresh, the report reopens where you were: the same section, search, client card, tab and scroll position.
