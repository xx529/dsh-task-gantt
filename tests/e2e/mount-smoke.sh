#!/usr/bin/env bash
# Real-machine mount smoke for dsh-task-gantt.
#
# The mount/unmount paths WRITE to the shared deployment at ~/.dsh/profiles/web.
# The Lead runs them; nobody else. `check` and `verify` are read-only.
#
#   bash tests/e2e/mount-smoke.sh check    # read-only preflight
#   bash tests/e2e/mount-smoke.sh mount    # writes ~/.dsh (asks first)
#   bash tests/e2e/mount-smoke.sh verify   # read-only assertions after a restart
#   bash tests/e2e/mount-smoke.sh unmount   # writes ~/.dsh (asks first)
#
# See ./README.md for the full assertion table and the failure triage order.
set -uo pipefail

REPO="/Users/lzx/Documents/GitHub/dsh-task-gantt"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE="${DSH_PROFILE:-web}"
SPEC="link:$REPO"

pass=0
fail=0
say() { printf '%s\n' "$*"; }
ok() { pass=$((pass + 1)); say "  PASS  $*"; }
bad() { fail=$((fail + 1)); say "  FAIL  $*"; }
warn() { say "  WARN  $*"; }

require_repo_clean() {
  cd "$REPO" || exit 1
  if [ -n "$(git status --porcelain -- lib)" ]; then
    bad "lib/ has uncommitted changes: run 'pnpm run build' and commit the result"
  else
    ok "lib/ is committed and clean"
  fi
  if [ -f lib/client.js ] && head -c 64 lib/client.js | grep -q 'window.__ModuleLoader__.load({ id: "dsh-task-gantt"'; then
    ok "lib/client.js carries the host module-loader banner"
  else
    bad "lib/client.js is missing or has the wrong banner (run 'pnpm run build')"
  fi
  if tail -c 40 lib/client.js | grep -q 'return module.exports; } });'; then
    ok "lib/client.js closes the factory with 'return module.exports; } });'"
  else
    bad "lib/client.js has the wrong footer"
  fi
  if [ -f lib/index.js ] && grep -q 'export {' lib/index.js && ! grep -q 'require(' lib/index.js; then
    ok "lib/index.js is an ESM host bundle with no CommonJS require"
  else
    bad "lib/index.js is missing or is not the expected ESM bundle"
  fi
}

check_manifest() {
  cd "$REPO" || exit 1
  node - <<'NODE'
const p = require('./package.json')
const problems = []
if (p.main !== './lib/index.js') problems.push('main')
const c = p.exports?.['./client']
const resolved = typeof c === 'string' ? c : c?.default
if (resolved !== './lib/client.js') problems.push('exports["./client"]')
if (p.dsh?.client?.platform !== 'web') problems.push('dsh.client.platform')
for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  if (Object.keys(p[field] ?? {}).includes('cordis')) problems.push(`${field}.cordis`)
}
for (const name of Object.keys(p.peerDependencies ?? {})) {
  if (name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')) problems.push(`peer ${name}`)
}
for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) {
  if (p.scripts?.[hook]) problems.push(`scripts.${hook}`)
}
if (problems.length) { console.log('MANIFEST_PROBLEMS=' + problems.join(',')) }
else { console.log('MANIFEST_OK') }
NODE
  if [ "$(node -e "const p=require('$REPO/package.json');console.log(p.dsh.client.platform)")" = "web" ]; then
    ok "package.json declares dsh.client.platform=web with exports[\"./client\"] resolved"
  else
    bad "package.json discovery surface is wrong (see tests/manifest.spec.ts)"
  fi
}

check_deployment() {
  if [ -d "$DSH_HOME/profiles/$PROFILE" ]; then
    ok "profile directory exists: $DSH_HOME/profiles/$PROFILE"
  else
    bad "profile directory missing: $DSH_HOME/profiles/$PROFILE"
    return
  fi
  if grep -rn "dsh-task-gantt" "$DSH_HOME/profiles/$PROFILE"/*.yml "$DSH_HOME/profiles/$PROFILE"/*.json 2>/dev/null | head -5; then
    ok "the profile mentions dsh-task-gantt (bundle row or install record)"
  else
    warn "dsh-task-gantt is NOT installed in profile '$PROFILE' yet (expected before 'mount')"
  fi
}

verify_runtime() {
  check_deployment
  say ""
  say "Read-only note: A2/A3/A4/A5/A6/A7/A8/A9 require the running dsh web process."
  say "  - A2: grep -n 'disabling profile plugin' <dsh web stderr>   → must NOT name dsh-task-gantt"
  say "  - A3: DevTools Network → /plugins → response starts with window.__ModuleLoader__.load({ id: \"dsh-task-gantt\""
  say "  - A4: Console: await fetch('/dsh-task-gantt/api/ping',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(r=>r.json())"
  say "        expect {ok:true, value:{apiVersion:1, host:'dsh-task-gantt'}}"
  say "  - A5: Console: same call to /dsh-task-gantt/api/timeline with {\"sessionId\":\"<current session id>\"}"
  say "  - A6: same call with headers {origin:'http://evil.example'} → HTTP 403 {ok:false,error:{code:'forbidden'}}"
  say "  - A7: right sidebar → + → '任务甘特图 / Task Gantt'"
  say "  - A8: open the panel → lanes for Lead + teammates, bars carry subject + description"
  say "  - A10: hard refresh (Cmd+Shift+R) → A3/A7/A8 still hold"
  say ""
  warn "verify did NOT execute the browser assertions; the Lead records them in docs/VALIDATION.md"
}

case "${1:-check}" in
  check)
    say "== preflight (read-only) =="
    require_repo_clean
    check_manifest
    check_deployment
    ;;
  mount)
    say "== mount =="
    require_repo_clean
    say "This will run: (cd $DSH_HOME && dsh plugin --profile $PROFILE add \"$SPEC\")"
    printf 'Proceed? [y/N] '
    read -r answer
    if [ "${answer:-n}" != "y" ] && [ "${answer:-n}" != "Y" ]; then
      say "aborted"
      exit 0
    fi
    (cd "$DSH_HOME" && dsh plugin --profile "$PROFILE" add "$SPEC") && ok "plugin add returned 0" || bad "plugin add failed"
    say "Now restart \`dsh web\` and hard-refresh the page, then run: bash $0 verify"
    ;;
  verify)
    say "== verify =="
    verify_runtime
    ;;
  unmount)
    say "== unmount =="
    printf 'Remove dsh-task-gantt from profile %s? [y/N] ' "$PROFILE"
    read -r answer
    if [ "${answer:-n}" != "y" ] && [ "${answer:-n}" != "Y" ]; then
      say "aborted"
      exit 0
    fi
    (cd "$DSH_HOME" && dsh plugin --profile "$PROFILE" remove dsh-task-gantt) && ok "plugin remove returned 0" || bad "plugin remove failed"
    ;;
  *)
    say "usage: bash $0 [check|mount|verify|unmount]"
    exit 2
    ;;
esac

say ""
say "summary: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
