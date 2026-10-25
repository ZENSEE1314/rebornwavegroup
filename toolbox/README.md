# Toolbox

Everything that belongs to the playbook, in one folder. The master playbook (`playbooks/MASTER-PLAYBOOK.md`, section 6 "Toolbox rules") says when each item must be used. This folder is the source; `toolbox/scripts/sync-toolbox.sh` keeps a copy in `OneDrive\Documents\Reborn-Wave-Toolbox`.

Run every script from the working copy (the git worktree), never from the main repo folder `reborn-hero`. Tests use spare ports only (Postgres 54339, servers 3998 / 3997).

## playbooks/ (read)
| File | What it is |
|---|---|
| `MASTER-PLAYBOOK.md` | The one playbook: task, goal, steps, every function, owner ideas, rules, runbooks, done, open items |
| `PLAYBOOK.md` | The change process and the October 2026 work in detail |
| `POS-PLAYBOOK.md` | The POS from opening the day to closing it |
| `BRIDGEX-PLAYBOOK.md` | BridgeX: companies, isolation, onboarding |

## scripts/ (run)
| File | Use it to | Rule that requires it |
|---|---|---|
| `approve-change.mjs` | Check a change against the playbook rules before a push (APPROVED TO PUSH / NOT APPROVED; `--quick`, `--report file`) | T1 |
| `approve-change.test.mjs` | Tests of the approval script itself: `node --test toolbox/scripts/approve-change.test.mjs` | T1 |
| `error-watch.mjs` | Read-only watch of NEW errors: sorts noise / watch / infra / owner / actionable and writes a brief; exit 10 = something to fix | T12 |
| `error-watch.test.mjs` | Tests of the error-watch sorting: `node --test toolbox/scripts/error-watch.test.mjs` | T12 |
| `run-tests.sh` | Build, unit tests and end-to-end scripts on spare ports | T2 |
| `update-pc-copy.ps1` | Put the new build on the PC copy and wait until it answers (`-WithModules` after dependency changes) | T3 |
| `errors-report.mjs` | Read-only report of POS and system errors grouped by path and message | T4 |
| `route-probe.sh` + `probe.cjs` | Call every route without a login to find a missing guard | T5 |
| `csp-check-server.sh` | Throw-away server to check pages in the browser for Content-Security-Policy violations | T6 |
| `backup-test.sh` | Prove dump, encrypt, restore and compare; wrong passphrase and changed file refused | T7 |
| `backup/` (`backup.mjs`, `restore.mjs`, `backup-format.mjs`, `setup-nightly.ps1`) | Snapshot of the nightly backup tools; the source of truth is `scripts/backup/` in the repo | T7 |
| `sync-toolbox.sh` | Copy the toolbox to OneDrive | T10 |

## templates/ (copy and fill in)
| File | Use it for | Rule |
|---|---|---|
| `change-request.md` | Writing down what the owner asked, what the data says, the cause | T8 |
| `change-report.md` | The report sent to the owner when a change ships | T8 |
| `commit-message.template.txt` | The commit message with the required trailer | T1 |
| `unit-test.template.ts` | A new unit test | T2 |
| `e2e-test.template.mjs` | A new end-to-end script | T2 |
| `item-setup.md` | A new item, bundle or package (price, ticks, happy hour, commission) | T9 |
| `new-company.md` | A new BridgeX company | T9 |
| `end-of-night.md` | Closing the venue day | T9 |
| `incident.md` | A leak, outage, wrong money or data crossing companies | T9 |
| `idea-log.md` | Recording every owner idea with its status | T9 |
| `error-watch-agent-prompt.md` | The prompt of the scheduled error-watch agent (to re-create or change the task) | T12 |
| `done-checklist.md` | Checking your own work (D1 to D19) before showing anything | T11 |

## docs/ (reference)
| File | What it is |
|---|---|
| `owner-actions.md` | What only the owner can do (backup setup, `railway login`, rotating keys, settings to choose) |
| `SECURITY.md` | Hardening, rotation order after a leak, routine |
| `CLAUDE-notes-snapshot.md` | Snapshot of the project notes (the live file is `CLAUDE.md` in the repo) |
| `RENDER_STANDBY.md` | The Render standby (built, not in use) |
| `BRIDGEXPOS_ARCHITECTURE.md` | BridgeXPOS architecture notes |
| `e2e-README.md` | How the end-to-end scripts are run |
| `venue-README.md` | The venue server (the app on a PC) |

## Not saved here on purpose
- One-off patch scripts used to edit files while building features (they are in the git history as the changes they made).
- Anything holding a password, token or the database address. The live database address stays only in `C:\RebornStandby\database-url.txt`.
