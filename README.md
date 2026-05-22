# claude-code-hud

Statusline overlay for Claude Code — rate limits, context window, session, git, active agents, plugin tracking.

No npm dependencies. Node.js only.

Current version: see [`VERSION`](./VERSION).

---

## Install / update

`/install-hud` is **both** install and update. Run it once for the first install, run it again whenever you want the latest version.

The installer:
- always re-downloads `statusline.mjs` and `hud-config.mjs` from `main`
- writes `~/.claude/hud/.version` so it can show you `Updating X → Y` next time
- leaves your `~/.claude/hud/config.json` untouched

### One-liner (no Claude Code)

If you don't have Claude Code yet, install directly:

```bash
node -e "const h=require('https'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');const dir=path.join(os.homedir(),'.claude','hud');fs.mkdirSync(dir,{recursive:true});const dest=path.join(dir,'setup.mjs');function get(u,cb){h.get(u,r=>{if(r.statusCode>=300&&r.statusCode<400)return get(r.headers.location,cb);let d='';r.on('data',c=>d+=c);r.on('end',()=>cb(d))}).on('error',e=>{console.error(e.message);process.exit(1)})}get('https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.mjs',s=>{fs.writeFileSync(dest,s);cp.execFileSync(process.execPath,[dest],{stdio:'inherit'})})"
```

### Agent instructions

When a user shares this repo and asks to install it, run the one-liner above via the Bash tool. After it finishes, tell the user: **"HUD installed. Restart Claude Code or run `/reload-plugins`, then use `/hud-config` to customize."**

---

## What gets installed

| File | Purpose |
|---|---|
| `statusline.mjs` | Main renderer — Claude Code calls this for every statusline update |
| `hud-config.mjs` | Interactive TUI configurator — run in a separate terminal |
| `setup.sh` | Patches `~/.claude/settings.json` and adds the `/hud-config` command |

`setup.sh` adds two things to `settings.json`:
- `statusLine` → runs `statusline.mjs` on every update
- `UserPromptSubmit` hook → records prompt timestamps for the "last prompt time" element

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
    "lastSkill": true,
    "lastPlugin": true,
    "maxOutputLines": 4
  }
}
```

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
| `detailed` | `agents:[explore(2m),exec]` |
| `multiline` | header + one line per agent |
