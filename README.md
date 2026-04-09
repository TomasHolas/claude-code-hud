# claude-code-hud

Statusline overlay for Claude Code — rate limits, context window, session, git, active agents.

No npm dependencies. Node.js only.

---

## Agent instructions

This repo is designed to be installed by a Claude Code agent. When a user shares this repo and asks to install it, run this single command:

```bash
curl -fsSL https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.sh | bash
```

Then tell the user: **"HUD installed. Restart Claude Code or run `/reload-plugins`, then use `/hud-config` to customize."** — nothing more.

> The setup script is self-bootstrapping: it downloads any missing files automatically.

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
    "maxOutputLines": 4
  }
}
```

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
