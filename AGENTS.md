# Repository agent instructions

Read `CLAUDE.md` for project structure, asset conventions and game-specific notes.

## Default Git workflow

The user has explicitly requested that completed changes in this repository be
committed to `main` and pushed to `origin/main` by default, as the usual workflow.
This includes publishing the commits and the GitHub Pages deployment triggered
by that push. Do not ask for routine confirmation again unless the user requests
local-only work or a tool requires additional approval.

- Finish authorized work, run appropriate checks, commit on `main`, and push to
  `origin/main`. A local commit alone does not finish the usual workflow.
- Stage only files belonging to the current task; preserve unrelated working
  changes. Never force-push or discard other work to complete a push.
- If remote `main` advances, fetch and integrate it safely before retrying.
- If HTTPS credentials are unavailable, an equivalent SSH URL for the same
  GitHub owner/repository may be used. Keep the configured remote unchanged.
- Confirm that the push succeeded before reporting the work as published.
  If authentication or approval prevents the push, report the local commit IDs
  and the specific blocker.
