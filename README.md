# claude-code-hud

Statusline overlay for Claude Code — rate limits, context window, session, git, active agents, plugin tracking.

No npm dependencies. Node.js only.

Current version: see [`VERSION`](./VERSION).

---

## Install / update

Two slash commands, same underlying installer:

| Command | Use when |
|---|---|
| `/install-hud` | First time setup |
| `/update-hud` | Pulling a newer version |

Either one works for either purpose — they're aliases for the same idempotent installer. The naming is purely intent-signaling so you don't have to second-guess whether running `/install-hud` again will break something (it won't).

The installer:
- always re-downloads `statusline.mjs` and `hud-config.mjs` from `main`
- writes `~/.claude/hud/.version` so it can show you `Updating X → Y` next time
- leaves your `~/.claude/hud/config.json` untouched
- note: GitHub raw has a 5-minute CDN cache, so a just-pushed version may take up to 5 min to be visible

### One-liner (no Claude Code)

If you don't have Claude Code yet, install directly:

```bash
node -e "const h=require('https'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');const dir=path.join(os.homedir(),'.claude','hud');fs.mkdirSync(dir,{recursive:true});const dest=path.join(dir,'setup.mjs');function get(u,cb){h.get(u,r=>{if(r.statusCode>=300&&r.statusCode<400)return get(r.headers.location,cb);let d='';r.on('data',c=>d+=c);r.on('end',()=>cb(d))}).on('error',e=>{console.error(e.message);process.exit(1)})}get('https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.mjs',s=>{fs.writeFileSync(dest,s);cp.execFileSync(process.execPath,[dest],{stdio:'inherit'})})"
```

### Agent instructions

You are a Claude Code agent. A user pointed you at this repo. Pick exactly one branch:

**Scenario A — user wants to install or update the HUD on their machine**

If the user already has Claude Code with a previously-installed HUD, prefer the slash command matching their intent: `/install-hud` for first-time setup, `/update-hud` to pull a newer version. They are the same idempotent installer under two names — pick the one the user's wording suggests.

If they don't yet have the HUD installed at all (no `~/.claude/hud/` directory), run the one-liner from the section above via the Bash tool. It works without any prior install.

Never edit `~/.claude/hud/*.mjs` directly to "fix" something — those files are managed by `setup.mjs` and overwritten on every install/update.

After the command finishes, tell the user verbatim: **"HUD installed. Restart Claude Code or run `/reload-plugins`, then use `/hud-config` to customize."** Nothing more.

**Scenario B — user wants to change or extend the HUD itself (this repo)**

Read [`CLAUDE.md`](./CLAUDE.md) first. It defines:
- the four-place version-bump rule (`/VERSION`, `statusline.mjs`, `hud-config.mjs`, `setup.mjs`)
- the canonical extension flow (config key → parser → renderer → wire-up → toggle → bump → README)
- code conventions (no npm deps, stdlib only, ANSI inline)

Do not skip the version bump. Do not edit installed copies in `~/.claude/hud/` — work in the repo.

**Scenario C — user is debugging their installed HUD**

Their installed version is in `~/.claude/hud/.version`. Compare with `VERSION` in this repo to determine if an update would help. Their config is `~/.claude/hud/config.json` — never touched by updates.

---

## What gets installed

| Location | Purpose |
|---|---|
| `~/.claude/hud/statusline.mjs` | Main renderer — Claude Code calls this for every statusline update |
| `~/.claude/hud/hud-config.mjs` | Interactive TUI configurator — run in a separate terminal |
| `~/.claude/hud/setup.mjs` | The installer itself — kept around so future `/update-hud` runs don't need to bootstrap |
| `~/.claude/hud/.version` | Currently installed version, written after each install/update |
| `~/.claude/commands/install-hud.md` | Slash command — first-time install |
| `~/.claude/commands/update-hud.md` | Slash command — pull latest version |
| `~/.claude/commands/hud-config.md` | Slash command — opens the configurator |

`setup.mjs` also patches `~/.claude/settings.json` to add:
- `statusLine` → runs `statusline.mjs` on every statusline update
- `UserPromptSubmit` hook → records prompt timestamps for the "last prompt time" element

Your `~/.claude/hud/config.json` is **never** modified by install or update.

---

## Configuration reference

Config lives in `~/.claude/hud/config.json`. All fields are optional — defaults apply for anything omitted.

### Recommended config

Everything on, agents in multiline mode with 5 lines, progress bars enabled.

```json
{
  "colorScheme": "default",
  "modelScheme": "orange",
  "elements": {
    "gitRepo": true,
    "gitBranch": true,
    "gitInfoPosition": "above",
    "model": true,
    "modelFormat": "short",
    "cost": true,
    "rateLimits": true,
    "sessionHealth": true,
    "showSessionDuration": true,
    "contextBar": true,
    "useBars": true,
    "thinking": true,
    "showCallCounts": true,
    "promptTime": false,
    "agents": true,
    "agentsFormat": "multiline",
    "agentsMaxLines": 5,
    "agentsShowModel": true,
    "lastSkill": true,
    "lastPlugin": true,
    "maxOutputLines": 4
  }
}
```

### Session cost (v0.4.0+)

Shows the running session cost on the git/model line, right next to the model name (`cost:$1.23`, always green). The value is `cost.total_cost_usd` exactly as Claude Code reports it — in **USD**.

Toggle off with `"cost": false` in config (or in `/hud-config`).

### Session duration (v0.5.0+)

Shows how long the session has been running (`session:5m`), colored by age (green → yellow → red). The value auto-groups into the largest two units so it stays readable over long sessions — minutes is the smallest unit, days the largest (no months):

| Duration | Output |
|---|---|
| under 1 hour | `5m` |
| 1 hour – 1 day | `2h13m` |
| 1 day+ | `19d1h` |

Toggle off with `"showSessionDuration": false` in config (or in `/hud-config`).

### Folder name next to repo (v0.7.0+)

The `repo:` element shows the git remote's repo name. When the checkout folder is named differently than the repo (e.g. a second working copy `VAC_WIP/` cloned from the `VAC` repo), the folder name is appended so you always know which copy you're in:

```
repo:VAC (VAC_WIP) | branch:main
```

The folder shown is the repo root (the clone directory), even when you're deep in a subdirectory. When folder and repo names match (case-insensitive), nothing extra is shown. Part of the `gitRepo` element — no new config key.

### Plugin tracking (v0.2.0+)

The HUD detects calls made to Claude Code plugin assets — both plugin-namespaced skills (`atlassian:triage-issue`) and plugin-provided MCP tools (`mcp__plugin_atlassian_atlassian__searchJiraIssuesUsingJql`). Two new pieces:

- `🔌N` in the call-counts line — total plugin calls this session
- `plugin:atlassian(mcp)` — name + kind (`skill` or `mcp`) of the most recent plugin call

Toggle off with `"lastPlugin": false` in config.

### All options

Top-level keys:

| Key | Default | Meaning |
|---|---|---|
| `colorScheme` | `default` | HUD palette — see Color schemes below |
| `modelScheme` | `orange` | Color of the model name — see Model scheme below |
| `elements` | — | Per-element toggles and options, see table |
| `thresholds` | — | Warning/critical percentages, see table |
| `contextLimitWarning` | — | Extra warning line near context limit, see below |

`elements`:

| Key | Default | Meaning |
|---|---|---|
| `gitRepo` | `true` | Repo name from the `origin` remote; appends the checkout folder when it differs (v0.7.0+) |
| `gitBranch` | `true` | Current git branch |
| `gitInfoPosition` | `"above"` | Git/model line `"above"` or `"below"` the main HUD line |
| `model` | `true` | Model name |
| `modelFormat` | `"short"` | `"short"` (display name) or `"full"` (model id) |
| `cost` | `true` | Session cost in USD |
| `rateLimits` | `true` | 5-hour and weekly usage with reset countdown |
| `sessionHealth` | `true` | Session duration, colored by age — both this **and** `showSessionDuration` must be on |
| `showSessionDuration` | `true` | See `sessionHealth` |
| `contextBar` | `true` | Context window usage |
| `useBars` | `true` | Progress bars inside rate limits and context |
| `promptTime` | `false` | Time of the last prompt (needs the `UserPromptSubmit` hook the installer adds) |
| `thinking` | `true` | "thinking" indicator while the model reasons |
| `showCallCounts` | `true` | Tool / agent / skill / plugin call counters |
| `callCountsStyle` | `"emoji"` | Counter icons: `"emoji"` (wrench/robot/bolt/plug, works everywhere) or `"nerd"` (coral-tinted monochrome glyphs — see below) |
| `callCountIcons` | `{}` | Per-icon overrides for the nerd style, hex codepoints — see below |
| `agents` | `true` | Running sub-agents |
| `agentsFormat` | `"detailed"` | `count` / `codes` / `detailed` / `multiline` — see below |
| `agentsMaxLines` | `3` | Max agent lines in `multiline` format |
| `agentsShowModel` | `true` | Show each sub-agent's model (v0.3.0+) |
| `lastSkill` | `true` | Most recently invoked skill |
| `lastPlugin` | `true` | Most recent plugin call (v0.2.0+) |
| `backgroundTasks` | `true` | Running OMC background tasks (from `hud-state.json`, if present) |
| `maxOutputLines` | `4` | Hard cap on HUD lines; overflow collapses into `... (+N lines)` |

`thresholds` (all percentages except the session minutes):

| Key | Default | Effect |
|---|---|---|
| `contextWarning` | `70` | Context turns yellow |
| `contextCompactSuggestion` | `80` | Context shows `COMPRESS?` |
| `contextCritical` | `85` | Context turns red, shows `CRITICAL` |
| `rateLimitWarning` | `70` | Rate limit turns yellow |
| `rateLimitCritical` | `90` | Rate limit turns red |
| `sessionWarningMinutes` | `60` | Session duration turns yellow |
| `sessionCriticalMinutes` | `120` | Session duration turns red |

`contextLimitWarning`: `{ "threshold": 80, "autoCompact": false }` — when context usage crosses the threshold, an extra line `Context at N% — consider /compact` is appended.

### Call-count icon styles (v0.8.0+)

`"callCountsStyle": "nerd"` swaps the emoji counters for monochrome [Nerd Font](https://www.nerdfonts.com/) glyphs — pick it in the **Call-count icons** step of `/hud-config` (live preview) or set it in config.

Requirement: **a Nerd Font must be installed on the system** — it does *not* have to be your primary terminal font. Any Nerd Font works ([nerdfonts.com](https://www.nerdfonts.com/font-downloads)):

```bash
brew install --cask font-jetbrains-mono-nerd-font     # macOS
winget install DEVCOM.JetBrainsMonoNerdFont           # Windows
```

How the glyphs reach your terminal differs per platform:

- **macOS** — automatic: system font fallback serves the icons from any installed Nerd Font while regular text keeps your current font. Fully restart the terminal app after installing so the fallback cache refreshes.
- **Windows Terminal / VS Code** — no automatic fallback for these glyphs; add the Nerd Font to the font *list* instead (main font stays first): `"font": { "face": "Cascadia Mono, JetBrainsMono Nerd Font" }` (Windows Terminal) or `"terminal.integrated.fontFamily": "Consolas, 'JetBrainsMono Nerd Font'"` (VS Code).
- **Legacy conhost (cmd.exe)** — no fallback chain; the Nerd Font must be set as the console font.

If the icons show as `?` boxes, the font isn't reachable — set the terminal font to the Nerd Font directly as a last resort.

The default stays `"emoji"`, which needs nothing.

The default nerd set is `md-tools`, `md-robot`, `md-flash`, `md-usb`, tinted coral (Claude brand `#D97757`, 256-color-safe). Each icon can be replaced with any Nerd Font glyph via `callCountIcons` — hex codepoints, all keys optional:

```json
"callCountIcons": { "tools": "f1323", "agents": "f06a9", "skills": "f0241", "plugins": "f0431" }
```

Find codepoints on the [Nerd Fonts cheat sheet](https://www.nerdfonts.com/cheat-sheet) (the `nf-md-*` Material Design range is the most reliable through font fallback). Invalid values silently fall back to the defaults.

### Color schemes

| Value | Description |
|---|---|
| `default` | Green / yellow / red — standard ANSI |
| `colorBlind` | Cyan / yellow / magenta — deuteranopia & protanopia safe (IBM CVD palette) |
| `highContrast` | Bright tier throughout — WCAG AA/AAA |
| `viridis` | Perceptually uniform, CVD safe — requires truecolor terminal |
| `cividis` | NASA peer-reviewed CVD safe — requires truecolor terminal |

### Model scheme (v0.6.0+)

Colors the model name on the git/model line (`model:Opus 4.8`). Set top-level `"modelScheme"` in config, or pick it in the **Model scheme** step of `/hud-config` (live preview per option).

| Value | Color |
|---|---|
| `plain` | terminal default (no color) |
| `orange` | 256-color orange — **default** |
| `coral` | Claude brand `#D97757` — requires truecolor terminal |
| `magenta` | basic ANSI magenta |
| `brightMagenta` | bright ANSI magenta |
| `blue` | bright ANSI blue |
| `white` | bright ANSI white |

### `agentsFormat` values

| Value | Output |
|---|---|
| `count` | `agents:2` |
| `codes` | `agents:ea` |
| `detailed` | `agents:[explore(Opus 4.8),exec]` |
| `multiline` | header + one line per agent |

### Sub-agent model (v0.3.0+)

The `detailed` and `multiline` formats show which model each running sub-agent is on (`Opus 4.8`, `Fable 5`, …), read from the per-agent transcript files Claude Code writes under `<session>/subagents/`.

Toggle the model off with `"agentsShowModel": false` (or press `m` in the agents section of `/hud-config`).
