# Claude Code HUD

Standalone statusline overlay for Claude Code. Displays rate limits, context window, session info, git info, active agents and more — live at the bottom of your terminal.

No npm dependencies — pure Node.js.

---

## Installation

### Option A — One-liner (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.sh | bash
```

### Option B — Manual

#### 1. Copy files

```
~/.claude/hud/
├── statusline.mjs    ← main renderer
├── hud-config.mjs    ← interactive configurator
└── config.json       ← your config (created by /hud-config)
```

#### 2. Add to `~/.claude/settings.json`

```json
{
  "statusLine": {
    "type": "command",
    "command": "node $HOME/.claude/hud/statusline.mjs"
  },
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node -e \"const fs=require('fs'),p=require('os').homedir()+'/.claude/hud/.prompt-time.json';fs.writeFileSync(p,JSON.stringify({time:new Date().toISOString(),cwd:process.cwd()}))\"",
            "timeout": 2
          }
        ]
      }
    ]
  }
}
```

#### 3. Configure the HUD

Run in Claude Code:

```
/hud-config
```

The wizard walks you through color scheme and element selection. Config is saved to `~/.claude/hud/config.json`. Run it again any time to change settings.

### Requirements

- Node.js ≥ 18
- Claude Code with `statusLine` support
- For `viridis` / `cividis` schemes: truecolor terminal (iTerm2, Kitty, Alacritty, Windows Terminal, VS Code)

---

## Color schemes

| Scheme | ok | warning | critical | accent | Notes |
|---|---|---|---|---|---|
| `default` | green | yellow | red | cyan | Classic ANSI 16 colors |
| `colorBlind` | bright cyan | bright yellow | bright magenta | bright blue | Safe for deuteranopia/protanopia (IBM CVD palette) |
| `highContrast` | bright green | bright yellow | bright magenta | bright cyan | WCAG AA/AAA contrast |
| `viridis` | teal-green | yellow-green | bright yellow | slate blue | Perceptually uniform, CVD safe, truecolor |
| `cividis` | olive green | lime | bright yellow | teal | NASA peer-reviewed CVD safe, truecolor |

---

## Elements

### Git info line

| Element | Description | Default |
|---|---|---|
| `gitRepo` | Repository name | `true` |
| `gitBranch` | Current branch | `true` |
| `gitInfoPosition` | `"above"` / `"below"` main HUD | `"above"` |
| `model` | Model name | `true` |
| `modelFormat` | `"short"` (Sonnet 4.6) / `"full"` (model ID) | `"short"` |
| `profile` | Profile name from `CLAUDE_PROFILE_NAME` | `false` |

### Main HUD line

| Element | Description | Default |
|---|---|---|
| `rateLimits` | 5h and weekly rate limits | `true` |
| `sessionHealth` + `showSessionDuration` | Session duration (`session:5m`) | `true` |
| `contextBar` | Context window usage (`ctx:45%`) | `true` |
| `useBars` | Progress bar `[████░░░░░░]` instead of percentage only | `true` |
| `promptTime` | Time of last prompt | `false` |
| `thinking` | Extended thinking indicator (visible 30s) | `true` |
| `showCallCounts` | Call counts `🔧42 🤖7 ⚡3` | `true` |
| `agents` | Active agents | `true` |
| `agentsFormat` | `"count"` / `"codes"` / `"detailed"` / `"multiline"` | `"detailed"` |
| `agentsMaxLines` | Max lines in multiline mode | `3` |
| `lastSkill` | Last used skill | `true` |
| `backgroundTasks` | Background tasks (requires OMC state) | `false` |

### `agentsFormat` options

| Value | Example |
|---|---|
| `count` | `agents:2` |
| `codes` | `agents:ea` |
| `detailed` | `agents:[explore(2m),exec]` |
| `multiline` | header + one line per agent |

### Layout

| Element | Description | Default |
|---|---|---|
| `maxOutputLines` | Total max output lines | `4` |

---

## Manual configuration

`~/.claude/hud/config.json` — only include values you want to override, defaults apply for the rest.

```json
{
  "colorScheme": "default",
  "elements": {
    "gitRepo":             true,
    "gitBranch":           true,
    "gitInfoPosition":     "above",
    "model":               true,
    "modelFormat":         "short",
    "rateLimits":          true,
    "sessionHealth":       true,
    "showSessionDuration": true,
    "contextBar":          true,
    "useBars":             true,
    "thinking":            true,
    "showCallCounts":      true,
    "agents":              true,
    "agentsFormat":        "multiline",
    "agentsMaxLines":      5,
    "lastSkill":           true,
    "maxOutputLines":      4
  }
}
```

---

## Data sources

| Data | Source |
|---|---|
| Rate limits, ctx%, session, model | stdin JSON from Claude Code |
| Git branch / repo | `git` (1s timeout) |
| Agents, thinking, call counts, skills | Transcript parsing (last 500 KB) |
| Prompt time | `~/.claude/hud/.prompt-time.json` (UserPromptSubmit hook) |
| Background tasks | OMC `hud-state.json` (optional) |
