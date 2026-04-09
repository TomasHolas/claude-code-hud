#!/usr/bin/env node
/**
 * Claude Code HUD — cross-platform installer (Node.js)
 * Usage:
 *   Any platform:  node setup.mjs
 *   Unix / macOS:  curl -fsSL https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.mjs | node
 *   Windows (PS):  irm https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.mjs | node
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { get }  from 'node:https';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASE_URL     = 'https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main';
const HUD_DIR      = join(homedir(), '.claude', 'hud');
const SETTINGS     = join(homedir(), '.claude', 'settings.json');
const COMMANDS_DIR = join(homedir(), '.claude', 'commands');

// Cross-platform path for shell commands (forward slashes, quoted)
const hudFwd = HUD_DIR.replace(/\\/g, '/');

function download(url) {
    return new Promise((resolve, reject) => {
        get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return download(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} — ${url}`));
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function main() {
    console.log('Claude Code HUD — installer');
    console.log('────────────────────────────');

    // ── 1. Directories ────────────────────────────────────────────────────
    mkdirSync(HUD_DIR,      { recursive: true });
    mkdirSync(COMMANDS_DIR, { recursive: true });

    // ── 2. Download HUD files if missing ─────────────────────────────────
    for (const f of ['statusline.mjs', 'hud-config.mjs']) {
        const dest = join(HUD_DIR, f);
        if (!existsSync(dest)) {
            process.stdout.write(`Downloading ${f}...`);
            const content = await download(`${BASE_URL}/${f}`);
            writeFileSync(dest, content, 'utf-8');
            console.log(` ✓`);
        }
    }
    console.log(`✓ HUD files ready in ${HUD_DIR}`);

    // ── 3. Patch settings.json ────────────────────────────────────────────
    if (!existsSync(SETTINGS)) writeFileSync(SETTINGS, '{}', 'utf-8');

    let cfg = {};
    try { cfg = JSON.parse(readFileSync(SETTINGS, 'utf-8')); } catch {}

    cfg.statusLine = {
        type:    'command',
        command: `node "${hudFwd}/statusline.mjs"`,
    };

    const promptTimeCmd = [
        'node -e "',
        `const fs=require('fs'),`,
        `p=require('os').homedir()+'/.claude/hud/.prompt-time.json';`,
        `fs.writeFileSync(p,JSON.stringify({time:new Date().toISOString(),cwd:process.cwd()}))`,
        '"',
    ].join('');

    if (!cfg.hooks) cfg.hooks = {};
    if (!cfg.hooks.UserPromptSubmit) cfg.hooks.UserPromptSubmit = [];

    const already = cfg.hooks.UserPromptSubmit.some(
        (e) => e.hooks && e.hooks.some((h) => h.command && h.command.includes('.prompt-time.json'))
    );
    if (!already) {
        cfg.hooks.UserPromptSubmit.push({
            matcher: '*',
            hooks: [{ type: 'command', command: promptTimeCmd, timeout: 2 }],
        });
    }

    writeFileSync(SETTINGS, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
    console.log('✓ settings.json updated');

    // ── 4. /hud-config command ────────────────────────────────────────────
    writeFileSync(join(COMMANDS_DIR, 'hud-config.md'), `\
---
description: HUD overlay configurator
allowed-tools: []
---

Tell the user to run this command in a new terminal:

\`\`\`
node ~/.claude/hud/hud-config.mjs
\`\`\`

When done, type \`/reload-plugins\` here to apply the changes.
`, 'utf-8');
    console.log('✓ /hud-config command added');

    // ── 5. /install-hud command ───────────────────────────────────────────
    writeFileSync(join(COMMANDS_DIR, 'install-hud.md'), `\
---
description: Install or reinstall Claude Code HUD overlay
allowed-tools: [Bash]
---

Install Claude Code HUD overlay.

**Unix / macOS:**
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.sh | bash
\`\`\`

**Windows (PowerShell) or if Bash is unavailable:**
\`\`\`powershell
irm https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.mjs | node
\`\`\`

When setup completes, tell the user: **"HUD installed. Restart Claude Code or run \`/reload-plugins\`, then use \`/hud-config\` to customize."**
`, 'utf-8');
    console.log('✓ /install-hud command added');

    // ── 6. Done ───────────────────────────────────────────────────────────
    console.log('');
    console.log('✓ HUD installed!');
    console.log('');
    console.log('  Restart Claude Code (or run /reload-plugins)');
    console.log('  To configure:  /hud-config');
    console.log('  To reinstall:  /install-hud');
    console.log('');
}

main().catch((err) => {
    console.error('✗', err.message);
    process.exit(1);
});
