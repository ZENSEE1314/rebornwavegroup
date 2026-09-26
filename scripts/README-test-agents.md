# BridgeX test agents

Two simulated actors that drive the real HTTP API and report pass/fail per function.
Built to be run by hand — **not** wired into the build or CI.

- **admin agent** — creates a company (via industry preset), sets modules, white-label,
  branch, position, staff, meeting, shift, leave approve, and reads attendance /
  leaderboard / feedback / POS.
- **user agent** — registers a member, logs in, reads profile + a few member endpoints.

## Run

Prefer a **local server on the dev DB**, not production (it creates rows it can't auto-delete).

```bash
# 1) start the server locally (dev DB) in one terminal, then:
node scripts/bridgex-test-agents.mjs \
  --base http://localhost:5000 \
  --admin-email you@example.com --admin-pass 'yourpassword' \
  --json scripts/last-report.json
```

Flags: `--base`, `--admin-email`, `--admin-pass`, `--only admin|user`, `--json <file>`, `--keep`.

Without admin credentials it still checks the public meta endpoints and the whole user-agent flow.

## Notes

- Everything it creates is prefixed `ZZTEST<timestamp>` so test rows are easy to find/remove.
- Exit code is non-zero if any hard assertion fails (CI-friendly).
- As new modules ship (inventory, CRM, restaurant, etc.) add steps to the matching agent.
