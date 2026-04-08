#!/usr/bin/env node
/**
 * Claude Code HUD — interactive configurator
 * Run: node ~/.claude/hud/hud-config.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

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

// Palety — zrcadlo ze statusline.mjs
const PALETTES = {
    default:      { ok: '\x1b[32m', warning: '\x1b[33m', critical: '\x1b[31m', accent: '\x1b[36m' },
    colorBlind:   { ok: '\x1b[96m', warning: '\x1b[93m', critical: '\x1b[95m', accent: '\x1b[94m' },
    highContrast: { ok: '\x1b[92m', warning: '\x1b[93m', critical: '\x1b[95m', accent: '\x1b[96m' },
    viridis:      { ok: '\x1b[38;2;53;183;121m',  warning: '\x1b[38;2;173;220;48m', critical: '\x1b[38;2;253;231;37m', accent: '\x1b[38;2;49;104;142m'  },
    cividis:      { ok: '\x1b[38;2;124;162;112m', warning: '\x1b[38;2;186;207;85m', critical: '\x1b[38;2;255;233;69m', accent: '\x1b[38;2;77;119;120m'  },
};

const SCHEME_LABELS = {
    default:      'Klasická        ',
    colorBlind:   'Color Blind     ',
    highContrast: 'High Contrast   ',
    viridis:      'Viridis         ',
    cividis:      'Cividis (NASA)  ',
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

function clearLines(n) {
    for (let i = 0; i < n; i++) write(CLEAR_LINE + (i < n - 1 ? CURSOR_UP(1) : ''));
}

// ─── SEKCE 1: Barevné schéma ─────────────────────────────────────────────────

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

// ─── SEKCE 2: Elementy ───────────────────────────────────────────────────────

const ELEMENT_ITEMS = [
    { key: 'gitRepo',             label: 'Git repo' },
    { key: 'gitBranch',           label: 'Git branch' },
    { key: 'model',               label: 'Model name' },
    { key: 'profile',             label: 'Profile' },
    { key: 'rateLimits',          label: 'Rate limits (5h / weekly)' },
    { key: 'sessionHealth',       label: 'Session duration' },
    { key: 'contextBar',          label: 'Context window' },
    { key: 'useBars',             label: 'Progress bars [████░░░░]' },
    { key: 'thinking',            label: 'Thinking indicator' },
    { key: 'showCallCounts',      label: 'Call counts 🔧🤖⚡' },
    { key: 'promptTime',          label: 'Last prompt time' },
    { key: 'agents',              label: 'Active agents' },
    { key: 'lastSkill',           label: 'Last used skill' },
];

const DEFAULTS = {
    gitRepo: true, gitBranch: true, model: true, profile: false,
    rateLimits: true, sessionHealth: true, contextBar: true, useBars: true,
    thinking: true, showCallCounts: true, promptTime: false, agents: true, lastSkill: true,
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

// ─── SEKCE 3: Formát agentů ──────────────────────────────────────────────────

const AGENTS_FORMATS = [
    { value: 'count',     label: 'count',     example: 'agents:2' },
    { value: 'codes',     label: 'codes',     example: 'agents:ea' },
    { value: 'detailed',  label: 'detailed',  example: 'agents:[explore(2m),exec]' },
    { value: 'multiline', label: 'multiline', example: 'one line per agent' },
];

async function sectionAgents(cfg) {
    const el  = cfg.elements || {};
    const cur = el.agentsFormat || 'multiline';
    let idx   = Math.max(0, AGENTS_FORMATS.findIndex(f => f.value === cur));
    let maxLines = el.agentsMaxLines ?? 5;
    let rendered = 0;

    const render = () => {
        if (rendered > 0) { write(CURSOR_UP(rendered)); }
        rendered = 0;

        writeln(`${BOLD}Agents format${R}  ${DIM}↑↓ navigate  Enter select${R}`);
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
            else if (key === '\r' || key === '\n') {
                process.stdin.off('data', onKey);
                resolve({ agentsFormat: AGENTS_FORMATS[idx].value, agentsMaxLines: maxLines });
            }
            else if (key === '\x03') { cleanup(); process.exit(0); }
        };
        process.stdin.on('data', onKey);
    });
}

// ─── SEKCE 4: Layout ─────────────────────────────────────────────────────────

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

    // 1. Barevné schéma
    writeln(`  ${DIM}1/4  Color scheme${R}`);
    const colorScheme = await sectionColorScheme(cfg);
    cfg.colorScheme = colorScheme;
    saveConfig(cfg); // live preview in HUD

    // 2. Elements
    writeln(`  ${DIM}2/4  Visible elements${R}`);
    const elements = await sectionElements(cfg);
    cfg.elements = { ...(cfg.elements || {}), ...elements };

    // 3. Agents
    writeln(`  ${DIM}3/4  Agents${R}`);
    const agentsCfg = await sectionAgents(cfg);
    cfg.elements = { ...cfg.elements, ...agentsCfg };

    // 4. Layout
    writeln(`  ${DIM}4/4  Layout${R}`);
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
