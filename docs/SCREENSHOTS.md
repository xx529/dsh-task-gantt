# Screenshots — inventory, capture plan, and market declaration

> **Status: placeholders.** No real screenshots exist yet. The images listed
> below are captured by the **Lead** during the real-machine mount smoke test
> (`cd ~/.dsh && dsh plugin --profile web add …`, restart `dsh web`, hard-refresh
> the GUI, open the right sidebar). Until then the README references this file
> instead of pretending an image exists.

## 1. What we need

| File | Shot | Why it must exist |
|---|---|---|
| `assets/screenshot-1-board.png` | **Board overview** — the whole panel: lane headers on the left (Lead + teammates + status dot), the time axis with local HH:mm ticks, the "now" line, turn bands with step bars inside, and task chips on their lanes | This is the one image that has to explain the plugin in two seconds; it is also the image the market detail view shows first |
| `assets/screenshot-2-task-detail.png` | **Task card detail** — one task hovered/selected, showing full `subject`, the one-line `description`, status, owner, `blockedBy`, `writeScopes` and `ready` | Proves the "bar content = subject + summary" claim in the README, and shows the fields the shared task board actually publishes |
| `assets/screenshot-3-degraded.png` | **Degraded state** — the panel with `source: 'live'` or `'partial'` and a visible note, plus at least one task with an empty `history` drawn at its current position and labelled as live | The one honest shot: it shows the chart is not fabricating intervals. Without it the plugin's main design promise (never invent timestamps) is unverifiable by a reader |

Optional fourth shot, only if the empty state is reachable without staging a
fake team: the "No agent team in this session" state.

## 2. Capture requirements

- **Real UI only.** No mock-ups, no collage, no annotation text baked into the
  image — the catalog rules call a description a *claim* that gets checked
  against the code, and an annotated screenshot is easy to read as one.
  (Source: <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md> —
  "The description must be accurate … it is checked against your code".)
- **Chinese and English.** The plugin picks its language from the page
  (`src/client/i18n.ts:68-82`), and the tab title is zh `任务甘特图` / en
  `Task Gantt` (`src/client/i18n.ts:11,41`). One screenshot per language for the
  overview shot is enough; keep the file names parallel.
- **Do not fake a running team.** If the mounted profile has no live agent team,
  capture the empty state and say so in the README rather than staging one.
- **PNG**, window width ≥ 1000 px so the time axis is legible, and cropped to the
  sidebar panel (a full-desktop shot makes the chart unreadable at market-card
  size).

## 3. Where the files go

```
/Users/lzx/Documents/GitHub/dsh-task-gantt/
├── README.md              # embeds the images
├── README.zh.md           # embeds the same images
├── screenshots.json       # market declaration (see §4)
└── assets/
    ├── screenshot-1-board.png
    ├── screenshot-2-task-detail.png
    └── screenshot-3-degraded.png
```

`assets/` does **not** need to be in the npm `files` allow-list: the market
declaration is read from the repository, not from the tarball (see §4).

## 4. Declaring them to the plugin market

The catalog asks authors to declare screenshots **in their own repository**, as
`screenshots.json` next to `package.json`:

```jsonc
// screenshots.json
[
  "assets/screenshot-1-board.png",
  "assets/screenshot-2-task-detail.png",
  "assets/screenshot-3-degraded.png"
]
```

Rules that apply to us, verbatim from the catalog contributing guide
(<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>,
"### Screenshots"):

| Rule | Our compliance |
|---|---|
| 1–8 images | 3 planned |
| Paths are relative to `screenshots.json` and must stay inside the plugin directory (no leading `/`, no `..`) | `assets/*.png` — compliant |
| Absolute URLs are accepted only when they are **https on GitHub hosting** (`raw.githubusercontent.com`, `user-images.githubusercontent.com`, `camo.githubusercontent.com`, `github.com` attachments); third-party image hosts are rejected for user-privacy reasons | we use relative paths, so this does not apply |
| Declaring nothing is allowed — the market falls back to extracting images from the README | we declare, to control order and selection |
| `{"screenshots": [...]}` is also accepted as a named-field form | the array form is used |

**Owner note:** `screenshots.json` is not in any teammate's declared write scope
(`docs/TEAM-BRIEF.md` §6 assigns the repo root to packaging). The Lead should
either assign it to `packaging` or add it directly when the images land.

## 5. README embed convention

Once the files exist, the README placeholder block is replaced with:

```markdown
![dsh-task-gantt — agent-team task Gantt chart in the DSH sidebar](assets/screenshot-1-board.png)
```

and the other two images go in the "Reading the chart" section (detail) and the
"Degraded states" section (degraded). Until then both READMEs point at this file
and say the screenshots are pending.
