# Changelog

All notable changes to claude-code-hud are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.8.0] - 2026-07-17

### Added
- **`callCountsStyle` config key** — the call-count icons can now render as
  monochrome Nerd Font glyphs (`"nerd"`, coral-tinted) instead of color emoji
  (`"emoji"`, default). Requires a Nerd Font installed on the system — not
  necessarily as the terminal font (OS font fallback serves the glyphs).
- **`callCountIcons` config key** — per-icon overrides for the nerd style,
  as hex codepoints: `{ "tools": "f1323", "plugins": "f0431" }`.
- **Call-count icons step in `/hud-config`** — pick emoji vs Nerd Font style
  interactively with a live preview of both.

## [0.7.0] - 2026-07-17

### Added
- **Folder name next to repo.** When the checkout folder is named differently
  than the remote repo (e.g. a second working copy `VAC_WIP/` of the `VAC`
  repo), the `gitRepo` element appends the folder: `repo:VAC (VAC_WIP)`. The
  repo-root folder is shown even from subdirectories; nothing changes when
  folder and repo names match (case-insensitive).

### Fixed
- Generated `/hud-config` command now bakes in the absolute path to
  `hud-config.mjs` — the previous `~/...` path was not expanded by
  cmd.exe/PowerShell and broke the command on Windows.
- Piped-install instructions in `setup.mjs` now include
  `--input-type=module` — piping an ESM file into `node` fails on
  Node < 22.7 without it.

## [0.6.0] - 2026-07-17

### Added
- **`modelScheme` config key** — color of the model name on the git/model
  line (`plain`, `orange` (default), `coral`, `magenta`, `brightMagenta`,
  `blue`, `white`), with a live-preview **Model scheme** step in `/hud-config`.

## [0.5.0] - 2026-06-23

### Changed
- **Session duration auto-groups into d/h/m** — the largest two units are
  shown (`5m`, `2h13m`, `19d1h`), so long sessions stay readable.

## [0.4.0] - 2026-06-22

### Added
- **Session cost element** (`cost:$1.23`) on the git/model line — the running
  session cost in USD as reported by Claude Code (`total_cost_usd`).

## [0.3.3] - 2026-06-10

### Added
- **Sub-agent model display.** The `detailed` and `multiline` agent formats now
  show which model each running sub-agent is on (`Opus 4.8`, `Sonnet 4.6`,
  `Haiku 4.5`, `Fable 5`). The model id is read from each agent's own transcript
  under `<session>/subagents/`, correlated to the main transcript via the `Task`
  tool-use id in the sibling `*.meta.json`.
- **`agentsShowModel` config key** (default `true`) to show/hide the model.
  Toggle interactively with `m` in the Agents section of `/hud-config`.

### Changed
- Removed the elapsed-time marker from agent lines (the `(0m)` / `(12s)` tag).

### Fixed
- Freshly-started agents no longer render a version-less label: bare model
  aliases passed to the `Task` tool (`opus`/`sonnet`/`haiku`/`fable`) now expand
  to their versioned form during the brief window before the agent's transcript
  records its real model id.

## [0.2.4] and earlier

Versioned statusline with rate limits, context window, session health, git info,
active-agent tracking, plugin/skill tracking, color schemes, and the interactive
`/hud-config` configurator. Installed and updated via `/install-hud` and
`/update-hud`.

[0.7.0]: https://github.com/TomasHolas/claude-code-hud/releases/tag/v0.7.0
[0.6.0]: https://github.com/TomasHolas/claude-code-hud/releases/tag/v0.6.0
[0.5.0]: https://github.com/TomasHolas/claude-code-hud/releases/tag/v0.5.0
[0.4.0]: https://github.com/TomasHolas/claude-code-hud/releases/tag/v0.4.0
[0.3.3]: https://github.com/TomasHolas/claude-code-hud/releases/tag/v0.3.3
