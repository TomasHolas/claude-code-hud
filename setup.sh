#!/usr/bin/env bash
# Claude Code HUD — installer
# Usage: bash ~/.claude/hud/setup.sh

set -euo pipefail

HUD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETTINGS="$HOME/.claude/settings.json"
COMMANDS_DIR="$HOME/.claude/commands"

echo "Claude Code HUD — installer"
echo "────────────────────────────"

# ── 1. Check Node.js ──────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "✗ Node.js not found. Install Node.js ≥ 18 and try again."
  exit 1
fi
NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
echo "✓ Node.js $NODE_VER"

# ── 2. Check required files ───────────────────────────────────────────────
for f in statusline.mjs hud-config.mjs; do
  if [[ ! -f "$HUD_DIR/$f" ]]; then
    echo "✗ Missing file: $HUD_DIR/$f"
    exit 1
  fi
done
echo "✓ HUD files found in $HUD_DIR"

# ── 3. Update settings.json ───────────────────────────────────────────────
mkdir -p "$HOME/.claude"

if [[ ! -f "$SETTINGS" ]]; then
  echo "{}" > "$SETTINGS"
fi

node - "$SETTINGS" <<'EOF'
const fs = require('fs');
const settingsPath = process.argv[2];

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch {}

cfg.statusLine = {
  type: 'command',
  command: 'node $HOME/.claude/hud/statusline.mjs'
};

const hook = {
  type: 'command',
  command: 'node -e "const fs=require(\'fs\'),p=require(\'os\').homedir()+\'/.claude/hud/.prompt-time.json\';fs.writeFileSync(p,JSON.stringify({time:new Date().toISOString(),cwd:process.cwd()}))"',
  timeout: 2
};

if (!cfg.hooks) cfg.hooks = {};
if (!cfg.hooks.UserPromptSubmit) cfg.hooks.UserPromptSubmit = [];

const already = cfg.hooks.UserPromptSubmit.some(
  e => e.hooks && e.hooks.some(h => h.command && h.command.includes('.prompt-time.json'))
);
if (!already) {
  cfg.hooks.UserPromptSubmit.push({ matcher: '*', hooks: [hook] });
}

fs.writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
console.log('✓ settings.json updated');
EOF

# ── 4. Add /hud-config command ────────────────────────────────────────────
mkdir -p "$COMMANDS_DIR"
cat > "$COMMANDS_DIR/hud-config.md" <<'MDEOF'
---
description: HUD overlay configurator
allowed-tools: []
---

Tell the user to run this command in a new terminal:

```
node ~/.claude/hud/hud-config.mjs
```

When done, type `/reload-plugins` here to apply the changes.
MDEOF
echo "✓ /hud-config command added"

# ── 5. Done ───────────────────────────────────────────────────────────────
echo ""
echo "✓ HUD installed!"
echo ""
echo "  Restart Claude Code (or run /reload-plugins)"
echo "  To configure: /hud-config"
echo ""
