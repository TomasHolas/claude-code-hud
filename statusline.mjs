#!/usr/bin/env node
/**
 * Claude Code HUD - Standalone Statusline Renderer
 *
 * Drop-in replacement for the OMC HUD with no external dependencies.
 * Reads stdin JSON from Claude Code and outputs a formatted statusline.
 *
 * Config:  ~/.claude/hud/config.json  (optional, uses 'focused' defaults)
 * Prompts: ~/.claude/hud/.prompt-time.json  (written by UserPromptSubmit hook)
 *
 * Configurable elements (set in config.json under "elements"):
 *   gitBranch, gitRepo, gitInfoPosition, model, modelFormat, profile,
 *   rateLimits, sessionHealth, showSessionDuration, contextBar, useBars,
 *   promptTime, thinking, showCallCounts, agents, agentsFormat, agentsMaxLines,
 *   todos, activeSkills, lastSkill, backgroundTasks, maxOutputLines
 */

import { existsSync, readFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ─── ANSI ────────────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';

// Color palettes — loaded from config.colorScheme
const PALETTES = {
    default: {
        ok:       '\x1b[32m',   // green
        warning:  '\x1b[33m',   // yellow
        critical: '\x1b[31m',   // red
        accent:   '\x1b[36m',   // cyan
    },
    colorBlind: {
        // Replaces red/green axis with blue/yellow/magenta (deuteranopia & protanopia safe)
        // Based on IBM Color Blind Safe palette — preserves S-cone (blue) channel
        ok:       '\x1b[96m',   // bright cyan    — blue axis, S-cone safe
        warning:  '\x1b[93m',   // bright yellow  — luminance landmark, fully preserved by CVD
        critical: '\x1b[95m',   // bright magenta — blue+red, unconfusable with yellow or cyan
        accent:   '\x1b[94m',   // bright blue    — pure S-cone, safest possible accent
    },
    highContrast: {
        // Bright tier throughout — all colors clear WCAG AA/AAA on dark backgrounds
        ok:       '\x1b[92m',   // bright green   — 13:1 contrast ratio (AAA)
        warning:  '\x1b[93m',   // bright yellow  — 16:1 contrast ratio (AAA)
        critical: '\x1b[95m',   // bright magenta — 6.6:1 contrast ratio (AA) + CVD safe
        accent:   '\x1b[96m',   // bright cyan    — 14:1 contrast ratio (AAA)
    },
    viridis: {
        // True-color (24-bit) — requires truecolor terminal support
        // Windows Terminal / VS Code: ✓  |  old cmd.exe / conhost: ✗
        // Points sampled from matplotlib's viridis colormap (perceptually uniform, CVD safe)
        ok:       '\x1b[38;2;53;183;121m',   // viridis(0.60) — #35B779 teal-green
        warning:  '\x1b[38;2;173;220;48m',   // viridis(0.85) — #ADDC30 yellow-green
        critical: '\x1b[38;2;253;231;37m',   // viridis(1.00) — #FDE725 bright yellow
        accent:   '\x1b[38;2;49;104;142m',   // viridis(0.30) — #31688E slate blue
    },
    cividis: {
        // True-color (24-bit) — requires truecolor terminal support
        // Windows Terminal / VS Code: ✓  |  old cmd.exe / conhost: ✗
        // Peer-reviewed CVD-safe palette (NASA) — safe for deuteranopia, protanopia & tritanopia
        // Blue→olive→yellow scale, readable in grayscale
        ok:       '\x1b[38;2;124;162;112m',  // cividis(0.60) — #7CA270 olive green
        warning:  '\x1b[38;2;186;207;85m',   // cividis(0.80) — #BACF55 lime
        critical: '\x1b[38;2;255;233;69m',   // cividis(1.00) — #FFE945 bright yellow
        accent:   '\x1b[38;2;77;119;120m',   // cividis(0.40) — #4D7778 teal
    },
};

// Active palette — set in main() after config is loaded
let C = PALETTES.default;

const bold = (s) => `${BOLD}${s}${RESET}`;
const dim  = (s) => `${DIM}${s}${RESET}`;
const cyan = (s) => `${C.accent}${s}${RESET}`;

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const HUD_DIR = join(homedir(), '.claude', 'hud');

/** Mirrors OMC's 'focused' preset — the current active configuration. */
const DEFAULT_CONFIG = {
    colorScheme: 'default',   // 'default' | 'colorBlind' | 'highContrast'
    elements: {
        // Git info line (above or below main HUD)
        gitBranch:       true,
        gitRepo:         true,
        gitInfoPosition: 'above',   // 'above' | 'below'
        model:           true,
        modelFormat:     'short',   // 'short' (display_name) | 'full' (id)
        profile:         true,

        // Main HUD line
        rateLimits:          true,
        sessionHealth:       true,
        showSessionDuration: true,
        contextBar:          true,
        useBars:             true,   // show progress bar inside ctx
        promptTime:          false,
        thinking:            true,
        showCallCounts:      true,
        agents:              true,
        agentsFormat:        'detailed',  // 'count' | 'codes' | 'detailed' | 'multiline'
        agentsMaxLines:      3,
        activeSkills:        true,
        lastSkill:           true,
        backgroundTasks:     true,
        todos:               true,

        // Layout
        maxOutputLines: 4,
    },
    thresholds: {
        contextWarning:           70,
        contextCompactSuggestion: 80,
        contextCritical:          85,
        rateLimitWarning:         70,
        rateLimitCritical:        90,
        sessionWarningMinutes:    60,
        sessionCriticalMinutes:   120,
    },
    contextLimitWarning: {
        threshold:   80,
        autoCompact: false,
    },
};

function loadConfig() {
    const path = join(HUD_DIR, 'config.json');
    if (!existsSync(path)) return DEFAULT_CONFIG;
    try {
        const raw = JSON.parse(readFileSync(path, 'utf-8'));
        return {
            ...DEFAULT_CONFIG,
            ...raw,
            elements:            { ...DEFAULT_CONFIG.elements,            ...(raw.elements            || {}) },
            thresholds:          { ...DEFAULT_CONFIG.thresholds,          ...(raw.thresholds          || {}) },
            contextLimitWarning: { ...DEFAULT_CONFIG.contextLimitWarning, ...(raw.contextLimitWarning || {}) },
        };
    } catch {
        return DEFAULT_CONFIG;
    }
}

// ─── STDIN ───────────────────────────────────────────────────────────────────

async function readStdin() {
    if (process.stdin.isTTY) return null;
    const chunks = [];
    try {
        process.stdin.setEncoding('utf8');
        for await (const chunk of process.stdin) chunks.push(chunk);
        const raw = chunks.join('');
        if (!raw.trim()) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// ─── GIT ─────────────────────────────────────────────────────────────────────

function git(args, cwd) {
    try {
        return execSync(`git ${args}`, {
            cwd: cwd || process.cwd(),
            encoding: 'utf-8',
            timeout: 1000,
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim() || null;
    } catch {
        return null;
    }
}

function getGitBranch(cwd) {
    return git('branch --show-current', cwd);
}

function getGitRepoName(cwd) {
    const url = git('remote get-url origin', cwd);
    if (!url) return null;
    const m = url.match(/\/([^/]+?)(?:\.git)?$/) || url.match(/:([^/]+?)(?:\.git)?$/);
    return m ? m[1].replace(/\.git$/, '') : null;
}

// ─── TRANSCRIPT PARSING ──────────────────────────────────────────────────────

const MAX_TAIL_BYTES       = 512 * 1024;  // 500 KB — enough for recent activity
const THINKING_RECENCY_MS  = 30_000;       // thinking indicator visible for 30s after last block

/** Read the last `maxBytes` of a file as lines. */
function readTailLines(path, fileSize, maxBytes) {
    const offset = Math.max(0, fileSize - maxBytes);
    const length = fileSize - offset;
    const buf    = Buffer.allocUnsafe(length);
    const fd     = openSync(path, 'r');
    try {
        readSync(fd, buf, 0, length, offset);
    } finally {
        closeSync(fd);
    }
    const text  = buf.toString('utf-8');
    const lines = text.split('\n');
    // First line may be partial — drop it unless reading from file start
    return offset > 0 ? lines.slice(1) : lines;
}

/**
 * Parse the transcript JSONL for:
 *  - todos (last TodoWrite input)
 *  - agents (running Task tool calls)
 *  - thinking state (recent thinking blocks)
 *  - call counts (tool / agent / skill)
 *  - last activated skill
 */
function parseTranscript(transcriptPath) {
    const result = {
        todos:             [],
        agents:            [],        // { id, type, description, startTime, status }
        thinkingActive:    false,
        toolCallCount:     0,
        agentCallCount:    0,
        skillCallCount:    0,
        lastSkill:         null,      // { skill, args }
        sessionStart:      null,
    };

    if (!transcriptPath || !existsSync(transcriptPath)) return result;

    let lines;
    try {
        const stat     = statSync(transcriptPath);
        const fileSize = stat.size;
        lines = fileSize > MAX_TAIL_BYTES
            ? readTailLines(transcriptPath, fileSize, MAX_TAIL_BYTES)
            : readFileSync(transcriptPath, 'utf-8').split('\n');
    } catch {
        return result;
    }

    const agentMap   = new Map();  // id → agent entry
    const now        = Date.now();

    for (const line of lines) {
        if (!line.trim()) continue;
        let entry;
        try { entry = JSON.parse(line); } catch { continue; }

        // Session start timestamp
        if (!result.sessionStart && entry.timestamp) {
            result.sessionStart = new Date(entry.timestamp);
        }

        const content = entry.message?.content;
        if (!Array.isArray(content)) continue;

        for (const block of content) {
            // Thinking blocks
            if (block.type === 'thinking' || block.type === 'reasoning') {
                const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : now;
                if (now - ts < THINKING_RECENCY_MS) result.thinkingActive = true;
            }

            // Tool use blocks (assistant side)
            if (block.type === 'tool_use' && block.name) {
                const name = block.name;

                if (name === 'Task' || name === 'proxy_Task' || name === 'Agent') {
                    result.agentCallCount++;
                    result.toolCallCount++;
                    const input = block.input || {};
                    agentMap.set(block.id, {
                        id:          block.id,
                        type:        input.subagent_type ?? 'unknown',
                        description: input.description   ?? null,
                        startTime:   entry.timestamp ? new Date(entry.timestamp) : null,
                        status:      'running',
                    });
                } else if (name === 'Skill' || name === 'proxy_Skill') {
                    result.skillCallCount++;
                    result.toolCallCount++;
                    const input = block.input || {};
                    if (input.skill) {
                        result.lastSkill = { skill: input.skill, args: input.args ?? null };
                    }
                } else {
                    result.toolCallCount++;
                }
            }

            // Tool result blocks — mark agent as completed
            if (block.type === 'tool_result' && block.tool_use_id) {
                const agent = agentMap.get(block.tool_use_id);
                if (agent) agent.status = 'completed';
            }
        }
    }

    result.agents = [...agentMap.values()].filter((a) => a.status === 'running');
    return result;
}

// ─── ELEMENT RENDERERS ───────────────────────────────────────────────────────

function formatMs(ms) {
    const mins  = Math.floor(ms / 60_000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (days  > 0) return `${days}d${hours % 24}h`;
    if (hours > 0) return `${hours}h${mins % 60}m`;
    return `${mins}m`;
}

function rateColor(pct, t) {
    if (pct >= t.rateLimitCritical) return C.critical;
    if (pct >= t.rateLimitWarning)  return C.warning;
    return C.ok;
}

function ctxColor(pct, t) {
    if (pct >= t.contextCritical)          return C.critical;
    if (pct >= t.contextCompactSuggestion) return C.warning;
    if (pct >= t.contextWarning)           return C.warning;
    return C.ok;
}

// Rate limits — 5h:66%(1h23m) wk:39%(2d5h)
// With bars: 5h:[██████░░░░]66%(1h23m) wk:[████░░░░░░]39%(2d5h)
function renderRateLimits(stdin, thresholds, useBars) {
    const rl = stdin?.rate_limits;
    if (!rl) return null;
    const parts = [];

    const renderBucket = (label, dimLabel, bucket) => {
        if (!bucket) return null;
        const pct      = Math.round(Math.min(100, Math.max(0, bucket.used_percentage)));
        const color    = rateColor(pct, thresholds);
        const resetMs  = bucket.resets_at ? bucket.resets_at * 1000 - Date.now() : 0;
        const resetStr = resetMs > 0 ? `${DIM}(${formatMs(resetMs)})${RESET}` : '';
        const prefix   = dimLabel ? `${DIM}${label}${RESET}` : label;
        if (useBars) {
            const W      = 10;
            const filled = Math.round((pct / 100) * W);
            const empty  = W - filled;
            const bar    = `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
            return `${prefix}[${bar}]${color}${pct}%${RESET}${resetStr}`;
        }
        return `${prefix}${color}${pct}%${RESET}${resetStr}`;
    };

    const fh = renderBucket('5h:', false, rl.five_hour);
    if (fh) parts.push(fh);

    const sd = renderBucket('wk:', true, rl.seven_day);
    if (sd) parts.push(sd);

    return parts.length > 0 ? parts.join(' ') : null;
}

// Session duration — session:5m (colored by age)
function renderSession(stdin, thresholds) {
    const ms = stdin?.cost?.total_duration_ms;
    if (ms == null) return null;
    const mins  = Math.floor(ms / 60_000);
    const color = mins >= thresholds.sessionCriticalMinutes ? C.critical
                : mins >= thresholds.sessionWarningMinutes  ? C.warning
                : C.ok;
    return `session:${color}${mins}m${RESET}`;
}

// Context window — ctx:67% or ctx:[████░░░░░░]67%
function renderContext(stdin, thresholds, useBars) {
    const pct = stdin?.context_window?.used_percentage;
    if (pct == null) return null;
    const safe   = Math.round(Math.min(100, Math.max(0, pct)));
    const color  = ctxColor(safe, thresholds);
    const suffix = safe >= thresholds.contextCritical          ? ' CRITICAL'
                 : safe >= thresholds.contextCompactSuggestion ? ' COMPRESS?'
                 : '';

    if (useBars) {
        const W      = 10;
        const filled = Math.round((safe / 100) * W);
        const empty  = W - filled;
        const bar    = `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
        return `ctx:[${bar}]${color}${safe}%${suffix}${RESET}`;
    }
    return `ctx:${color}${safe}%${suffix}${RESET}`;
}

// Prompt time — prompt:HH:MM:SS
function renderPromptTime() {
    const path = join(HUD_DIR, '.prompt-time.json');
    if (!existsSync(path)) return null;
    try {
        const { time } = JSON.parse(readFileSync(path, 'utf-8'));
        if (!time) return null;
        const d  = new Date(time);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${dim('prompt:')}${hh}:${mm}:${ss}`;
    } catch {
        return null;
    }
}

// Thinking — thinking
function renderThinking(active) {
    if (!active) return null;
    return `${C.accent}thinking${RESET}`;
}

// Call counts — 🔧42 🤖7 ⚡3
function renderCallCounts(tc, ac, sc) {
    const parts = [];
    if (tc > 0) parts.push(`\u{1F527}${tc}`);
    if (ac > 0) parts.push(`\u{1F916}${ac}`);
    if (sc > 0) parts.push(`\u26A1${sc}`);
    return parts.length > 0 ? parts.join(' ') : null;
}


// Agents — agents:2 | agents:Oes | agents:[explore(2m),exec]
function renderAgents(agents, format, maxLines) {
    if (!agents || agents.length === 0) return { header: null, detail: [] };

    const count = agents.length;

    if (format === 'count') {
        return { header: `${dim('agents:')}${cyan(String(count))}`, detail: [] };
    }

    if (format === 'codes') {
        const codes = agents.map((a) => a.type.charAt(0) || '?').join('');
        return { header: `${dim('agents:')}${cyan(codes)}`, detail: [] };
    }

    if (format === 'detailed') {
        const names = agents.slice(0, 5).map((a) => {
            const type = a.type.split(':').pop() || a.type;
            const age  = a.startTime ? formatMs(Date.now() - a.startTime.getTime()) : null;
            return age ? `${type}(${age})` : type;
        });
        const suffix = count > 5 ? `+${count - 5}` : '';
        const label  = `[${[...names, suffix].filter(Boolean).join(',')}]`;
        return { header: `${dim('agents:')}${cyan(label)}`, detail: [] };
    }

    // multiline
    const header = `${dim('agents:')}${cyan(String(count))}`;
    const detail = agents.slice(0, maxLines || 3).map((a) => {
        const type = a.type.split(':').pop() || a.type;
        const desc = a.description ? ` — ${a.description.slice(0, 40)}` : '';
        const age  = a.startTime ? ` (${formatMs(Date.now() - a.startTime.getTime())})` : '';
        return `  ${dim('↳')} ${cyan(type)}${age}${dim(desc)}`;
    });
    return { header, detail };
}

// Last skill — skill:commit
function renderLastSkill(lastSkill) {
    if (!lastSkill) return null;
    const name = lastSkill.skill.split(':').pop() || lastSkill.skill;
    return `${dim('skill:')}${name}`;
}

// Background tasks — from OMC hud-state.json if present
function renderBackgroundTasks(cwd) {
    const candidates = [
        join(cwd, '.omc', 'state', 'hud-state.json'),
        join(homedir(), '.omc', 'state', 'hud-state.json'),
    ];
    for (const p of candidates) {
        if (!existsSync(p)) continue;
        try {
            const state = JSON.parse(readFileSync(p, 'utf-8'));
            const tasks = (state.backgroundTasks || []).filter((t) => t.status === 'running');
            if (tasks.length === 0) return null;
            return `${dim('bg:')}${C.warning}${tasks.length}${RESET}`;
        } catch {
            continue;
        }
    }
    return null;
}

// Git elements
function renderGitBranch(cwd) {
    const branch = getGitBranch(cwd);
    if (!branch) return null;
    return `${dim('branch:')}${cyan(branch)}`;
}

function renderGitRepo(cwd) {
    const repo = getGitRepoName(cwd);
    if (!repo) return null;
    return `${dim('repo:')}${cyan(repo)}`;
}

// Model — model:Sonnet 4.6
function renderModel(stdin, format) {
    const m = stdin?.model;
    if (!m) return null;
    const name = format === 'full' ? m.id : (m.display_name || m.id);
    return `${dim('model:')}${name}`;
}

// Profile — Claude Code sends output_style.name (e.g. "default", or a custom name)
function renderProfile(stdin) {
    const name = stdin?.output_style?.name || process.env.CLAUDE_PROFILE_NAME;
    if (!name) return null;
    return bold(`profile:${name}`);
}

// ─── LAYOUT ──────────────────────────────────────────────────────────────────

const SEPARATOR      = `${DIM} | ${RESET}`;
const PLAIN_SEP      = ' | ';

function joinParts(parts) {
    return parts.filter(Boolean).join(SEPARATOR);
}

function limitLines(lines, max) {
    if (lines.length <= max) return lines;
    const truncated = lines.length - max + 1;
    return [...lines.slice(0, max - 1), `... (+${truncated} lines)`];
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
    const [stdin, config] = await Promise.all([readStdin(), Promise.resolve(loadConfig())]);
    C = PALETTES[config.colorScheme] ?? PALETTES.default;
    const el  = config.elements;
    const thr = config.thresholds;
    const cwd = stdin?.cwd || process.cwd();

    // Parse transcript (once, shared by multiple elements)
    const transcriptPath = stdin?.transcript_path;
    let transcript = null;
    const needsTranscript = el.todos || el.agents || el.thinking || el.showCallCounts
                         || el.activeSkills || el.lastSkill;
    if (needsTranscript) {
        transcript = parseTranscript(transcriptPath);
    }

    // ── Git info line ────────────────────────────────────────────
    const gitParts = [];
    if (el.gitRepo)   gitParts.push(renderGitRepo(cwd));
    if (el.gitBranch) gitParts.push(renderGitBranch(cwd));
    if (el.model)     gitParts.push(renderModel(stdin, el.modelFormat || 'short'));
    if (el.profile)   gitParts.push(renderProfile(stdin));

    // ── Main HUD line ────────────────────────────────────────────
    const mainParts = [];

    if (el.rateLimits)                        mainParts.push(renderRateLimits(stdin, thr, el.useBars));
    if (el.sessionHealth && el.showSessionDuration) mainParts.push(renderSession(stdin, thr));
    if (el.contextBar)                        mainParts.push(renderContext(stdin, thr, el.useBars));
    if (el.thinking)                          mainParts.push(renderThinking(transcript?.thinkingActive));
    if (el.promptTime)                        mainParts.push(renderPromptTime());
    if (el.showCallCounts && transcript)      mainParts.push(renderCallCounts(transcript.toolCallCount, transcript.agentCallCount, transcript.skillCallCount));
    if ((el.activeSkills || el.lastSkill) && transcript?.lastSkill) mainParts.push(renderLastSkill(transcript.lastSkill));
    if (el.backgroundTasks)                  mainParts.push(renderBackgroundTasks(cwd));

    // Agents (may produce header + detail lines)
    const agentResult = (el.agents && transcript)
        ? renderAgents(transcript.agents, el.agentsFormat || 'multiline', el.agentsMaxLines)
        : { header: null, detail: [] };
    if (agentResult.header) mainParts.push(agentResult.header);

    // ── Compose output ───────────────────────────────────────────
    const outputLines = [];
    const gitLine  = joinParts(gitParts.filter(Boolean));
    const mainLine = joinParts(mainParts.filter(Boolean));

    if (el.gitInfoPosition === 'above') {
        if (gitLine)  outputLines.push(gitLine);
        if (mainLine) outputLines.push(mainLine);
    } else {
        if (mainLine) outputLines.push(mainLine);
        if (gitLine)  outputLines.push(gitLine);
    }

    // Agent detail lines (multiline mode)
    outputLines.push(...agentResult.detail);

    // Context limit warning
    const ctxPct = stdin?.context_window?.used_percentage ?? 0;
    if (ctxPct >= config.contextLimitWarning.threshold) {
        const compact = config.contextLimitWarning.autoCompact ? ' (auto-compact on)' : '';
        outputLines.push(`${C.warning}Context at ${Math.round(ctxPct)}% — consider /compact${compact}${RESET}`);
    }

    // Apply maxOutputLines limit
    const limited = limitLines(outputLines, el.maxOutputLines ?? 4);
    process.stdout.write(limited.join('\n') + (limited.length > 0 ? '\n' : ''));
}

main().catch(() => {});
