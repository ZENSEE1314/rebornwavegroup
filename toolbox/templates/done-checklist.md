# Done checklist for an app task

Fill this in before showing the owner anything (master playbook section 8, rule T11). For every line write **Yes**, **No** or **N/A**, and the evidence (a command output, a file, a screen). A task is **done only when there is no "No"**. If something is "No", say so in the report instead of calling it done.

- **Task:**   **Date:**   **Who filled it in:**

## A. Understood
| # | Item | How to check | Y / N / N/A | Evidence |
|---|---|---|---|---|
| D1 | The owner's words, my reading of them and who is affected are written down | `change-request.md` filled in | | |
| D2 | The cause was found in the real data (read-only), not guessed; what cannot be fixed from here is named | The query or screen and what it showed | | |

## B. Built
| # | Item | How to check | Y / N / N/A | Evidence |
|---|---|---|---|---|
| D3 | The smallest change that fixes the cause, built for every company (no `public.`, no `platformDb` in member code, caches keyed by company) | Read the diff; the approval script's query rules | | |
| D4 | Every visible text exists in English, 中文 and Bahasa Indonesia | Approval script "New texts" check | | |
| D5 | Money is right: one booking per event, a refund reverses everything the sale did, free units earn nothing, per-item ticks respected | The end-to-end script's money and refund checks | | |
| D6 | Safe: login or role guard on every new route, acts for the logged-in user, no secrets in the change, saved keys read with `secret(NAME)` | Approval script; `route-probe.sh` after a route change (T5) | | |

## C. Proven
| # | Item | How to check | Y / N / N/A | Evidence |
|---|---|---|---|---|
| D7 | A unit test covers the rule and passes | `npx tsx --test <file>` | | |
| D8 | An end-to-end script covers the flow, including the refusals (wrong role, wrong person, empty input) | `scripts/e2e/<name>.mjs` | | |
| D9 | The whole suite passes: build, all unit tests, the end-to-end scripts, the rate-limit run | `bash toolbox/scripts/run-tests.sh` ends with `E2E-DONE` and no FAIL (T2) | | |
| D10 | A visual change was looked at on screen (browser pane, phone size when it matters), or the report says it was not | Screenshot or console read | | |

## D. Recorded
| # | Item | How to check | Y / N / N/A | Evidence |
|---|---|---|---|---|
| D11 | The note is in `CLAUDE.md` (and `SECURITY.md` for anything about safety) | Approval script "Note in CLAUDE.md" | | |
| D12 | Any new tool, script, template or doc is in `toolbox/`, listed in its README and in the master playbook, and the OneDrive copy is current | Approval script "Toolbox is whole (T10)"; `sync-toolbox.sh` | | |
| D13 | A new owner idea is in the idea log with its status | Master playbook section 5 / `idea-log.md` | | |

## E. Shipped
| # | Item | How to check | Y / N / N/A | Evidence |
|---|---|---|---|---|
| D14 | The approval script says APPROVED TO PUSH | `node toolbox/scripts/approve-change.mjs` (full, not `--quick`) (T1) | | |
| D15 | Built, committed with the trailer, pushed to `main` | `git log -1`, the push output | | |
| D16 | The PC copy runs the new build and answers | `update-pc-copy.ps1` prints `UP` (T3) | | |
| D17 | The live site runs it, or the report says the live deploy is unconfirmed | Railway status (needs `railway login`) or the live page | | |

## F. Reported
| # | Item | How to check | Y / N / N/A | Evidence |
|---|---|---|---|---|
| D18 | The report says what was wrong, what changed, where to find it, what was tested, what was **not** tested, the state, what only the owner can do, what is still open | `change-report.md` (T8) | | |
| D19 | Nothing in the report claims more than the evidence above shows ("works" only where it was run) | Read the report line by line against this table | | |

## Result
- **Done?** Yes only if no line is "No". Lines that are "No":
- **What I will tell the owner is not finished:**
