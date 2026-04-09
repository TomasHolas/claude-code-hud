---
description: Install or reinstall Claude Code HUD overlay
allowed-tools: [Bash]
---

Install Claude Code HUD overlay.

**Unix / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.sh | bash
```

**Windows (PowerShell) or if Bash is unavailable:**
```powershell
irm https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.mjs | node
```

When setup completes, tell the user: **"HUD installed. Restart Claude Code or run `/reload-plugins`, then use `/hud-config` to customize."**
