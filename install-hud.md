---
description: Nainstaluje Claude Code HUD overlay (statusline s rate limity, context window, git info, agenty)
allowed-tools: [Bash, Write]
---

Nainstaluj Claude Code HUD z https://github.com/TomasHolas/claude-code-hud

## Postup

1. Vytvoř složku `~/.claude/hud/` pokud neexistuje
2. Stáhni tyto soubory z raw.githubusercontent.com/TomasHolas/claude-code-hud/main/ do `~/.claude/hud/`:
   - `statusline.mjs`
   - `hud-config.mjs`
   - `setup.sh`
3. Spusť `bash ~/.claude/hud/setup.sh`
4. Řekni uživateli, že instalace je hotová a ať restartuje Claude Code (nebo zadá `/reload-plugins`), pak může použít `/hud-config` pro nastavení
