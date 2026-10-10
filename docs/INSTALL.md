# Installing dsh-task-gantt

> Owner: teammate `packaging` (task-1). This file is the **only** place the install
> commands are written down; `README.md` / `README.zh.md` / `docs/MARKET.md`
> quote it verbatim instead of restating it (owner: `docs`).
>
> Every command below is marked **[verified]** (run in this repo / on this machine,
> output recorded) or **[not run]** (documented from a first-hand source, no
> end-to-end run possible here). Nothing in this file is written from memory.

## 0. What is being installed

`dsh-task-gantt` is a **bundle plugin** with a browser half — it ships:

| Piece | File | Who reads it |
|---|---|---|
| host half (node, ESM) | `lib/index.js` | the cordis Loader, via `package.json#main` |
| `dsh.bundle` patch layer | `cordis.patch.yml` | `dsh plugin … add` → profile `dsh.profile.bundles` |
| client half (browser) | `lib/client.js` | the host's `clientModules` service, via `exports["./client"]` + `dsh.client` |
| plugin artwork | `icon.svg` | the DSH Plugins page / `plugin_manager` list |

`lib/` is **committed on purpose**: the bundle channel installs the repository
as-is, with no build step on the user's machine (`dsh-better-sidebar`,
`dsh-ego-browser`, `dsh-github-workbench` ship the same way). There are therefore
no `install`-class scripts in `package.json` — the plugin market forbids them
(`/tmp/dsh-better-sidebar-src/AGENTS.md` §1).

`dsh-better-sidebar` is an **optional prerequisite**: the tab is registered into
it, so it must be installed for the panel to appear, but it is deliberately *not*
a dependency of this package (a dependent copy would be a second instance).

## 1. Install

### 1.1 From GitHub (recommended — no build, no npm publish needed)

```bash
cd ~/.dsh && dsh plugin --profile web add "github:xx529/dsh-task-gantt"
```

**[not run]** — `xx529/dsh-task-gantt` does not exist on GitHub yet
(`gh repo view xx529/dsh-task-gantt` → `GraphQL: Could not resolve to a
Repository with the name 'xx529/dsh-task-gantt'`), so the spec cannot be
installed end-to-end today. What *was* verified about this spec form:

* `dsh plugin` forwards its arguments **verbatim to pnpm**
  (`~/.nvm/versions/node/v22.22.2/lib/node_modules/@deepseek-ai/dsh/lib/bin.js:96`:
  `program.command("plugin").description("manage a profile's plugins by
  forwarding the remaining arguments to pnpm in the profile directory")…
  .argument("[args...]", "pnpm arguments, forwarded verbatim (add <pkg>, remove
  <pkg>, why <pkg>, ...)")`), with the profile directory as cwd
  (`…/lib/bin.js:100-104`, `mode: "plugin"`).
* `github:owner/repo` is the form the official DSH docs print for a bundle
  plugin: `dsh plugin --profile web add "github:…"` —
  <https://deepseekdocs.com/en/docs/user-guide/plugins> §2 (*"One-line git
  source (build artifacts are already committed, about 15 seconds)"*).
* The same form installs a real package from a real repo **[verified]**:

  ```console
  $ cd /tmp/pkgprobe/consumer && pnpm add "github:Fisfzy/ego-browser" --config.ignore-scripts=true
  …
  dependencies:
  + dsh-ego-browser 0.8.6
  ```

  with `pnpm 11.22.0` (the version printed by `pnpm --version`; the DSH desktop
  runtime pins `pnpm 11.7.0` in
  `/Applications/DeepSeek Harness.app/Contents/Resources/runtime/versions.json`).
  The installed directory is `node_modules/dsh-ego-browser` — i.e. when the spec
  names no alias, pnpm uses **the package's own `name` from its
  `package.json`**. That is what DSH's loader/reconcile expects.

> ### ⚠️ Do not install it under an alias
>
> `dsh plugin --profile web add "dsh-task-gantt@github:xx529/dsh-task-gantt"`
> also parses — pnpm accepts `alias@github:owner/repo` **[verified: the spec is
> accepted and resolved; with a nonexistent repo it fails only with
> `ERR_PNPM_GIT_RESOLVE_FAILED … repository not found`, and with a real repo it
> installed as `+ ego-alias <- dsh-ego-browser 0.8.6`]** — but it lands the
> package at `node_modules/<alias>` while its inner `package.json` still says
> `"name": "dsh-task-gantt"` **[verified: `require('./node_modules/ego-alias/package.json').name`
> → `dsh-ego-browser`]**. The profile's `dsh.profile.bundles` list and the
> Loader row are keyed by **the package name**, so an alias leaves the names
> disagreeing — the same class of mismatch the loader treats as "warn, then skip"
> (<https://deepseekdocs.com/en/docs/learn/core/plugin-anatomy> §6) and the same
> shape `dshmarket` calls a "fake success" (`src/install.ts`, `validateAddedPlugins`).
> Use the unaliased form in §1.1.

### 1.2 From a local checkout (development)

```bash
cd ~/.dsh && dsh plugin --profile web add "link:/Users/lzx/Documents/GitHub/dsh-task-gantt"
```

**[not run]** (a real install writes the live `~/.dsh/profiles/web` profile; the
Lead runs the mount smoke test, per `docs/TEAM-BRIEF.md` §7). The form is the one
the official docs print for local development —
<https://deepseekdocs.com/en/docs/user-guide/plugins> §2 (*"Local directory
(development): `dsh plugin --profile web add link:/path/to/plugin`"*). `link:` is
one of the source types pnpm accepts for its `add` command.

Rebuild after every source change — `lib/` is a build output, not the source:

```bash
cd /Users/lzx/Documents/GitHub/dsh-task-gantt && pnpm install && pnpm run build
```

### 1.3 Optional: install the prerequisite sidebar

```bash
cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar
```

**[not run]** — already present in this machine's `web` profile
(`~/.dsh/profiles/web/node_modules/dsh-better-sidebar`, `0.22.1`). Without it the
plugin still loads and stays dormant with a single `ctx.logger.warn`, by design.

## 2. Activate

A **bundle** plugin takes effect on the next boot — the official docs print this
as `Restart dsh web after installing`
(<https://deepseekdocs.com/en/docs/user-guide/plugins> §1/§2).

```bash
# stop the running dsh web, then:
dsh web
# hard-refresh the browser page (Cmd+Shift+R)
```

`dsh plugin … add` reconciles the profile's bundle stack itself, so no profile
file needs hand-editing: seeing `dsh.bundle.patch` in the package manifest, the
command appends `dsh-task-gantt` to
`~/.dsh/profiles/web/package.json → dsh.profile.bundles`
(<https://deepseekdocs.com/en/docs/learn/core/plugin-anatomy> §7).

## 3. Verify that the host found it

```bash
dsh web --dump-config | grep -A2 "dsh-task-gantt"
```

**[not run]** (needs the plugin installed in the live profile). The command is
the official verification recipe —
<https://deepseekdocs.com/en/docs/learn/core/plugin-anatomy> §9. A mounted row
looks like `- id: dsh-task-gantt` / `name: dsh-task-gantt`; an **empty result
means the row was silently skipped** (a `name` mismatch only warns — §6 of the
same page).

Offline equivalent, no boot needed:

```bash
node -e "console.log(require(process.env.HOME+'/.dsh/profiles/web/package.json').dsh.profile.bundles)"
```

## 4. Open the panel

1. Open any conversation in the DSH Web UI.
2. In the **right sidebar**, click the **`+`** button (the tab-add control at the
   end of the tab strip).
3. Pick **任务甘特图** (zh) / **Task Gantt** (en) from the list.

The entry's label comes from the tab descriptor's `title` resolver registered by
the client half (`ctx.betterSidebar.registerTab`), not from `package.json`:
`src/client/index.ts` → `title: () => t('tabTitle')`, with `tabTitle` defined in
`src/client/i18n.ts` (zh-CN `任务甘特图`, en `Task Gantt`). It is ranked
`order: 50`, so it sorts after the built-in `terminal-bottom` (40) and before the
default (100).

The tab is `single: true` with `dedupeKey: () => TAB_TYPE_ID`, so the `+` menu
opens one board per session instead of stacking duplicates.

What you should see: one swimlane per teammate (Lead first), a real-time x-axis,
and one bar per task carrying its `subject` and a one-line `description`. The
panel header reports the data source — `log` / `partial` / `live` — and never
asserts a timestamp the session log did not record
(`docs/TEAM-BRIEF.md` §3.4).

## 5. Uninstall

```bash
cd ~/.dsh && dsh plugin --profile web remove dsh-task-gantt
```

**[not run]**. Sub-command name and source:

* `remove <pkg>` is the exact word the DSH CLI documents in its own help text for
  the forwarded arguments —
  `~/.nvm/versions/node/v22.22.2/lib/node_modules/@deepseek-ai/dsh/lib/bin.js:96`
  (`"[args...]", "pnpm arguments, forwarded verbatim (add <pkg>, remove <pkg>, why <pkg>, ...)"`).
* `<package>` is the **package name**, i.e. `dsh-task-gantt` — uninstall is the
  inverse of the unaliased install in §1.1, and an alias is what would break it
  (see the warning there).
* The official docs print the same command —
  <https://deepseekdocs.com/en/docs/user-guide/plugins> §7 (*"Uninstall a bundle:
  `dsh plugin --profile web remove <package>`"*).

⚠️ **`remove` does not rewrite the patch layer.** The same section warns that
uninstalling only deletes the dependency and does **not** remove manually-mounted
`insert` lines from a `cordis.patch.yml`. This package's row comes from its own
bundle patch (`dsh.bundle.patch` → `cordis.patch.yml`), which leaves with the
package, so nothing should be left behind — but if you had also hand-added an
`- insert: - id: dsh-task-gantt` line to
`~/.dsh/profiles/web/cordis.patch.yml`, delete that line too. Check with §3.

## 6. What was actually run for this document

Environment: macOS (darwin/arm64), `pnpm 11.22.0`, `node v22.22.2`,
DSH desktop host `0.2.0-rc.2`
(`~/.dsh/dsh-runtimes/dsh-primary-runtime/runtime.json`), global CLI
`@deepseek-ai/dsh@0.1.2-alpha.2`.

| # | Command | Result |
|---|---|---|
| 1 | `pnpm add "task-gantt-alias@github:xx529/dsh-task-gantt"` (throwaway dir) | `ERR_PNPM_GIT_RESOLVE_FAILED … repository 'https://github.com/xx529/dsh-task-gantt.git/' not found` — syntax accepted, repo absent |
| 2 | `pnpm add "is-odd-test@github:sindresorhus/is-odd"` (throwaway dir) | same resolve error → the two failures are the *repo*, not the spec form |
| 3 | `pnpm add "ego-alias@github:Fisfzy/ego-browser" --config.ignore-scripts=true` | `+ ego-alias <- dsh-ego-browser 0.8.6`; installed `ego-alias/package.json#name` is still `dsh-ego-browser` → the alias mismatch above |
| 4 | `pnpm add "github:Fisfzy/ego-browser" --config.ignore-scripts=true` | `+ dsh-ego-browser 0.8.6`, directory `node_modules/dsh-ego-browser` → the unaliased form is the one that keeps names consistent |
| 5 | `pnpm add "task-gantt-alias@file:../tiny-pkg"` (throwaway dir) | `+ task-gantt-alias <- tiny-pkg 1.0.0`, dependencies got `"task-gantt-alias": "file:../tiny-pkg"` → alias specs are ordinary pnpm syntax |
| 6 | `git archive HEAD \| tar -x -C /tmp/gantt-pipeline-check` + `node scripts/build.mjs` + `node scripts/verify-build.mjs` | the pipeline check in the row below, run against a pristine scaffold so teammates' in-flight sources cannot mask it |
| 7 | `pnpm install --registry https://registry.npmjs.org` | `Packages: +5 … Done in 47.6s using pnpm v11.22.0`; `react`/`react-dom` 18.3.1 resolved |
| 8 | `pnpm run typecheck` (first run, 00:22) | **FAILED — not this task's files**: `src/host/fold.ts` (75 errors, incl. an unterminated template literal) and `src/client/ui/styles.ts:151` had been caught mid-edit by their owners. Nothing in `package.json` / `scripts/**` / `tsconfig.json` / `cordis.patch.yml` / `icon.svg` produced an error |
| 9 | `pnpm run build` (first run, 00:22) | **FAILED** for the same reason (esbuild cannot parse two in-flight files). Superseded by rows 6 and 12 |
| 10 | `node scripts/verify-build.mjs` on a `format: 'iife'` client build | `FAIL … the client factory returned undefined` — see `scripts/build.mjs` |
| 11 | `node scripts/verify-build.mjs` on a `format: 'cjs'` client build | `[verify-build] OK` — host half ESM with `name/inject/apply`, client factory invoked once and returned its exports |
| 12 | `pnpm run build` + `node scripts/verify-build.mjs` (an **intermediate** run, 00:32 — superseded by rows 23–24; those sizes were real at the time, not the shipped ones) | build emitted `lib/index.js` 37.8 kB / `lib/client.js` 69.1 kB; verify `OK`. The bundle's only `require`s are `react` (×3) and `react/jsx-runtime` (×2) — React is **not** inlined, and `grep -c "react.element\|Symbol.for(\"react"` = 0 |
| 13 | `pnpm run pack:check` | `Tarball Contents`: `cordis.patch.yml`, `docs/INSTALL.md`, `icon.svg`, `lib/client.js`, `lib/client.js.map`, `lib/index.d.ts`, `lib/index.js`, `lib/index.js.map`, `locale/en.json`, `locale/zh.json`, `LICENSE`, `package.json`, `README.md`, `README.zh.md` — the manifest, both code halves, the artwork **and both locale files** all travel with the package |
| 14 | `python3 -c "yaml.safe_load(open('cordis.patch.yml'))"` | one top-level array, exactly one `insert` row with exactly the keys `id`/`name` and both `dsh-task-gantt` — the "plain insert" shape `dshmarket`'s hot mount supports (`src/verify.ts`, `parseSimplePatch`) |
| 15 | collision sweep: every `cordis.patch.yml` under `~/.dsh/profiles/web/node_modules/**` + the profile's own patch | 17 distinct loader-row ids in the live profile; `dsh-task-gantt` is **not** among them. (A duplicate row id makes cordis refuse the whole tree — the market uninstalls such a package outright: `dshmarket/src/install.ts`, `validateAddedPlugins` → `conflictingEntryIds`.) |
| 16 | constraint audit over `package.json` | `cordis` in dependencies/peer/optional: **none**; `@deepseek-ai/dsh-*` in peerDependencies: **none**; `install`-class scripts: **none**; `peerDependencies = {"@deepseek-ai/cordis":"^4.0.0"}` |
| 17 | `pnpm run typecheck` (final) | **0 errors** (`tsc -p tsconfig.json --noEmit`). The mid-edit failures in rows 8–9 are gone |
| 18 | `pnpm run test` (final) | `Test Files 14 passed (14)` / `Tests 338 passed \| 1 skipped (339)` |
| 19 | `node -e "import.meta.resolve('dsh-task-gantt/locale/en.json', …)"` from inside the package | resolves → `/Users/lzx/Documents/GitHub/dsh-task-gantt/locale/en.json`. Node's **self-reference** rule makes this the same resolution path the host takes |
| 20 | `node scripts/verify-meta.mjs` with `"./locale/*.json"` removed from `exports` (temporarily) | `FAIL … does not resolve (ERR_PACKAGE_PATH_NOT_EXPORTED)` → the check really does test the `exports` entry, not the file on disk. Restored afterwards (`git diff --stat package.json` = the intended edits only) |
| 21 | `node scripts/verify-meta.mjs` | `[verify-meta] OK`: `dsh-task-gantt/locale/en.json` resolves through `exports`; dictionaries `en, zh` both carry non-empty `meta.title` + `meta.description`; `dsh-task-gantt/package.json` resolves (fallback); `icon ./icon.svg` → `image/svg+xml`, 2277 bytes (limit 262144) |
| 22 | final manifest cross-check | `main`, `exports["./client"]`, `icon`, both locale files and `cordis.patch.yml` all exist; `peerDependencies` is exactly `{"@deepseek-ai/cordis":"^4.0.0"}`; no `cordis` outside it; no `install`-class scripts |
| 23 | **post-commit acceptance** on `f7a7263` (clean tree): `pnpm run build && node scripts/verify-build.mjs && node scripts/verify-meta.mjs && git diff --exit-code HEAD -- lib` | the rebuild is byte-identical (`git status --porcelain` empty afterwards), `[verify-build] OK`, `[verify-meta] OK`, and the F1/F7 gate finally reads **`exit=0`** — the committed artifacts match the sources |
| 24 | `pnpm run check` on the committed tree | **`exit=0`** — the whole documented gate green end to end: `Test Files 14 passed (14)` / `Tests 338 passed \| 1 skipped (339)`, `verify:build` OK, `verify:meta` OK, freshness diff `exit=0` |

**Final gate, all green:** `pnpm run typecheck` 0 errors · `pnpm run test`
338 passed · `pnpm run build` → `lib/index.js` 39.6 KiB (40 502 B) + `lib/client.js` 70.3 KiB (71 996 B) ·
`verify-build` OK · `verify-meta` OK · bundle `require`s are only `react` (×3) and
`react/jsx-runtime` (×2), so React stays the host's singleton.

A throwaway `pnpm` probe also confirmed the `format` switch is what changed row 10
into row 11 — the two builds differ by nothing else.

Rows 1–5 ran in throwaway directories under `/tmp` (`/tmp/pkgprobe/consumer`, and
a sibling probe dir), never in `~/.dsh/profiles/web`. Row 6 ran in
`/tmp/gantt-pipeline-check`. The live profile was not touched by this task.

## 7. There is deliberately no `dsh.plugin.json`

**Decision (owner: `packaging`, confirmed by the Lead): this package does not
ship `dsh.plugin.json`.** Do not add one, and do not "fix" its absence. The file
is not part of the DSH contract, is read by nothing in the current host, and a
hand-written one would be a lie about the plugin's real manifest:

| Claim | Source |
|---|---|
| DSH has no such file; the only real manifest is `package.json`'s `dsh` field | <https://deepseekdocs.com/en/docs/learn/core/plugin-anatomy> §2 — *"There's no `dsh.plugin.json` file: the only real manifest is the `dsh` field in `package.json`."* |
| The current desktop host never reads it | `grep -a -c "dsh.plugin.json" "/Applications/DeepSeek Harness.app/Contents/Resources/app.asar"` → **0** (121 MB archive, plain-text greppable) |
| The plugin market never reads it | `dshmarket@1.10.1`, `grep -rn "dsh.plugin.json\|plugin.json" src/ lib/` → **0**; it reads only `package.json#dsh.bundle`, `package.json#dsh.client`, `exports["./client"]` and `cordis.patch.yml` (`src/verify.ts` `hasDshManifest`/`hasDshLoadableEntry`, `src/profile.ts:121-128`) |
| The market CI never reads it | `grep -n "dsh.plugin.json\|manifestVersion\|icon\|locale" /tmp/awesome-dsh-plugin/contributing.md /tmp/awesome-dsh-plugin/scripts/*.mjs` → **0** |
| It was already dead in 0.1.7, and only serves third-party registry channels | `/tmp/dsh-better-sidebar-src/AGENTS.md:103` (item 11) |
| Published plugins disagree on its schema, and one ships none at all | `dsh-chat-tidy` → `{id, version, main, description, engines.dsh, contributes}`; `dsh-interconnect` → `{name, description, version, entry:{name, inject}}`; `dsh-better-sidebar@0.22.1` → **absent** |

`dsh-ego-browser`'s `dsh-plugin.json` is a *different, older* schema on the TUI
facet line — copying it would have been wrong.

### 7.1 The metadata that *is* read: `package.json#icon` + `locale/*.json`

The host reads a plugin's display metadata in `readPluginMeta()` /
`dictionariesOf()` / `iconOf()`, compiled into
`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`. Transcribed
rules, and where this package satisfies each:

| Host rule (from the archived source) | This package |
|---|---|
| `optionalResourcePath("<pkg>/locale/en.json")` — the **`en.json` is the discovery anchor**; if it does not resolve, the whole locale directory is skipped silently | `locale/en.json` exists and resolves through `exports["./locale/*.json"]` **[verified §6 rows 19–21]** |
| every other `*.json` in that directory is read; its filename must match a language id, lower-cased, and must not collide | `locale/zh.json` → `zh` |
| each file: `meta` must be an object; `meta.title` and `meta.description` must be **non-empty strings** (a blank one **throws**, it is not skipped) | both files carry both keys, non-empty **[verified §6 row 21]** |
| `optionalResourcePath("<pkg>/package.json")` supplies the fallback title (`name`) and description | `exports["./package.json"]` exists and resolves **[verified §6 row 21]** |
| `iconOf(manifest.icon, manifestPath)`: SVG/PNG/JPEG/WebP, a **regular file resolved relative to the manifest directory**, inside it after `realpath`, ≤ **256 KiB**, then inlined as a `data:` URL | `./icon.svg`, 2 277 bytes, inside the package → `image/svg+xml` **[verified §6 row 21]** |
| any failure above becomes a silent `error` diagnostic — the row degrades to plain text | nothing here fails |

The icon is read from disk relative to `package.json` (not through `exports`),
which is why `icon.svg` is listed in `files` but intentionally **not** an export
subpath.

Both halves of this are guarded, so a regression fails loudly instead of
degrading silently:

* `node scripts/verify-build.mjs` (`pnpm run verify:build`) — the two shipped
  **code** artifacts;
* `node scripts/verify-meta.mjs` (`pnpm run verify:meta`) — this **display**
  surface, i.e. the table above. It resolves the locale anchor through Node's
  own resolver (so it fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` if the `exports`
  entry is dropped — §6 row 20) and re-applies the host's icon rules.

`pnpm run check` runs typecheck, tests, build, and both verifiers.

## 8. The three conditions the browser half must satisfy

The client half is not shipped because a file exists — the host's
`client-modules` service decides whether to serve it, and **two of its three
checks fail silently**. Transcribed from
`@deepseek-ai/dsh-client-modules/lib/index.js` as compiled into
`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`:

| # | Host check | Failure mode | This package |
|---|---|---|---|
| 1 | `parseDshClient()` then `if (decl === undefined \|\| decl.platform !== "web") { this.pkgMeta.set(sourceKey, null); return null }` | **silent** — no client bundle routed, no error, no log | `dsh.client.platform = "web"` |
| 2 | `clientExportOf()`: `exports["./client"]` must be a string, or an object whose `default` is a string, else it throws `client-modules: <pkg> exports["./client"] must be a string or an object with a string default`; and if `dsh.client` is declared while `./client` is absent it throws `declares dsh.client but exports no "./client" bundle` | loud | `{ "default": "./lib/client.js" }` |
| 3 | `register()`: when a `chunk` is supplied it must match `^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$` — *"Published package-local client chunk names accepted by the on-demand route"* | loud | no `chunk` supplied; the served file is `lib/client.js` |

Also relevant to how the host serves and caches the bundle: the route is
`/plugins/<id>/client.js&rev=…`, where `rev` is `artifactRevision()` — a hash of
the artifact's **mtime, ctime and size**, not its contents. So a bundle rebuild
invalidates the browser cache, but a rebuild that preserves all three would not.

Check 1 is the one to remember: setting `dsh.client.platform` to anything but
`"web"` makes the plugin vanish from the browser with zero diagnostics.

`tests/manifest.spec.ts` and `tests/bundle.spec.ts` pin these fields, so run
`pnpm run test` before editing `files` / `exports` / `dsh`.

## 9. Publishing preconditions (bundle channel)

`lib/` is committed on purpose — installing from GitHub runs no build step — so a
release must ship a freshly built `lib/`:

```bash
pnpm run build && pnpm run verify:build && pnpm run verify:meta
git add lib && git status --short lib        # must be empty after the add
git diff --exit-code HEAD -- lib             # exits 1 until lib/ is committed
```

⚠️ **The `HEAD` is load-bearing.** `git diff --exit-code -- lib` (without a
revision) compares the **worktree against the index**, so it goes green the
moment `lib/` is staged — while `HEAD` still carries the old bundles, which is
what the released artifact and the CI checkout actually contain. Measured here:

```console
$ git status --porcelain -- lib          # staged, worktree clean
M  lib/client.js
M  lib/index.js
$ git diff --exit-code -- lib        ; echo $?   # 0  ← false green
$ git diff --exit-code HEAD -- lib   ; echo $?   # 1  ← correct
```

The failure mode is a local "green" that CI reports as red — exactly the kind of
disagreement that gets misread as a CI environment problem. Always pass `HEAD`.

`pnpm run check` ends with `git diff --exit-code HEAD -- lib`, which is exactly
this guard: it fails whenever the committed `lib/` and the current sources
disagree. Treat that failure as "re-build and stage `lib/`", never as "the build
is wrong".
