#!/usr/bin/env bash
# Claude Code HUD — instalační skript
# Použití: bash ~/.claude/hud/setup.sh

set -euo pipefail

HUD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETTINGS="$HOME/.claude/settings.json"
COMMANDS_DIR="$HOME/.claude/commands"

echo "Claude Code HUD — instalace"
echo "────────────────────────────"

# ── 1. Zkontroluj Node.js ──────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "✗ Node.js nenalezen. Nainstaluj Node.js ≥ 18 a spusť znovu."
  exit 1
fi
NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
echo "✓ Node.js $NODE_VER"

# ── 2. Zkontroluj soubory ─────────────────────────────────────────────────
for f in statusline.mjs hud-config.mjs; do
  if [[ ! -f "$HUD_DIR/$f" ]]; then
    echo "✗ Chybí soubor: $HUD_DIR/$f"
    exit 1
  fi
done
echo "✓ HUD soubory nalezeny v $HUD_DIR"

# ── 3. Aktualizuj settings.json ───────────────────────────────────────────
mkdir -p "$HOME/.claude"

# Pokud settings.json neexistuje, vytvoř prázdný
if [[ ! -f "$SETTINGS" ]]; then
  echo "{}" > "$SETTINGS"
fi

# Přidej statusLine a hook pomocí Node.js (bezpečné mergování JSON)
node - "$SETTINGS" "$HUD_DIR" <<'EOF'
const fs = require('fs');
const path = require('path');
const settingsPath = process.argv[2];

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch {}

// statusLine
cfg.statusLine = {
  type: 'command',
  command: 'node $HOME/.claude/hud/statusline.mjs'
};

// UserPromptSubmit hook
const hook = {
  type: 'command',
  command: 'node -e "const fs=require(\'fs\'),p=require(\'os\').homedir()+\'/.claude/hud/.prompt-time.json\';fs.writeFileSync(p,JSON.stringify({time:new Date().toISOString(),cwd:process.cwd()}))"',
  timeout: 2
};

if (!cfg.hooks) cfg.hooks = {};
if (!cfg.hooks.UserPromptSubmit) cfg.hooks.UserPromptSubmit = [];

// Přidej jen pokud tam ještě není
const already = cfg.hooks.UserPromptSubmit.some(
  e => e.hooks && e.hooks.some(h => h.command && h.command.includes('.prompt-time.json'))
);
if (!already) {
  cfg.hooks.UserPromptSubmit.push({ matcher: '*', hooks: [hook] });
}

fs.writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
console.log('✓ settings.json aktualizován');
EOF

# ── 4. Přidej /hud-config command ─────────────────────────────────────────
mkdir -p "$COMMANDS_DIR"
cat > "$COMMANDS_DIR/hud-config.md" <<'MDEOF'
---
description: Konfigurátor HUD overlay
allowed-tools: []
---

Řekni uživateli, ať spustí tento příkaz v novém terminálu:

```
node ~/.claude/hud/hud-config.mjs
```

A až skončí, ať zde zadá `/reload-plugins` pro aktualizaci HUD.
MDEOF
echo "✓ /hud-config command přidán"

# ── 5. Hotovo ─────────────────────────────────────────────────────────────
echo ""
echo "✓ HUD nainstalován!"
echo ""
echo "  Restartuj Claude Code (nebo použij /reload-plugins)"
echo "  Pro nastavení: /hud-config"
echo ""