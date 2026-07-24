#!/usr/bin/env node
/**
 * Claude Code HUD — interactive configurator
 * Run: node ~/.claude/hud/hud-config.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Keep in lockstep with /VERSION, statusline.mjs and setup.mjs — see CLAUDE.md.
const VERSION = '0.9.0';

const HUD_DIR   = join(homedir(), '.claude', 'hud');
const CONFIG_PATH = join(HUD_DIR, 'config.json');

// ─── ANSI ────────────────────────────────────────────────────────────────────

const R  = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM  = '\x1b[2m';
const CURSOR_UP   = (n) => `\x1b[${n}A`;
const CLEAR_LINE  = '\x1b[2K\r';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

// Palettes — mirror of statusline.mjs
const PALETTES = {
    default:      { ok: '\x1b[32m', warning: '\x1b[33m', critical: '\x1b[31m', accent: '\x1b[36m' },
    colorBlind:   { ok: '\x1b[96m', warning: '\x1b[93m', critical: '\x1b[95m', accent: '\x1b[94m' },
    highContrast: { ok: '\x1b[92m', warning: '\x1b[93m', critical: '\x1b[95m', accent: '\x1b[96m' },
    viridis:      { ok: '\x1b[38;2;53;183;121m',  warning: '\x1b[38;2;173;220;48m', critical: '\x1b[38;2;253;231;37m', accent: '\x1b[38;2;49;104;142m'  },
    cividis:      { ok: '\x1b[38;2;124;162;112m', warning: '\x1b[38;2;186;207;85m', critical: '\x1b[38;2;255;233;69m', accent: '\x1b[38;2;77;119;120m'  },
    cyberpunk:    { ok: '\x1b[38;2;31;111;235m',  warning: '\x1b[38;2;254;255;0m',  critical: '\x1b[38;2;255;30;95m',  accent: '\x1b[38;2;168;85;247m' },
};

const SCHEME_LABELS = {
    default:      'Classic         ',
    colorBlind:   'Color Blind     ',
    highContrast: 'High Contrast   ',
    viridis:      'Viridis         ',
    cividis:      'Cividis (NASA)  ',
    cyberpunk:    'Cyberpunk       ',
};

// Model name colors — mirror of statusline.mjs MODEL_COLORS
const MODEL_COLORS = {
    plain:         '',
    orange:        '\x1b[38;5;208m',
    coral:         '\x1b[38;2;217;119;87m',
    magenta:       '\x1b[35m',
    brightMagenta: '\x1b[95m',
    blue:          '\x1b[94m',
    white:         '\x1b[97m',
};

const MODEL_COLOR_LABELS = {
    plain:         'Plain           ',
    orange:        'Orange          ',
    coral:         'Coral (Claude)  ',
    magenta:       'Magenta         ',
    brightMagenta: 'Bright magenta  ',
    blue:          'Bright blue     ',
    white:         'Bright white    ',
};

// ─── CONFIG ──────────────────────────────────────────────────────────────────

function loadConfig() {
    if (!existsSync(CONFIG_PATH)) return {};
    try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')); } catch { return {}; }
}

function saveConfig(cfg) {
    writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
}

// ─── TERMINAL ────────────────────────────────────────────────────────────────

function write(s) { process.stdout.write(s); }
function writeln(s = '') { write(s + '\n'); }

// ─── SECTION 1: Color scheme ─────────────────────────────────────────────────

async function sectionColorScheme(cfg) {
    const schemes = Object.keys(PALETTES);
    let idx = Math.max(0, schemes.indexOf(cfg.colorScheme || 'default'));
    let rendered = 0;

    const render = () => {
        if (rendered > 0) { write(CURSOR_UP(rendered)); }
        rendered = 0;

        writeln(`${BOLD}Color scheme${R}  ${DIM}↑↓ navigate  Enter select${R}`);
        rendered++;

        for (let i = 0; i < schemes.length; i++) {
            const s   = schemes[i];
            const p   = PALETTES[s];
            const sel = i === idx;
            const radio  = sel ? `${BOLD}●${R}` : `${DIM}○${R}`;
            const label  = sel ? `${BOLD}${SCHEME_LABELS[s]}${R}` : `${DIM}${SCHEME_LABELS[s]}${R}`;
            const preview = `${p.ok}ok${R} ${p.warning}warning${R} ${p.critical}critical${R} ${p.accent}accent${R}`;
            write(`${CLEAR_LINE}  ${radio} ${label}  ${preview}\n`);
            rendered++;
        }
        writeln();
        rendered++;
    };

    render();

    return new Promise((resolve) => {
        const onKey = (buf) => {
            const key = buf.toString();
            if (key === '\x1b[A' && idx > 0) { idx--; render(); }
            else if (key === '\x1b[B' && idx < schemes.length - 1) { idx++; render(); }
            else if (key === '\r' || key === '\n') {
                process.stdin.off('data', onKey);
                resolve(schemes[idx]);
            }
            else if (key === '\x03') { cleanup(); process.exit(0); }
        };
        process.stdin.on('data', onKey);
    });
}

// ─── SECTION 2: Model scheme ─────────────────────────────────────────────────

async function sectionModelScheme(cfg) {
    const colors = Object.keys(MODEL_COLORS);
    let idx = Math.max(0, colors.indexOf(cfg.modelScheme || 'orange'));
    let rendered = 0;

    const render = () => {
        if (rendered > 0) { write(CURSOR_UP(rendered)); }
        rendered = 0;

        writeln(`${BOLD}Model scheme${R}  ${DIM}↑↓ navigate  Enter select${R}`);
        rendered++;

        for (let i = 0; i < colors.length; i++) {
            const c   = colors[i];
            const col = MODEL_COLORS[c];
            const sel = i === idx;
            const radio  = sel ? `${BOLD}●${R}` : `${DIM}○${R}`;
            const label  = sel ? `${BOLD}${MODEL_COLOR_LABELS[c]}${R}` : `${DIM}${MODEL_COLOR_LABELS[c]}${R}`;
            const preview = `${DIM}model:${R}${col}Opus 4.8${R}`;
            write(`${CLEAR_LINE}  ${radio} ${label}  ${preview}\n`);
            rendered++;
        }
        writeln();
        rendered++;
    };

    render();

    return new Promise((resolve) => {
        const onKey = (buf) => {
            const key = buf.toString();
            if (key === '\x1b[A' && idx > 0) { idx--; render(); }
            else if (key === '\x1b[B' && idx < colors.length - 1) { idx++; render(); }
            else if (key === '\r' || key === '\n') {
                process.stdin.off('data', onKey);
                resolve(colors[idx]);
            }
            else if (key === '\x03') { cleanup(); process.exit(0); }
        };
        process.stdin.on('data', onKey);
    });
}

// ─── SECTION 3: Elements ─────────────────────────────────────────────────────

const ELEMENT_ITEMS = [
    { key: 'gitRepo',             label: 'Git repo' },
    { key: 'gitBranch',           label: 'Git branch' },
    { key: 'model',               label: 'Model name' },
    { key: 'cost',                label: 'Session cost ($)' },

    { key: 'rateLimits',          label: 'Rate limits (5h / weekly)' },
    { key: 'sessionHealth',       label: 'Session duration' },
    { key: 'contextBar',          label: 'Context window' },
    { key: 'useBars',             label: 'Progress bars [████░░░░]' },
    { key: 'thinking',            label: 'Thinking indicator' },
    { key: 'promptTime',          label: 'Last prompt time' },
    { key: 'showCallCounts',      label: 'Call counts 🔧🤖⚡🔌' },
    { key: 'lastSkill',           label: 'Last used skill' },
    { key: 'lastPlugin',          label: 'Last used plugin' },
    { key: 'agents',              label: 'Active agents' },
];

const DEFAULTS = {
    gitRepo: true, gitBranch: true, model: true, cost: true,
    rateLimits: true, sessionHealth: true, contextBar: true, useBars: true,
    thinking: true, showCallCounts: true, promptTime: false, agents: true,
    lastSkill: true, lastPlugin: true,
};

async function sectionElements(cfg) {
    const el = { ...DEFAULTS, ...(cfg.elements || {}) };
    let idx = 0;
    let rendered = 0;

    const render = () => {
        if (rendered > 0) { write(CURSOR_UP(rendered)); }
        rendered = 0;

        writeln(`${BOLD}Visible elements${R}  ${DIM}↑↓ navigate  Space toggle  Enter done${R}`);
        rendered++;

        for (let i = 0; i < ELEMENT_ITEMS.length; i++) {
            const item = ELEMENT_ITEMS[i];
            const on   = el[item.key] !== false;
            const cur  = i === idx;
            const box  = on ? `${BOLD}[✓]${R}` : `${DIM}[ ]${R}`;
            const lbl  = cur ? `${BOLD}${item.label}${R}` : item.label;
            const arrow = cur ? '▶' : ' ';
            write(`${CLEAR_LINE}  ${arrow} ${box} ${lbl}\n`);
            rendered++;
        }
        writeln();
        rendered++;
    };

    render();

    return new Promise((resolve) => {
        const onKey = (buf) => {
            const key = buf.toString();
            if (key === '\x1b[A' && idx > 0) { idx--; render(); }
            else if (key === '\x1b[B' && idx < ELEMENT_ITEMS.length - 1) { idx++; render(); }
            else if (key === ' ') {
                const k = ELEMENT_ITEMS[idx].key;
                el[k] = !el[k];
                render();
            }
            else if (key === '\r' || key === '\n') {
                process.stdin.off('data', onKey);
                resolve(el);
            }
            else if (key === '\x03') { cleanup(); process.exit(0); }
        };
        process.stdin.on('data', onKey);
    });
}

// ─── SECTION 4: Call counts ──────────────────────────────────────────────────

const CORAL_256 = '\x1b[38;5;173m';
const CALL_COUNT_STYLES = [
    { value: 'emoji', label: 'Emoji           ', preview: '\u{1F527}61 \u{1F916}3 \u26A11 \u{1F50C}1' },
    { value: 'nerd',  label: 'Nerd Font       ', preview: `${CORAL_256}\u{f1064} \x1b[0m61 ${CORAL_256}\u{f06a9} \x1b[0m3 ${CORAL_256}\u{f0241} \x1b[0m1 ${CORAL_256}\u{f0553} \x1b[0m1` },
];

async function sectionCallCounts(cfg) {
    const el  = cfg.elements || {};
    let idx   = Math.max(0, CALL_COUNT_STYLES.findIndex((s) => s.value === (el.callCountsStyle || 'emoji')));
    let rendered = 0;

    const render = () => {
        if (rendered > 0) { write(CURSOR_UP(rendered)); }
        rendered = 0;

        writeln(`${BOLD}Call-count icons${R}  ${DIM}↑↓ navigate  Enter select${R}`);
        rendered++;

        for (let i = 0; i < CALL_COUNT_STYLES.length; i++) {
            const s   = CALL_COUNT_STYLES[i];
            const sel = i === idx;
            const radio = sel ? `${BOLD}●${R}` : `${DIM}○${R}`;
            const label = sel ? `${BOLD}${s.label}${R}` : `${DIM}${s.label}${R}`;
            write(`${CLEAR_LINE}  ${radio} ${label}  ${s.preview}\n`);
            rendered++;
        }
        write(`${CLEAR_LINE}  ${DIM}Nerd Font style needs a Nerd Font installed (see README);${R}\n`);
        write(`${CLEAR_LINE}  ${DIM}individual icons are overridable via callCountIcons in config.json.${R}\n`);
        writeln();
        rendered += 3;
    };

    render();

    return new Promise((resolve) => {
        const onKey = (buf) => {
            const key = buf.toString();
            if (key === '\x1b[A' && idx > 0) { idx--; render(); }
            else if (key === '\x1b[B' && idx < CALL_COUNT_STYLES.length - 1) { idx++; render(); }
            else if (key === '\r' || key === '\n') {
                process.stdin.off('data', onKey);
                resolve(CALL_COUNT_STYLES[idx].value);
            }
            else if (key === '\x03') { cleanup(); process.exit(0); }
        };
        process.stdin.on('data', onKey);
    });
}

// ─── SECTION 5: Agents format ────────────────────────────────────────────────

const AGENTS_FORMATS = [
    { value: 'count',     label: 'count',     example: 'agents:2' },
    { value: 'codes',     label: 'codes',     example: 'agents:ea' },
    { value: 'detailed',  label: 'detailed',  example: 'agents:[explore(Opus 4.8),exec]' },
    { value: 'multiline', label: 'multiline', example: 'one line per agent' },
];

async function sectionAgents(cfg) {
    const el  = cfg.elements || {};
    const cur = el.agentsFormat || 'multiline';
    let idx   = Math.max(0, AGENTS_FORMATS.findIndex(f => f.value === cur));
    let maxLines = el.agentsMaxLines ?? 5;
    let showModel = el.agentsShowModel !== false;
    let rendered = 0;

    const render = () => {
        if (rendered > 0) { write(CURSOR_UP(rendered)); }
        rendered = 0;

        writeln(`${BOLD}Agents format${R}  ${DIM}↑↓ navigate  m model  Enter select${R}`);
        rendered++;

        for (let i = 0; i < AGENTS_FORMATS.length; i++) {
            const f   = AGENTS_FORMATS[i];
            const sel = i === idx;
            const radio = sel ? `${BOLD}●${R}` : `${DIM}○${R}`;
            const label = sel
                ? `${BOLD}${f.label.padEnd(10)}${R}  ${DIM}${f.example}${R}`
                : `${DIM}${f.label.padEnd(10)}  ${f.example}${R}`;
            write(`${CLEAR_LINE}  ${radio} ${label}\n`);
            rendered++;
        }

        if (AGENTS_FORMATS[idx].value === 'multiline') {
            writeln();
            write(`${CLEAR_LINE}  Max lines: ${BOLD}${maxLines}${R}  ${DIM}← →${R}\n`);
            rendered += 2;
        }

        if (AGENTS_FORMATS[idx].value === 'detailed' || AGENTS_FORMATS[idx].value === 'multiline') {
            writeln();
            write(`${CLEAR_LINE}  Show model: ${BOLD}${showModel ? 'on' : 'off'}${R}  ${DIM}m to toggle${R}\n`);
            rendered += 2;
        }

        writeln();
        rendered++;
    };

    render();

    return new Promise((resolve) => {
        const onKey = (buf) => {
            const key = buf.toString();
            if (key === '\x1b[A' && idx > 0) { idx--; render(); }
            else if (key === '\x1b[B' && idx < AGENTS_FORMATS.length - 1) { idx++; render(); }
            else if (key === '\x1b[C' && AGENTS_FORMATS[idx].value === 'multiline') { maxLines = Math.min(10, maxLines + 1); render(); }
            else if (key === '\x1b[D' && AGENTS_FORMATS[idx].value === 'multiline') { maxLines = Math.max(1, maxLines - 1); render(); }
            else if (key === 'm' || key === 'M') { showModel = !showModel; render(); }
            else if (key === '\r' || key === '\n') {
                process.stdin.off('data', onKey);
                resolve({ agentsFormat: AGENTS_FORMATS[idx].value, agentsMaxLines: maxLines, agentsShowModel: showModel });
            }
            else if (key === '\x03') { cleanup(); process.exit(0); }
        };
        process.stdin.on('data', onKey);
    });
}

// ─── SECTION 6: Layout ───────────────────────────────────────────────────────

async function sectionLayout(cfg) {
    const el = cfg.elements || {};
    let gitPos    = el.gitInfoPosition || 'above';
    let maxLines  = el.maxOutputLines  ?? 4;
    let modelFmt  = el.modelFormat     || 'short';
    let field     = 0; // 0=gitPos, 1=maxLines, 2=modelFormat
    let rendered  = 0;

    const render = () => {
        if (rendered > 0) { write(CURSOR_UP(rendered)); }
        rendered = 0;

        writeln(`${BOLD}Layout${R}  ${DIM}↑↓ switch field  ← → change value  Enter save${R}`);
        rendered++;

        const row = (i, label, value) => {
            const cur   = field === i;
            const arrow = cur ? '▶' : ' ';
            const val   = cur ? `${BOLD}${value}${R}` : `${DIM}${value}${R}`;
            write(`${CLEAR_LINE}  ${arrow} ${label.padEnd(28)} ${val}\n`);
            rendered++;
        };

        row(0, 'Git line position', gitPos);
        row(1, 'Max HUD lines', String(maxLines));
        row(2, 'Model format', modelFmt === 'short' ? 'short  (Sonnet 4.6)' : 'full   (claude-sonnet-4-6)');

        writeln();
        rendered++;
    };

    render();

    return new Promise((resolve) => {
        const onKey = (buf) => {
            const key = buf.toString();
            if (key === '\x1b[A' && field > 0) { field--; render(); }
            else if (key === '\x1b[B' && field < 2) { field++; render(); }
            else if (key === '\x1b[C' || key === '\x1b[D') {
                if (field === 0) gitPos   = gitPos   === 'above' ? 'below' : 'above';
                if (field === 1) maxLines = key === '\x1b[C' ? Math.min(10, maxLines + 1) : Math.max(1, maxLines - 1);
                if (field === 2) modelFmt = modelFmt === 'short' ? 'full' : 'short';
                render();
            }
            else if (key === '\r' || key === '\n') {
                process.stdin.off('data', onKey);
                resolve({ gitInfoPosition: gitPos, maxOutputLines: maxLines, modelFormat: modelFmt });
            }
            else if (key === '\x03') { cleanup(); process.exit(0); }
        };
        process.stdin.on('data', onKey);
    });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

function cleanup() {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    write(SHOW_CURSOR);
}

async function main() {
    if (!process.stdin.isTTY) {
        console.error('Error: hud-config requires an interactive terminal.');
        process.exit(1);
    }

    write(HIDE_CURSOR);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    const cfg = loadConfig();

    writeln();
    writeln(`  ${BOLD}Claude Code HUD — configurator${R}  ${DIM}Ctrl+C to exit anytime${R}`);
    writeln(`  ${DIM}${'─'.repeat(50)}${R}`);
    writeln();

    // 1. Color scheme
    writeln(`  ${DIM}1/6  Color scheme${R}`);
    const colorScheme = await sectionColorScheme(cfg);
    cfg.colorScheme = colorScheme;
    saveConfig(cfg); // live preview in HUD

    // 2. Model scheme
    writeln(`  ${DIM}2/6  Model scheme${R}`);
    const modelScheme = await sectionModelScheme(cfg);
    cfg.modelScheme = modelScheme;
    saveConfig(cfg); // live preview in HUD

    // 3. Elements
    writeln(`  ${DIM}3/6  Visible elements${R}`);
    const elements = await sectionElements(cfg);
    cfg.elements = { ...(cfg.elements || {}), ...elements };

    // 4. Call-count icons
    writeln(`  ${DIM}4/6  Call-count icons${R}`);
    const callCountsStyle = await sectionCallCounts(cfg);
    cfg.elements = { ...cfg.elements, callCountsStyle };
    saveConfig(cfg); // live preview in HUD

    // 5. Agents
    writeln(`  ${DIM}5/6  Agents${R}`);
    const agentsCfg = await sectionAgents(cfg);
    cfg.elements = { ...cfg.elements, ...agentsCfg };

    // 6. Layout
    writeln(`  ${DIM}6/6  Layout${R}`);
    const layoutCfg = await sectionLayout(cfg);
    cfg.elements = { ...cfg.elements, ...layoutCfg };

    // Save
    saveConfig(cfg);

    cleanup();
    writeln();
    writeln(`  ${BOLD}✓ Saved${R} → ${DIM}${CONFIG_PATH}${R}`);
    writeln();
    process.exit(0);
}

main().catch((e) => { cleanup(); console.error(e); process.exit(1); });
