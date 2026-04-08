# Claude Code HUD

Standalone statusline overlay pro Claude Code. Zobrazuje rate limity, context window, session, git info, aktivní agenty a další — živě ve spodní části terminálu.

Žádné npm závislosti — čistý Node.js.

---

## Instalace

### 1. Zkopíruj soubory

```
~/.claude/hud/
├── statusline.mjs    ← hlavní renderer
└── config.json       ← tvoje konfigurace (vytvoří /hud-config)
```

### 2. Přidej do `~/.claude/settings.json`

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

### 3. Nakonfiguruj HUD

Spusť v Claude Code:

```
/hud-config
```

Průvodce tě provede volbou barevného schématu a výběrem co chceš zobrazovat. Config se uloží do `~/.claude/hud/config.json`. Příkaz můžeš spustit kdykoli znovu a upravit nastavení.

### Požadavky

- Node.js ≥ 18
- Claude Code s podporou `statusLine`
- Pro schémata `viridis` a `cividis`: terminál s truecolor podporou (iTerm2, Kitty, Alacritty, Windows Terminal, VS Code)

---

## Barevná schémata

Přepínají se přes `colorScheme` v `config.json` nebo přes `/hud-config`.

| Schéma | ok | warning | critical | accent | Poznámka |
|---|---|---|---|---|---|
| `default` | zelená | žlutá | červená | cyan | Klasické ANSI 16 barev |
| `colorBlind` | bright cyan | bright žlutá | bright magenta | bright modrá | Bezpečné pro deuteranopii/protanopii (IBM CVD palette) |
| `highContrast` | bright zelená | bright žlutá | bright magenta | bright cyan | WCAG AA/AAA kontrast |
| `viridis` | tyrkys-zelená | žluto-zelená | bright žlutá | slate modrá | Perceptuálně uniformní, CVD safe, truecolor |
| `cividis` | olivová zelená | limetka | bright žlutá | teal | NASA peer-reviewed CVD safe (deuteranopie, protanopie, tritanopie), truecolor |

---

## Elementy

### Git info řádek

| Element | Popis | Výchozí |
|---|---|---|
| `gitRepo` | Název repozitáře | `true` |
| `gitBranch` | Aktuální větev | `true` |
| `gitInfoPosition` | `"above"` / `"below"` hlavního HUD | `"above"` |
| `model` | Název modelu | `true` |
| `modelFormat` | `"short"` (Sonnet 4.6) / `"full"` (model ID) | `"short"` |
| `profile` | Název profilu z `CLAUDE_PROFILE_NAME` | `false` |

### Hlavní HUD řádek

| Element | Popis | Výchozí |
|---|---|---|
| `rateLimits` | Rate limity 5h a týdenní | `true` |
| `sessionHealth` + `showSessionDuration` | Délka session (`session:5m`) | `true` |
| `contextBar` | Využití context window (`ctx:45%`) | `true` |
| `useBars` | Progress bar `[████░░░░░░]` místo pouhého procenta | `true` |
| `promptTime` | Čas posledního promptu | `false` |
| `thinking` | Indikátor extended thinking (viditelný 30s) | `true` |
| `showCallCounts` | Počty volání `🔧42 🤖7 ⚡3` | `true` |
| `agents` | Aktivní agenti | `true` |
| `agentsFormat` | `"count"` / `"codes"` / `"detailed"` / `"multiline"` | `"detailed"` |
| `agentsMaxLines` | Max řádků v multiline módu | `3` |
| `lastSkill` | Naposledy použitý skill | `true` |
| `backgroundTasks` | Background tasky (vyžaduje OMC state) | `false` |

### `agentsFormat` možnosti

| Hodnota | Ukázka |
|---|---|
| `count` | `agents:2` |
| `codes` | `agents:ea` |
| `detailed` | `agents:[explore(2m),exec]` |
| `multiline` | hlavička + řádek pro každého agenta |

### Layout

| Element | Popis | Výchozí |
|---|---|---|
| `maxOutputLines` | Max počet řádků celkem | `4` |

---

## Ruční konfigurace

`~/.claude/hud/config.json` — stačí uvést jen hodnoty které chceš změnit, zbytek se vezme z výchozích.

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
  },
  "thresholds": {
    "contextWarning":           70,
    "contextCompactSuggestion": 80,
    "contextCritical":          85,
    "rateLimitWarning":         70,
    "rateLimitCritical":        90,
    "sessionWarningMinutes":    60,
    "sessionCriticalMinutes":   120
  }
}
```

---

## Zdroje dat

| Data | Odkud |
|---|---|
| Rate limity, ctx%, session, model | stdin JSON od Claude Code |
| Git branch / repo | `git` (timeout 1s) |
| Agenti, thinking, call counts, skills | Parsing transkriptu (posledních 500 KB) |
| Prompt time | `~/.claude/hud/.prompt-time.json` (UserPromptSubmit hook) |
| Background tasks | OMC `hud-state.json` (volitelné) |
