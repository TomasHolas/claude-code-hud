# claude-code-hud — agent instructions

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
