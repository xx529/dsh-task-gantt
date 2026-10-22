# dsh-task-gantt — plugin-market submission dossier

> **Every requirement in this file carries a source** — a path on this machine
> (with line numbers) or a URL. Anything we could not verify is marked
> **❓unverified** or **⛔not-yet-satisfied**, never asserted as done.

## 0. Status at a glance

Last checked `2026-10-22T04:20Z` — GitHub API (`gh`), the live
`https://awesome-dsh-plugin.com/plugins.json`, and the published detail pages.

| Item | Status |
|---|---|
| Package manifest market-compatible | ✅ (checked against the local rules below) |
| Install / uninstall commands | ✅ written down once, in `docs/INSTALL.md`; all three marked **[not run]** end-to-end (see §4) |
| Published to GitHub | ✅ since `2026-10-10T17:37:09Z` — `gh repo view xx529/dsh-task-gantt` resolves, `origin` = `https://github.com/xx529/dsh-task-gantt.git`, topics `['dsh','dsh-plugin','deepseek-harness','dsh-better-sidebar','agent-team','gantt']` |
| Repo age ≥ 1 day | ✅ cleared `2026-10-11T17:37:09Z` as predicted; the catalog's own `Submission gate` confirmed it — SUCCESS `2026-10-12T07:22:46Z` |
| `dsh-plugin` topic | ✅ set — see the topic list above |
| Catalog entry (`data/plugins/xx529__dsh-task-gantt.yml`) | ✅ submitted — [PR #7086](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7086), +6 lines and nothing else, opened `2026-10-10T18:16:41Z` |
| **Catalog PR merged** | ✅ merged `2026-10-21T17:18:52Z` by `fkysly` (merge commit `416eba8`) — 10 h 42 min after our `05826bba` reply. It had been on `held: author` since 10-17 because the description omitted the required `dsh-better-sidebar >= 0.4.0` dependency; adding that one sentence unblocked it. Full timeline in `docs/SUBMISSION.md` |
| **Visible in the market** | ✅ present in the live `plugins.json` (`updated: 2026-10-22`, 6378 entries, `added: 2026-10-21`): `category: ui`, `capabilities: ["network"]`, `install: dsh plugin --profile web add github:xx529/dsh-task-gantt`. Detail page `https://awesome-dsh-plugin.com/p/xx529/dsh-task-gantt/` returns HTTP 200 and the site home lists it. `dshmarket` reads the same URL with a 1 h in-memory cache (`…/dshmarket/src/registry.ts:36-37`), so the GUI shows it after a refresh |
| **Detail page: README section** | ⏳ not rendered as of `2026-10-22T04:20Z`. READMEs come from the nightly full-probe build (`build-site.yml` `cron: 23 2 * * *`; push builds explicitly do **not** probe), and run `39712698150` started `02:40:42Z` is still in its `Build` step. Entries added 10-19/10-20 already have it; all 125 entries added 10-21, ours included, do not yet. No action needed — it appears when that run finishes |
| CI on `main` | ✅ latest run `CI` = success, `2026-10-16T03:28:25Z` |
| Screenshots | ✅ declared — `screenshots.json` at the repository root lists `docs/screenshots/panel-v4.png` + `docs/screenshots/panel-compact.png` (added `2026-10-22`, validated against `probe-screenshots.mjs`: array shape, ≤ 8 images, relative paths inside the plugin directory, both files live at HEAD). The gallery appears on the next nightly build |
| Published to npm | ➖ optional; not planned, and not required for listing |

## 1. One-line description

**en (required by the catalog):**

> Agent-team task Gantt chart for the DSH sidebar: one swimlane per teammate, real session-log time on the x-axis, and each shared task drawn with its title and summary.

**zh (optional; the catalog says a maintainer will fill it in if omitted):**

> DSH 侧边栏的 agent team 任务甘特图：每个 teammate 一条泳道，横轴取自真实会话日志时间，条内显示共享任务的标题与简介。

Both must be accurate to the code — the catalog treats the description as a
claim that is checked against the source:

> **The description must be accurate.** It is read as a claim about your plugin,
> and it is checked against your code. … Overstating is the one thing that gets
> an otherwise-good plugin sent back.
> — <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>

### 1.1 Claim-by-claim self-audit

| Claim in the description | Where it is true in the code |
|---|---|
| "one swimlane per teammate" | `TimelineLane` = one roster member; lanes are Lead first, then teammates, then `unassigned` (`src/shared/contract.ts:104-125`, `:147-148`) |
| "real session-log time on the x-axis" | spans come from `turn/start`…`step/end` in the durable log, never invented (`src/shared/contract.ts:41-43`) |
| "each shared task drawn with its title and summary" | `TimelineTask.subject` + `TimelineTask.description` are first-class fields (`src/shared/contract.ts:85-87`) |
| "sidebar tab" | registered via `ctx.betterSidebar.registerTab` (`src/client/index.ts:109-121`) |

> ⚠️ Do **not** put "real-time" or "live updates" in the catalog line unless the
> polling behaviour is verified on a mounted profile; the panel's refresh
> strategy is still being implemented.

## 2. Long description (for the market detail view / README reuse)

```
You are running several teammates at once and the transcript no longer tells you
who did what, when.

dsh-task-gantt adds one tab to the dsh-better-sidebar sidebar:

  y-axis  the team roster — the Lead, then every teammate, then an
          "unassigned" row for tasks the board has not handed to anyone
  x-axis  wall-clock time in milliseconds, read from the durable session
          event log — turn bands with step bars inside them, and a "now" line
  bars    the shared tasks: subject, a one-line summary, status, owner,
          blockedBy, writeScopes and readiness

The chart is assembled from two sources on purpose:

  * the agentTeam session projection says WHAT exists and what state it is in —
    but it contains no timestamps at all;
  * the session event log says WHEN it happened — but it never says what the
    board currently holds.

Where the log does not date a task, the task is drawn at its current position
and labelled as live. The plugin never invents a timestamp, and it says so in
the panel when a lane could not be dated.

Read-only: the plugin never creates or updates a shared task. It is safe to
leave open.
```

## 3. Category and keywords

**Category: `ui`.**

- The catalog's valid set is
  `agi ui usage theme model identity session memory tools wsl browser vision voice docs skill workflow git notify dev security remote market fun`
  (<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>).
- `ui` is what the installed market snapshot itself uses for
  sidebar/output-surface plugins — e.g. `DSH-Right-Sidebar`, `dsh-explorer`,
  `dsh-message-rail` are all `ui`
  (`/Users/lzx/.dsh/profiles/web/node_modules/dshmarket/data/registry-snapshot.json`,
  `plugins[0]`, `plugins[1]`, `plugins[3]`).
- It is **not** `theme`: the Themes tab is reserved for skins that swap
  appearance (`…/contributing.md`, "Themes & skins").

**Keywords** (already in `package.json`): `dsh`, `dsh-plugin`,
`deepseek-harness`, `dsh-better-sidebar`, `agent-team`, `gantt`
(`/Users/lzx/Documents/GitHub/dsh-task-gantt/package.json`).

Note: the catalog entry itself has no keyword field — its YAML is
`url` / `name` / `category` / `description.{en,zh}` (+ optional `tarball`)
(`…/contributing.md`, "Adding a plugin"). Keywords only serve npm discovery.

## 4. Install command

Quoted **verbatim** from `docs/INSTALL.md` (owner: packaging) — that file is the
single place the commands are written down and carries the evidence for each.

**From GitHub (the recommended form):**

```bash
cd ~/.dsh && dsh plugin --profile web add "github:xx529/dsh-task-gantt"
```

**Local development (link the checkout instead of installing a copy):**

```bash
cd ~/.dsh && dsh plugin --profile web add "link:/Users/lzx/Documents/GitHub/dsh-task-gantt"
```

**Uninstall:**

```bash
cd ~/.dsh && dsh plugin --profile web remove dsh-task-gantt
```

Status: all three are **[not run]** end-to-end — the repository now exists on
GitHub, so the `github:` spec has something to resolve, but a real install writes
the live `~/.dsh/profiles/web` profile, which only the Lead does during the mount
smoke test (`docs/INSTALL.md` §1.1, §1.2, §5).

Why these are the right verbs — sources as recorded in `docs/INSTALL.md`:

| Fact | Source |
|---|---|
| `dsh plugin` forwards its arguments **verbatim to pnpm** in the profile directory | `docs/INSTALL.md` §1.1, quoting `~/.nvm/versions/node/v22.22.2/lib/node_modules/@deepseek-ai/dsh/lib/bin.js:96` (the CLI's own help text: `"pnpm arguments, forwarded verbatim (add <pkg>, remove <pkg>, why <pkg>, ...)"`) |
| therefore `add` / `remove` are pnpm subcommands, not bespoke dsh verbs | same |
| `github:owner/repo` is the form the official docs print for a bundle plugin | <https://deepseekdocs.com/en/docs/user-guide/plugins> §2, cited in `docs/INSTALL.md` §1.1 |
| `link:` is the official local-development form | <https://deepseekdocs.com/en/docs/user-guide/plugins> §2, cited in `docs/INSTALL.md` §1.2 |
| `remove <pkg>` is the documented uninstall verb, and it takes the **package name** | <https://deepseekdocs.com/en/docs/user-guide/plugins> §7, cited in `docs/INSTALL.md` §5 |
| the catalog emits the same shape for GitHub entries: `dsh plugin --profile web add github:<owner>/<repo>` | `/Users/lzx/.dsh/profiles/web/node_modules/dshmarket/data/registry-snapshot.json` — e.g. `plugins[0].install` = `"dsh plugin --profile web add github:Limitinfinitude/DSH-Right-Sidebar"` |

> ### ⚠️ Never install under an alias
>
> `… add "dsh-task-gantt@github:xx529/dsh-task-gantt"` parses, but the package
> lands at `node_modules/<alias>` while its inner `package.json` still says
> `"name": "dsh-task-gantt"`. The profile's `dsh.profile.bundles` list and the
> Loader row are keyed by the **package name**, so the mismatch degrades to
> "warn, then skip" (`docs/INSTALL.md` §1.1, with the alias behaviour measured
> against a real package). If the README ever advertises the aliased form, the
> listing installs and then does nothing.

> ⚠️ **`remove` does not rewrite the patch layer.** Uninstalling deletes the
> dependency but does not remove manually-added `insert` rows from a
> `cordis.patch.yml`. This package's row comes from its own bundle patch, so
> nothing should be left behind — but a hand-added `- id: dsh-task-gantt` row in
> `~/.dsh/profiles/web/cordis.patch.yml` must be deleted by hand
> (`docs/INSTALL.md` §5).

## 5. Repository, author, compatibility, license

| Field | Value | Source |
|---|---|---|
| GitHub | `https://github.com/xx529/dsh-task-gantt` | `package.json` → `repository.url` |
| Issue tracker | `https://github.com/xx529/dsh-task-gantt/issues` | `package.json` → `bugs.url` |
| Homepage | `https://github.com/xx529/dsh-task-gantt#readme` | `package.json` → `homepage` |
| Author | `xx529` (GitHub account; the repo has no `author` field yet) | `gh auth status` reported the logged-in account as `xx529` per `docs/TEAM-BRIEF.md` §1 |
| License | MIT | `LICENSE` (MIT License, "Copyright (c) 2026 dsh-task-gantt contributors") + `package.json` `"license": "MIT"` |
| Package name / version | `dsh-task-gantt` @ `0.2.34` (checked 2026-10-15) | `package.json` |

### Compatibility matrix

| Axis | Value | Source |
|---|---|---|
| DSH host version tested | **0.2.0-rc.2** | `~/.dsh/dsh-runtimes/dsh-primary-runtime/runtime.json` → `desktopVersion` (`docs/TEAM-BRIEF.md` §1) |
| dsh-better-sidebar minimum | **0.4.0** — the version that introduced the `ctx.betterSidebar` registry service | `/tmp/dsh-better-sidebar-src/docs/external-plugin-guide.md:5`, `:49` |
| dsh-better-sidebar tested | **0.22.1** (installed in the `web` profile) | `/Users/lzx/.dsh/profiles/web/node_modules/dsh-better-sidebar/package.json`; `docs/TEAM-BRIEF.md` §1 |
| dsh-better-sidebar v0.24.0+ | `hostRouteUrl` is available (`features` probe) but **not required** by this plugin | guide `:5` (`hostRouteUrl` v0.25.0+), `:767`, `:796-799` |
| Platform | any browser-backed DSH Web profile; no native code, no `node-pty`, no platform-specific bundle | `package.json` `engines.node >= 20`; no `os`/`cpu` fields; no native deps |
| Node | `>= 20` | `package.json` `engines.node` |

**Peer dependencies.** The plugin declares exactly one peer,
`@deepseek-ai/cordis: ^4.0.0`, and marks it optional.

| Rule | Source |
|---|---|
| Never put `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` in `peerDependencies` — the host's startup preflight evaluates `semver.satisfies(runtimeVersion, range, { includePrerelease: true })` for those names and **disables the whole profile row** on failure, with no dialog and no exemption for `peerDependenciesMeta.optional` | `/tmp/dsh-better-sidebar-src/tests/market-manifest.spec.ts:118-139`; `/tmp/dsh-better-sidebar-src/AGENTS.md:23`; `docs/TEAM-BRIEF.md` §2.3 |
| `@deepseek-ai/cordis` does **not** match that preflight (it matches neither `@deepseek-ai/dsh` nor the `@deepseek-ai/dsh-` prefix), which is why it is the one peer we may keep | `/tmp/dsh-better-sidebar-src/tests/market-manifest.spec.ts:141` |
| Official `@deepseek-ai/*` packages belong in `peerDependencies`, not `dependencies` | `…/contributing.md`, "Recommended for a better install experience" |
| A peer range must carry an explicit prerelease branch on the matching tuple or it silently excludes prerelease builds | `…/contributing.md`, same section |

## 6. Listing checklist — item by item, with sources

The catalog's own bar, distilled:

> An entry is added when the plugin installs with `dsh plugin add`, does what its
> one-line description says, sits in the right category, and is maintained.
> — <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/README.md>,
> "What it takes to be listed here"

### 6.1 Hard requirements

| # | Requirement (verbatim gist) | Source | Our status |
|---|---|---|---|
| R1 | The repo declares a **`dsh.bundle`** manifest in `package.json`; **only `dsh.client` is not installable** | `…/contributing.md`, "Requirements" + the ⚠️ note | ✅ `package.json` → `dsh.bundle.patch: "./cordis.patch.yml"` + `dsh.client.platform: "web"` |
| R2 | A `cordis.patch.yml` sits next to it, with an `insert` row | `…/contributing.md`, code example | ✅ `cordis.patch.yml` → `- insert: [{ id: dsh-task-gantt, name: 'dsh-task-gantt' }]` |
| R3 | Real, working code — no placeholder / name-squat / README-only repo | `…/contributing.md` | ✅ real host + client halves under `src/`, tests under `tests/` |
| R4 | Repo at least **1 day old** (CI-checked) | `…/contributing.md` | ✅ cleared `2026-10-11T17:37:09Z`; `Submission gate` SUCCESS `2026-10-12T07:22:46Z` |
| R5 | Actively maintained | `…/contributing.md` | ➖ ongoing obligation — commits on `main` through `2026-10-15` |
| R6 | Add the **`dsh-plugin`** GitHub topic | `…/contributing.md` | ✅ topics `['dsh','dsh-plugin','deepseek-harness','dsh-better-sidebar','agent-team','gantt']` |
| R7 | Description states what it does, no superlatives/marketing; must be **accurate to the code** | `…/contributing.md` | ✅ see §1.1 audit |
| R8 | Category matches what the plugin does | `…/contributing.md` | ✅ `ui`, see §3 |
| R9 | At most **3 entries per PR** | `…/contributing.md`, "One PR, at most 3 entries" | ✅ one entry |

### 6.2 Market-manifest constraints (from the market/registry side)

| # | Constraint | Source | Our status |
|---|---|---|---|
| M1 | No `cordis` key in `dependencies` / `peerDependencies` / `optionalDependencies` — hard-rejected by name, `optional` grants no exemption | `/tmp/dsh-better-sidebar-src/tests/market-manifest.spec.ts:6-12` and `:67-71`; `/tmp/dsh-better-sidebar-src/AGENTS.md:23` | ✅ only `@deepseek-ai/cordis` is declared |
| M2 | No `preinstall` / `install` / `postinstall` / `prepare` scripts in the **packed** manifest | `…/tests/market-manifest.spec.ts:14-16` (`LIFECYCLE_SCRIPTS`), `:79-85` | ✅ `package.json.scripts` = build / dev / typecheck / test / test:watch / verify:build / check / pack:check — none is a lifecycle hook |
| M3 | `dsh.bundle.patch` must be a safe relative path that exists inside the package | `…/tests/market-manifest.spec.ts:87-99` | ✅ `./cordis.patch.yml` exists at the repo root and is inside `files` |
| M4 | `repository.url` must normalise to a credential-free HTTPS GitHub `owner/repo` URL (the catalog ↔ npm backlink check) | `…/tests/market-manifest.spec.ts:101-112` | ✅ `https://github.com/xx529/dsh-task-gantt` — no credentials, no query, no hash, 2 path segments |
| M5 | Exact SemVer version (no ranges, no tags; prerelease allowed) | `…/tests/market-manifest.spec.ts:114-116` | ✅ `0.2.34` |
| M6 | npm `latest` must be an exact **stable** version for the automatic install preview (for the Community Market path) | <https://github.com/anywhere-labs/deepseek-harness-desktop/blob/master/dsh-community-market/docs/install-and-uninstall.zh.md>, "自动安装条件" | ➖ we are not on npm, so that market can only offer the manual GitHub command; this does **not** block listing in the `dshmarket` catalog |
| M7 | `dshmarket` installs only from the curated catalog — anything else is rejected | `/Users/lzx/.dsh/profiles/web/node_modules/dshmarket/README.md:47` | ➖ our entry has to exist in the catalog first |
| M8 | To get into `dshmarket`, PR the **catalog**, not the market app | `…/dshmarket/README.md:57-59` | ✅ done — [PR #7086](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7086) opened `2026-10-10T18:16:41Z`, unmerged as of `2026-10-15T10:48Z`; see §8 |

### 6.3 Optional / recommended

| # | Item | Source | Our status |
|---|---|---|---|
| O1 | `screenshots.json` next to `package.json`, 1–8 repo-relative images | `…/contributing.md`, "Screenshots" | ✅ declared `2026-10-22` — repository-root `screenshots.json` = `["docs/screenshots/panel-v4.png", "docs/screenshots/panel-compact.png"]`. Validated against `scripts/probe-screenshots.mjs` (array of non-empty strings, ≤ 8, relative paths that stay inside the plugin directory, both files present at HEAD). The gallery renders on the next nightly build |
| O2 | Publish to npm (skips the `allowBuilds` build-approval step; adds a download count) | `…/contributing.md`, "Recommended…" + "npm package" | ➖ not planned; listing is unaffected |
| O3 | Prebuilt tarball on a GitHub Release + `tarball:` field — **required** only if the repo cannot be installed from source at all | `…/contributing.md`, same section | ➖ not needed: `lib/` is committed, so `github:` installs need no build step |
| O4 | `package.json#icon` + `locale/<lang>.json` for the host plugin manager's display metadata. `locale/en.json` is the **discovery baseline** — without it the whole locale directory is ignored, and every failure is silent (the entry just degrades to a plain text row) | `/tmp/dsh-better-sidebar-src/AGENTS.md:103` | ✅ resolved — `locale/en.json` and `locale/zh.json` exist and are published (`gh api repos/xx529/dsh-task-gantt/contents/locale`, 2026-10-15), `package.json` exports `./locale/*.json` and lists `locale/*.json` in `files`, and `icon.svg` + `"icon": "./icon.svg"` are present |

## 7. What the market actually reads

Useful when deciding what to fix, and what to ignore:

| Layer | What it reads | Source |
|---|---|---|
| `dshmarket` catalog | `GET https://awesome-dsh-plugin.com/plugins.json`, cached 1 h, bundled snapshot as offline fallback | `/Users/lzx/.dsh/profiles/web/node_modules/dshmarket/src/registry.ts:36-59` |
| Catalog entry shape | `name`, `owner`, `url`, `category`, `description{en,zh}`, `npm`, `stars`, `install`, `added` | `…/dshmarket/src/registry.ts:9-27`; live sample in `…/dshmarket/data/registry-snapshot.json` |
| Activation state after install | `live` / `restart` / `inert` / `broken` / `missing`, decided by the profile's `dsh.profile.bundles` + the package's `dsh` metadata + a loadable entry artifact | `…/dshmarket/src/verify.ts:1-19`, `:98-187` |
| `dsh.plugin.json` | **not** a DSH contract — DSH reads `package.json`'s `dsh.bundle.patch` + `dsh.client`; `dsh.plugin.json` only serves third-party registry channels | `/tmp/dsh-better-sidebar-src/AGENTS.md:103` |

Consequence, and the decision this repo took: **no `dsh.plugin.json` is shipped**.
Its only consumer would be a third-party registry channel, and the catalog we are
targeting reads `package.json` from the repository URL
(`…/contributing.md`, "What CI checks"). Nothing that the listing path reads is
lost by omitting it.

## 8. The submission itself

Per the catalog guide, **one YAML file is the whole submission** — the READMEs
are generated and must not be hand-edited:

```yaml
# data/plugins/xx529__dsh-task-gantt.yml
url: https://github.com/xx529/dsh-task-gantt
name: xx529/dsh-task-gantt
category: ui
description:
  en: Agent-team task Gantt chart for the DSH sidebar: one swimlane per teammate, real session-log time on the x-axis, and each shared task drawn with its title and summary.
  zh: DSH 侧边栏的 agent team 任务甘特图：每个 teammate 一条泳道，横轴取自真实会话日志时间，条内显示共享任务的标题与简介。
```

(`en` is the only required description field; a `: `-containing description
must be quoted in YAML — neither of ours contains `: `.)
— <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>

**Outcome:** opened `2026-10-10T18:16:41Z` as
[PR #7086](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7086);
**merged `2026-10-21T17:18:52Z`** by `fkysly` (merge commit `416eba8`), and live
in the market since the `2026-10-22` catalog rebuild.

The delay was **not** queue depth — `fkysly` reviewed it on `2026-10-17` and put
it on `held: author` because the description omitted the required
`dsh-better-sidebar >= 0.4.0` dependency, writing that adding that sentence would
get it merged outright. We pushed `05826bba` on `2026-10-21T06:35Z` (both checks
green again, which also cleared a `Repository config guard` complaint that no
checks had run on the previous commit) and replied in the same minute; he merged
it 10 h 42 min later. Full timeline, and the correction to the ETA model this
file used to carry, are in `docs/SUBMISSION.md` §What actually happened.

## 9. Open items

1. ✅ Push `xx529/dsh-task-gantt` to GitHub and add the `dsh-plugin` topic —
   done `2026-10-10T17:37:09Z`; topics verified `2026-10-15`.
2. ✅ Wait out the 1-day repo-age bar before opening the catalog PR — cleared
   `2026-10-11T17:37:09Z`, PR opened `2026-10-10T18:16:41Z` (before the bar
   cleared) and the gate went green on its own at `2026-10-12T07:22:46Z`.
3. ✅ Declare the screenshots — `screenshots.json` added `2026-10-22` with
   `docs/screenshots/panel-v4.png` and `docs/screenshots/panel-compact.png`
   (validated against `probe-screenshots.mjs`). The gallery renders on the next
   nightly build; the three-shot inventory in `docs/SCREENSHOTS.md` was the
   pre-capture plan, the two declared files are the real captures.
4. ✅ `locale/en.json` + `locale/zh.json` are shipped and published (checked
   `2026-10-15`), so the silent-degradation risk is closed; contract source as
   recorded: `/tmp/dsh-better-sidebar-src/AGENTS.md:103`.
5. ❓ Confirm on the mounted profile that the GitHub install spec resolves and
   the tab renders (owner: Lead, per `docs/TEAM-BRIEF.md` §7). All three install
   commands in §4 are currently **[not run]** end-to-end.
6. ⚠️ **Repo hygiene, for the record (outside this file's write scope):**
   `package.json` → `files` lists `README.md`, `README.zh.md` and
   `docs/INSTALL.md`, but the READMEs link to `docs/DESIGN.md`,
   `docs/MARKET.md`, `docs/VALIDATION.md` and `docs/FINDINGS-host.md`, which are
   **not** in `files`. Browsing the GitHub repository is unaffected; only a
   published npm tarball would carry dead links. `package.json` is owned by
   `packaging`; flagging rather than editing.
7. ➖ Decide later whether to publish to npm (would enable the Community
   Market's automatic install preview).
8. ⏳ **After the next nightly build** (`build-site.yml`, `cron: 23 2 * * *`):
   confirm the detail page grew a `README` section and the two declared shots
   render. Expected mechanism, sourced from the catalog's own scripts:
   `probe-readmes.mjs` fetches each entry's README into `data/readmes.json`
   (`MAX_BYTES = 48 KB`; ours is 13 KB) and `probe-screenshots.mjs` resolves
   `screenshots.json` relative to the plugin repo at HEAD. Pull builds do not
   probe, so nothing here is actionable before that run lands.
