# Catalog submission record

What was submitted to the plugin catalog, how it was validated, and what is
still gating it. Kept in the repository so the claim is checkable later.

## Entry

Target: [`awesome-dsh-plugin/awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
— one new file, `data/plugins/xx529__dsh-task-gantt.yml`:

```yaml
url: https://github.com/xx529/dsh-task-gantt
name: xx529/dsh-task-gantt
category: ui
description:
  en: Agent-team task Gantt chart for the DSH sidebar - one swimlane per teammate, real session-log time on the x-axis, and every shared task drawn with its title and summary.
  zh: DSH 侧边栏的 agent team 任务甘特图：每个 teammate 一条泳道，横轴取自真实会话日志时间，条内显示共享任务的标题与简介。
```

`en` is the only required description field; `zh` is filled in here rather than
left to a maintainer. Neither string contains `: `, so neither needs quoting
(`contributing.md` requires quotes only for that case).

## Validation (the catalogue's own checker, not a proxy)

Run against the real submission checker rather than by reading the rules:

```bash
git clone --depth 1 https://github.com/awesome-dsh-plugin/awesome-dsh-plugin /tmp/awesome-dsh-plugin-check
cd /tmp/awesome-dsh-plugin-check
# place data/plugins/xx529__dsh-task-gantt.yml, commit it, then:
GITHUB_TOKEN=$(gh auth token) node scripts/check-submission.mjs --base <base-branch-commit>
```

Result on 2026-10-11:

```
checking 1 entry
::error file=data/plugins/xx529__dsh-task-gantt.yml::https://github.com/xx529/dsh-task-gantt
  — repository is 0.0 days old (needs 1) — nothing to do: this check re-runs by
    itself and should clear in about 24h. No need to resubmit, push, or close
    and reopen; the age bar is the only thing failing here.
1 entry did not pass.
```

**The repository age is the only failing check**, and the checker states that it
clears on its own — no resubmission, no push, no reopen. Everything else it
verifies (entry shape, category, description rules, the ≤3-entries-per-PR bulk
rule) passed. Repository created `2026-10-10T17:37:09Z`, so the entry becomes
submittable at `2026-10-11T17:37:09Z`.

`MIN_AGE_DAYS = 1` and `MAX_ENTRIES_PER_PR = 3` are read from the checker's own
source (`scripts/check-submission.mjs`), not from prose.

## Repository prerequisites

| Requirement | State | Evidence |
|---|---|---|
| `package.json` declares `dsh.bundle` (the "only `dsh.client`" shape cannot be installed) | ✅ | `dsh.bundle.patch = ./cordis.patch.yml`; `pnpm run verify:build` |
| Real, usable code | ✅ | `lib/index.js` 40 502 B / `lib/client.js` 71 996 B, both bundles load (see `docs/VALIDATION.md`) |
| GitHub topic `dsh-plugin` | ✅ | `gh repo edit --add-topic dsh-plugin` → topics `['deepseek-harness','dsh','dsh-plugin','gantt']` |
| Repository public, not archived, not DSH itself | ✅ | `gh repo view --json isPrivate` → `false` |
| Repository ≥ 1 day old | ⏳ | clears `2026-10-11T17:37:09Z`, enforced by the checker itself |
| CI green on `main` | ⏳ | first run failed: `pnpm/action-setup` `version: 11` resolves to pnpm 11.28.5, which needs Node ≥ 22.13, so the node 20 matrix leg cannot install; being fixed |

Deliberately **not** submitted: `dsh.plugin.json`. It is not a DSH contract —
see `docs/INSTALL.md` §7 for the evidence table.

## Not required

`dshmarket` does not require the package to be published to npm — the bundle
channel installs from GitHub (`dsh plugin --profile <p> add "github:xx529/dsh-task-gantt"`),
which is why `lib/` is committed. Publishing to npm is optional and not planned.
