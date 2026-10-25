#!/bin/bash
# Starts a throw-away server (Postgres 54339, server 3998, CSP enforced, test admin admin@test.local / Passw0rd!) and leaves it running so pages can be
# opened in the browser pane and the console read for Content-Security-Policy violations. Stop it by ending the processes on ports 3998 and 54339.
REPO="$(git rev-parse --show-toplevel)"
SP="${TOOLBOX_SCRATCH:-$(mktemp -d)}"
cd "$REPO"
npm run build 2>&1 | grep -E "error|built in"; [ -f dist/index.js ] || { echo BUILD-FAILED; exit 1; }
rm -rf scripts/e2e-tmp && mkdir scripts/e2e-tmp
for f in 00-create-admin start-test-db; do sed -e 's/54329/54339/g' -e 's/3999/3998/g' "scripts/e2e/$f.mjs" > "scripts/e2e-tmp/$f.mjs"; done
export TEST_DB_DIR="$SP/pg-csp-$(date +%s)"
node scripts/e2e-tmp/start-test-db.mjs > "$SP/csp-db.log" 2>&1 &
until grep -q "PG READY" "$SP/csp-db.log" 2>/dev/null; do sleep 2; done
export DATABASE_URL=postgres://postgres:pw@127.0.0.1:54339/reborn
npx drizzle-kit push --force > "$SP/csp-push.log" 2>&1
RATE_LIMIT_OFF=1 SESSION_SECRET=test-secret-for-csp-0123456789 PORT=3998 NODE_ENV=production node dist/index.js > "$SP/csp-server.log" 2>&1 &
until curl -s -o /dev/null http://127.0.0.1:3998/api/v1/tenant/resolve; do sleep 2; done
node scripts/e2e-tmp/00-create-admin.mjs
echo "SERVER READY"
wait
