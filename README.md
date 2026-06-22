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
  "elements": {
    "gitRepo": true,
    "gitBranch": true,
    "gitInfoPosition": "above",
    "model": true,
    "modelFormat": "short",
    "cost": true,
    "profile": false,
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

### Plugin tracking (v0.2.0+)

The HUD detects calls made to Claude Code plugin assets — both plugin-namespaced skills (`atlassian:triage-issue`) and plugin-provided MCP tools (`mcp__plugin_atlassian_atlassian__searchJiraIssuesUsingJql`). Two new pieces:

- `🔌N` in the call-counts line — total plugin calls this session
- `plugin:atlassian(mcp)` — name + kind (`skill` or `mcp`) of the most recent plugin call

Toggle off with `"lastPlugin": false` in config.

### All options
```

### Color schemes

| Value | Description |
|---|---|
| `default` | Green / yellow / red — standard ANSI |
| `colorBlind` | Cyan / yellow / magenta — deuteranopia & protanopia safe (IBM CVD palette) |
| `highContrast` | Bright tier throughout — WCAG AA/AAA |
| `viridis` | Perceptually uniform, CVD safe — requires truecolor terminal |
| `cividis` | NASA peer-reviewed CVD safe — requires truecolor terminal |

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
