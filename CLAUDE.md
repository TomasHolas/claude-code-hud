# claude-code-hud — agent instructions

This is the Claude Code HUD repo. Read this file fully before changing anything.

## What this repo does

Provides a custom statusline for Claude Code. Users install/update it via two slash commands — `/install-hud` and `/update-hud` — both point at the same idempotent installer (`setup.mjs`). The names are intent-signals only; functionally they are identical. `setup.mjs` downloads `statusline.mjs` (the renderer Claude Code invokes on every statusline update) and `hud-config.mjs` (a TUI configurator the user runs separately) into `~/.claude/hud/`, writes `.version` for tracking, and registers both slash commands in `~/.claude/commands/`.

## Where work happens

| If you are… | Edit files in… | Don't touch… |
|---|---|---|
| Adding a feature to the HUD | this repo (`~/dev/claude-code-hud/` or wherever it's cloned) | `~/.claude/hud/` — those get overwritten by `setup.mjs` |
| Testing your change locally | this repo, then run `node setup.mjs` to deploy to `~/.claude/hud/` | the user's `config.json` |
| Helping a user debug their install | their `~/.claude/hud/.version` + `config.json` (read-only) | repo `main` unless they asked |

## Versioning policy

Every user-visible code change MUST bump the version. Four places hold the version and they MUST stay in lockstep:

| File | Form |
|---|---|
| `/VERSION` | single line, e.g. `0.2.0` |
| `statusline.mjs` | `const VERSION = '0.2.0';` near top |
| `hud-config.mjs` | `const VERSION = '0.2.0';` near top |
| `setup.mjs` | `const VERSION = '0.2.0';` near top |

Semver:
- **patch** (`0.2.0 → 0.2.1`): bug fix, no new config keys, no behavior change for existing configs
- **minor** (`0.2.0 → 0.3.0`): new element / new config key / new feature; existing configs keep working
- **major** (`0.x → 1.0`): breaking change to config schema or output contract

When in doubt, prefer minor. Pure refactors that don't change behavior don't need a bump but are fine to bundle with the next real change.

## Update mechanism

`/install-hud` is the install AND update command. `setup.mjs`:
1. Reads `~/.claude/hud/.version` (the installed version, may be missing on first install)
2. **Always** re-downloads `statusline.mjs` and `hud-config.mjs` from `main` (no `existsSync` skip — that's the whole point of the update path)
3. Writes the new `.version` file
4. Prints `Updating X → Y` / `Already at X — reinstalling` / `Installing X`

User's `config.json` is never touched on update — it lives next to the installed files and is theirs.

## Repo layout

| File | Purpose |
|---|---|
| `statusline.mjs` | Renderer Claude Code invokes on every statusline update |
| `hud-config.mjs` | Interactive TUI configurator the user runs separately |
| `setup.mjs` | Installer/updater downloaded by `/install-hud` |
| `VERSION` | Source of truth for the version number |
| `README.md` | User-facing docs — install, update, config reference |
| `install-hud.md`, `setup.sh` | Legacy install entrypoints |

## Code conventions

- No npm dependencies. Node.js stdlib only.
- ESM (`.mjs`), top-level `import`.
- ANSI escapes inline as `\x1b[...]` — no `chalk`.
- Statusline output is one or more lines to stdout; never write to stderr unless fatal.
- Transcript parser reads only the last ~500 KB of the JSONL — don't break that invariant.

## When the user asks to "extend the HUD"

The canonical extension flow:
1. Add a config key under `elements` in `DEFAULT_CONFIG` (statusline.mjs)
2. Extend `parseTranscript()` if you need new transcript-derived state
3. Add a `renderX()` function
4. Wire it into `main()` and `needsTranscript` if it depends on the transcript
5. Optionally add a toggle step in `hud-config.mjs`
6. Bump VERSION in all four places
7. Update README

See the plugin tracking feature (`lastPlugin`, `pluginCallCount`) as a worked example.
