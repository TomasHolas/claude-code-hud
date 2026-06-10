# Changelog

All notable changes to claude-code-hud are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

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

[0.3.3]: https://github.com/TomasHolas/claude-code-hud/releases/tag/v0.3.3
