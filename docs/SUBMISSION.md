# Catalog submission record

What was submitted to the plugin catalog, how it was validated, and what is
still gating it. Kept in the repository so the claim is checkable later.

**Status `2026-10-15T10:48Z`:** submitted as [PR #7086](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7086)
on `2026-10-10T18:16:41Z`; both catalog gates green since `2026-10-12T07:22Z`;
**not merged**, so not yet visible in any market. Expected merge window
`2026-10-17` – `2026-10-24` — see [Merge queue tracking](#merge-queue-tracking).

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

That prediction held: the PR's own `Submission gate` check went green on
`2026-10-12T07:22:46Z` without any change on our side. The checker output quoted
above is the historical record of the 2026-10-11 run, not a current blocker.

## Repository prerequisites

| Requirement | State | Evidence |
|---|---|---|
| `package.json` declares `dsh.bundle` (the "only `dsh.client`" shape cannot be installed) | ✅ | `dsh.bundle.patch = ./cordis.patch.yml`; `pnpm run verify:build` |
| Real, usable code | ✅ | `lib/index.js` 40 502 B / `lib/client.js` 71 996 B, both bundles load (see `docs/VALIDATION.md`) |
| GitHub topic `dsh-plugin` | ✅ | `gh repo view --json repositoryTopics` → `['dsh','dsh-plugin','deepseek-harness','dsh-better-sidebar','agent-team','gantt']` (checked 2026-10-15) |
| Repository public, not archived, not DSH itself | ✅ | `gh repo view --json isPrivate` → `false` |
| Repository ≥ 1 day old | ✅ | cleared `2026-10-11T17:37:09Z` as predicted; the catalog's own gate then confirmed it — `Submission gate` SUCCESS at `2026-10-12T07:22:46Z` |
| CI green on `main` | ✅ | latest run `CI` = success, `2026-10-15T06:46:50Z` (`gh run list --repo xx529/dsh-task-gantt --limit 1`) |

Deliberately **not** submitted: `dsh.plugin.json`. It is not a DSH contract —
see `docs/INSTALL.md` §7 for the evidence table.

## Merge queue tracking

State captured `2026-10-15T10:48Z`, every value read back from the GitHub or
catalog API — nothing here is recalled or inferred.

| Fact | Value |
|---|---|
| Catalog PR | [#7086](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7086) — branch `add/xx529-dsh-task-gantt` |
| Opened | `2026-10-10T18:16:41Z` |
| State | `OPEN`, `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN` |
| `check` | SUCCESS, completed `2026-10-12T07:22:18Z` |
| `Submission gate` | SUCCESS, completed `2026-10-12T07:22:46Z` |
| Diff | `data/plugins/xx529__dsh-task-gantt.yml`, +6 lines, nothing else |
| Live catalog | no `xx529` entry, no name containing `gantt`, among 4671 plugins (`updated: 2026-10-14`) |

So the submission is not blocked by anything on our side: both gates are green and
the branch is conflict-free (entry files never collide — `contributing.md`).

### Who merges, and how

There is **no automatic merge path** on the catalog side. Its 11 workflows are
check / gate / rescan / site-build only, with no merge-queue job:

```
$ gh api repos/awesome-dsh-plugin/awesome-dsh-plugin/contents/.github/workflows --jq '.[].name'
adopt-discussions.yml  build-site.yml  decay-scan.yml  held-rescan.yml  pr-check.yml
pr-gate.yml  pr-guard.yml  regate.yml  site-health.yml  sync-readme.yml
```

Merging is done by hand by the maintainer `fkysly` in scripted batches — sampling
10 recent merges, every `merged_by` is `fkysly`, and inside one batch the
timestamps are 7 s apart (`17:49:10 → 17:49:17 → 17:49:24 …`). `contributing.md`
describes the review as reading the plugin's source and re-checking every claim in
the description, so the throughput is human.

### Where the queue front is

| Measure | Value |
|---|---|
| Highest merged PR number — the front | **#6805**, merged `2026-10-14T17:49:10Z` |
| Our PR number | **#7086** → 281 numbers ahead of the front |
| Open PRs between the front and us | 255 (`6806 … 7085`) |
| Open PRs older than us | 712 |
| Open PRs in total | 1063 |

Wait time of the **156 PRs merged in the last two days**, measured as
`merged_at - created_at`:

| Merged on | How many | Created between | Median wait |
|---|---|---|---|
| 2026-10-13 | 119 | 09-30 → 10-02 | 14.2 d |
| 2026-10-14 | 37 | 09-30 → 10-07 | 13.0 d |
| both | 156 | — | p10 12.2 d / **median 12.9 d** / p90 13.0 d / max 14.3 d |

Daily merge volume — 10-08: 37, 10-09: 12, 10-10: 24, 10-11: 24, 10-12: 23,
10-13: 119, 10-14: 37, 10-15: **0** (as of `10:48Z`). Batch runs cluster at
`05:00–07:00Z` and `13:00–17:00Z` — 13:00–15:00 and 21:00–01:00 Beijing — with
4–11 runs on an active day, so there is no single "merge o'clock".

### Expected merge window

| Model | Basis | Expected merge of #7086 |
|---|---|---|
| Historical wait, steady state | median 12.9 d, we are 4.8 d in | **2026-10-22 → 10-24** |
| Number-front advance, last two days | front went #6163 → #6805 in 2 days, 281 to go | **2026-10-16 → 10-17** |
| Number-front advance, before 10-13 | only +27 / +32 / +35 numbers on 10-09→10-12 | **2026-10-23 → 10-25** |

**Best estimate: `2026-10-17` – `2026-10-24`, centred on `2026-10-20`.** This is a
queue position, not a promise: the front moved 642 PR numbers across 10-13/10-14,
but only ~31/day over the three days before that, and every merge is a manual read.

### Risks that would push it past that window

1. **A `held: author` label.** It never clears itself and the batch merge filters
   the queue by label, so a held PR becomes invisible until a rescan.
   `held-rescan.yml`'s own header records the cost: #2233 fixed then waited 17
   days, #2881 13 days (author pinged 3×), #2179 8 days. Our entry is the shape the
   gate wants — 1 entry, `ui`, bilingual, both gates green — so this is a tail
   risk, not an expected one.
2. **Nobody looks at it.** With 1063 open PRs that is the likeliest outcome, and it
   is queue depth rather than a fault.

Two things that look like problems and are not:

- `regate.yml` (`cron: 19 */6 * * *`) re-runs `PR check` on any passing verdict
  older than 48 h (`PASS_STALE_MS`). Our verdict is from 10-12, so its SUCCESS
  timestamp will keep refreshing — that is the scheduler, not a new push by us.
- A push would re-trigger the gate but would **not** move the queue position.

### Deliberately not doing

**No resubmission, no push, no close-and-reopen.** `contributing.md` says the age
bar re-runs by itself, and both facts have now been observed here: the age failure
cleared on its own, and the gate went green without any further action.

### Re-checking this later

```bash
# merged yet? (404 = still not in the catalog)
gh api repos/awesome-dsh-plugin/awesome-dsh-plugin/contents/data/plugins/xx529__dsh-task-gantt.yml --jq '.path'

# visible in the market yet? dshmarket reads exactly this URL, 1 h cache
curl -sS https://awesome-dsh-plugin.com/plugins.json \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['updated'], d['count'], [p['name'] for p in d['plugins'] if 'gantt' in p['name'].lower()])"

# where is the front now? (adjust the date to the previous day)
gh api "search/issues?q=repo:awesome-dsh-plugin/awesome-dsh-plugin+is:pr+is:merged+merged:%3E=2026-10-14&per_page=100" --jq '[.items[].number]|max'
```

## Not required

`dshmarket` does not require the package to be published to npm — the bundle
channel installs from GitHub (`dsh plugin --profile <p> add "github:xx529/dsh-task-gantt"`),
which is why `lib/` is committed. Publishing to npm is optional and not planned.
