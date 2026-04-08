---
description: Install Claude Code HUD overlay (statusline with rate limits, context window, git info, agents)
allowed-tools: [Bash, Write]
---

Install Claude Code HUD from https://github.com/TomasHolas/claude-code-hud

## Steps

1. Create `~/.claude/hud/` directory if it doesn't exist
2. Download these files from raw.githubusercontent.com/TomasHolas/claude-code-hud/main/ into `~/.claude/hud/`:
   - `statusline.mjs`
   - `hud-config.mjs`
   - `setup.sh`
3. Run `bash ~/.claude/hud/setup.sh`
4. Tell the user installation is complete and to restart Claude Code (or run `/reload-plugins`), then use `/hud-config` to customize the display
