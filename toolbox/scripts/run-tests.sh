#!/bin/bash
# Build, unit tests, then the end-to-end scripts on a throw-away Postgres (54339) and servers (3998, 3997 for the rate-limit run).
# Never touches the live database or ports 54329 / 3999. Run from the working copy (git worktree) in Git Bash.
#
#   bash toolbox/scripts/run-tests.sh                     default set of end-to-end scripts
#   bash toolbox/scripts/run-tests.sh item-commission     only the named scripts (names in scripts/e2e without .mjs)
#
# Output ends with E2E-DONE. Read the log for FAIL lines; "ALL PASSED" is printed once per script.
REPO="$(git rev-parse --show-toplevel)"
SP="${TOOLBOX_SCRATCH:-$(mktemp -d)}"
cd "$REPO" || exit 1
DEFAULT_SCRIPTS="costs-expenses receipt-staff tax-fee-change referral-discount admin-secret webhook-signature saved-keys happy-days happy-hour-bulk happy-hour-deal item-commission"
SCRIPTS="${*:-$DEFAULT_SCRIPTS}"

echo "== build"; npm run build 2>&1 | grep -E "ERROR|error TS|built in"
[ -f dist/index.js ] || { echo BUILD-FAILED; echo E2E-DONE; exit 1; }

echo "== unit tests"
TESTS=$(find server shared venue client/src mobile -name "*.test.ts" -not -path "*/node_modules/*" 2>/dev/null | tr '\n' ' ')
npx tsx --test $TESTS 2>&1 | grep -E "ℹ (pass|fail)|✖"

npm i --no-save embedded-postgres > /dev/null 2>&1
rm -rf scripts/e2e-tmp && mkdir scripts/e2e-tmp
for f in 00-create-admin start-test-db $SCRIPTS; do
  [ -f "scripts/e2e/$f.mjs" ] && sed -e 's/54329/54339/g' -e 's/3999/3998/g' "scripts/e2e/$f.mjs" > "scripts/e2e-tmp/$f.mjs"
done
sed -e 's/3999/3997/g' scripts/e2e/rate-limit.mjs > scripts/e2e-tmp/rate-limit.mjs

export TEST_DB_DIR="$SP/pg-$(date +%s)"
node scripts/e2e-tmp/start-test-db.mjs > "$SP/e2e-db.log" 2>&1 &
until grep -q "PG READY" "$SP/e2e-db.log" 2>/dev/null; do sleep 2; done
export DATABASE_URL=postgres://postgres:pw@127.0.0.1:54339/reborn
npx drizzle-kit push --force > "$SP/e2e-push.log" 2>&1

META_APP_SECRET=e2e-meta-secret RATE_LIMIT_OFF=1 SESSION_SECRET=test-secret-for-e2e-0123456789 PORT=3998 NODE_ENV=production node dist/index.js > "$SP/e2e-server.log" 2>&1 &
SRVPID=$!
until curl -s -o /dev/null http://127.0.0.1:3998/api/v1/tenant/resolve; do sleep 2; done
node scripts/e2e-tmp/00-create-admin.mjs > /dev/null
for t in $SCRIPTS; do echo "== $t"; node "scripts/e2e-tmp/$t.mjs"; done

# The rate limits run on their own server, started without RATE_LIMIT_OFF.
SESSION_SECRET=test-secret-for-e2e-0123456789 PORT=3997 NODE_ENV=production node dist/index.js > "$SP/e2e-server2.log" 2>&1 &
SRV2=$!
until curl -s -o /dev/null http://127.0.0.1:3997/api/v1/tenant/resolve; do sleep 2; done
echo "== rate-limit"; node scripts/e2e-tmp/rate-limit.mjs

kill $SRVPID $SRV2 2>/dev/null
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 54339 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }"
rm -rf scripts/e2e-tmp
echo "logs: $SP"
echo E2E-DONE
