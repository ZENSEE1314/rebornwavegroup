#!/bin/bash
# Builds, starts a throw-away server and calls every route WITHOUT logging in; lists routes that answer with data instead of "log in" (a missing guard).
REPO="$(git rev-parse --show-toplevel)"
SP="${TOOLBOX_SCRATCH:-$(mktemp -d)}"
cd "$REPO"
echo "== build"; npm run build 2>&1 | grep -E "error|built in|Done"; [ -f dist/index.js ] || { echo BUILD-FAILED; echo PROBE-DONE; exit 1; }
rm -rf scripts/e2e-tmp && mkdir scripts/e2e-tmp
for f in 00-create-admin start-test-db; do sed -e 's/54329/54339/g' -e 's/3999/3998/g' "scripts/e2e/$f.mjs" > "scripts/e2e-tmp/$f.mjs"; done
export TEST_DB_DIR="$SP/pg5-$(date +%s)"
node scripts/e2e-tmp/start-test-db.mjs > "$SP/e2e-db.log" 2>&1 &
until grep -q "PG READY" "$SP/e2e-db.log" 2>/dev/null; do sleep 2; done
export DATABASE_URL=postgres://postgres:pw@127.0.0.1:54339/reborn
npx drizzle-kit push --force > "$SP/e2e-push.log" 2>&1
RATE_LIMIT_OFF=1 SESSION_SECRET=test-secret-for-e2e-0123456789 PORT=3998 NODE_ENV=production node dist/index.js > "$SP/e2e-server.log" 2>&1 &
SRVPID=$!
until curl -s -o /dev/null http://127.0.0.1:3998/api/v1/tenant/resolve; do sleep 2; done
node scripts/e2e-tmp/00-create-admin.mjs > /dev/null
echo "== probe"
node "$REPO/toolbox/scripts/probe.cjs" "$REPO" http://127.0.0.1:3998
kill $SRVPID 2>/dev/null
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 54339 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }"
rm -rf scripts/e2e-tmp
echo PROBE-DONE
