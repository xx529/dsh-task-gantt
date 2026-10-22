# Catalog submission record

What was submitted to the plugin catalog, how it was validated, and what is
still gating it. Kept in the repository so the claim is checkable later.

**Status `2026-10-22T04:20Z`: MERGED and LIVE.** [PR #7086](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7086)
was merged `2026-10-21T17:18:52Z` by `fkysly` (merge commit `416eba8`) and the
entry is in the published catalog (`plugins.json`, `updated: 2026-10-22`, 6378
entries, `added: 2026-10-21`), with a live detail page at
<https://awesome-dsh-plugin.com/p/xx529/dsh-task-gantt/>. The one thing still
pending is cosmetic: the detail page grows its `README` section and screenshot
gallery on the next nightly site build — see
[What actually happened](#what-actually-happened) and
`docs/MARKET.md` §0.

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
| CI green on `main` | ✅ | latest run `CI` = success, `2026-10-16T03:28:25Z` (`gh run list --repo xx529/dsh-task-gantt --limit 1`) |

Deliberately **not** submitted: `dsh.plugin.json`. It is not a DSH contract —
see `docs/INSTALL.md` §7 for the evidence table.

## What actually happened

Recorded after the fact, so the next submission does not repeat the same
mistake — and so this file's earlier ETA is not left standing as if it had been
right.

| When (UTC) | What |
|---|---|
| `2026-10-10T18:16:41Z` | PR #7086 opened, one entry file, +6 lines |
| `2026-10-12T07:22Z` | `check` + `Submission gate` both SUCCESS — the submission itself was fine |
| `2026-10-17T07:22Z` | **`fkysly` reviewed it and put it on `held: author`**: the description omitted the required `dsh-better-sidebar >= 0.4.0` dependency. He wrote the exact sentence to add and said "改完推上来就合" (add it and I will merge it) |
| `2026-10-17T08:15Z` | He restated the point with the README line numbers, in Chinese, adding "改完我直接合" |
| `2026-10-18T18:43Z` | `Repository config guard` FAILED on the old commit — *"No checks ran on this pull request… Push any commit to re-trigger the checks"* |
| `2026-10-21T06:35Z` | Pushed `05826bba`: `description.en`/`zh` appended the dependency sentence. Both checks went green again (`check` `06:35:30Z`, `Submission gate` `06:36:08Z`), the guard complaint cleared, `MERGEABLE` / `CLEAN` |
| `2026-10-21T06:36:27Z` | Replied on the PR with the change, the README sources, and a note that the `held: author` label needs his re-review |
| `2026-10-21T17:18:52Z` | **Merged** by `fkysly`, merge commit `416eba8` — 10 h 42 min after the reply |
| `2026-10-22` | Catalog rebuilt: entry present in `plugins.json` (6378 entries), detail page live, site home lists it |

### Why the ETA below was wrong

The model in [Merge queue tracking](#merge-queue-tracking) assumed the only
variable was queue depth and computed `2026-10-17` – `2026-10-24`. The premise
was wrong twice over:

1. **A held PR is not in the queue at all.** The batch merge filters by label
   (`held-rescan.yml` header), and the number sweep had already passed `#7086`
   (the merge front reached `#8370` while the PR sat held). No amount of queue
   movement would have merged it; only the author's fix could.
2. **The reviewer had already answered on day 7, not day 12.** The real
   bottleneck was a one-sentence description gap that we could have closed on
   `2026-10-17` — four days earlier than the ETA's lower bound. Checking PR
   comments is cheaper and more informative than modelling merge throughput.

Lesson for the next submission: after opening the PR, poll the PR's **comments
and labels**, not just the merged date. A `held: author` label is an instruction,
not a delay.

## Merge queue tracking

> **Superseded `2026-10-21`.** Kept as the reasoning that was available at the
> time; the outcome and its correction are in
> [What actually happened](#what-actually-happened). The queue positions and
> counts below were accurate for `2026-10-15` only.

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

## How the detail page is rendered

The detail page is **not** composed from the entry YAML alone, which is why a
freshly merged entry looks thin for a day. Three sources, each with its own
probe (all read out of the catalog repository's own `scripts/`):

| Section on the page | Source | Built by |
|---|---|---|
| name, one-line description (en/zh), category, Install command, Links | `data/plugins/<entry>.yml` | `build-site.mjs` |
| **README** — the long introduction with all its `h2`/`h3` sections | the plugin repo's `README.md` / `README.zh.md`, fetched into `data/readmes.json` | `scripts/probe-readmes.mjs`, `MAX_BYTES = 48 * 1024` |
| **Screenshot gallery** (top of the README block) | `screenshots.json` beside the plugin's `package.json`; the catalog's own `data/screenshots.json` is only the fallback for pre-convention entries | `scripts/probe-screenshots.mjs` — ≤ 8 images; JSON may be an array, `{"screenshots": [...]}`, or a single-key map; relative paths must stay inside the plugin directory; absolute URLs only on GitHub hosts |
| stars, npm, downloads, capability scan | repo + registry probes | `probe-stars.mjs`, `probe-npm.mjs`, `probe-downloads.mjs`, `probe-capabilities.mjs` |

The important consequence: **push builds deploy but do not probe.**
`build-site.yml` says so in its own comment ("Fresh data is a once-a-day need"),
and the probes run in the scheduled build, `cron: '23 2 * * *'` — 10:23 Beijing,
taking one to two hours for 6000+ entries. So a merged entry gets its description
and Install command immediately, but its **README section and gallery only after
the next scheduled probe**. Observed on `2026-10-22`: entries added 10-19/10-20
had their README rendered; all 125 entries added 10-21, ours included, did not,
because that morning's scheduled run (`39712698150`, started `02:40:42Z`) was
still inside its `Build` step.

What that meant for us:

- **README** — nothing to do; it renders on its own (`README.md` 13 KB,
  `README.zh.md` 12 KB, both well under the 48 KB cap, and the page also exists
  in Chinese at `/zh/p/xx529/dsh-task-gantt/`).
- **Gallery** — ours to fix, and we did on `2026-10-22`: repository-root
  `screenshots.json` = `["docs/screenshots/panel-v4.png",
  "docs/screenshots/panel-compact.png"]`. No catalog PR, no maintainer, no wait:
  `probe-screenshots.mjs` reads the plugin repository directly at HEAD.

## Not required

`dshmarket` does not require the package to be published to npm — the bundle
channel installs from GitHub (`dsh plugin --profile <p> add "github:xx529/dsh-task-gantt"`),
which is why `lib/` is committed. Publishing to npm is optional and not planned.
