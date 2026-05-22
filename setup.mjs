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

// Keep in lockstep with /VERSION, statusline.mjs and hud-config.mjs — see CLAUDE.md.
const VERSION = '0.2.0';

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

    // ── 2. Read previously installed version ──────────────────────────────
    const versionFile = join(HUD_DIR, '.version');
    let installedVersion = null;
    if (existsSync(versionFile)) {
        try { installedVersion = readFileSync(versionFile, 'utf-8').trim(); } catch {}
    }
    if (installedVersion && installedVersion !== VERSION) {
        console.log(`Updating ${installedVersion} → ${VERSION}`);
    } else if (installedVersion === VERSION) {
        console.log(`Already at ${VERSION} — reinstalling`);
    } else {
        console.log(`Installing ${VERSION}`);
    }

    // ── 3. Download HUD files (always overwrite) ──────────────────────────
    for (const f of ['statusline.mjs', 'hud-config.mjs']) {
        const dest = join(HUD_DIR, f);
        process.stdout.write(`Downloading ${f}...`);
        const content = await download(`${BASE_URL}/${f}`);
        writeFileSync(dest, content, 'utf-8');
        console.log(` ✓`);
    }
    writeFileSync(versionFile, VERSION + '\n', 'utf-8');
    console.log(`✓ HUD files ready in ${HUD_DIR} (v${VERSION})`);

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

Install Claude Code HUD. Run this command — works on any platform with Node.js:

\`\`\`bash
node -e "const h=require('https'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');const dir=path.join(os.homedir(),'.claude','hud');fs.mkdirSync(dir,{recursive:true});const dest=path.join(dir,'setup.mjs');function get(u,cb){h.get(u,r=>{if(r.statusCode>=300&&r.statusCode<400)return get(r.headers.location,cb);let d='';r.on('data',c=>d+=c);r.on('end',()=>cb(d))}).on('error',e=>{console.error(e.message);process.exit(1)})}get('https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.mjs',s=>{fs.writeFileSync(dest,s);cp.execFileSync(process.execPath,[dest],{stdio:'inherit'})})"
\`\`\`

When done, tell the user: **"HUD installed. Restart Claude Code or run \`/reload-plugins\`, then use \`/hud-config\` to customize."**
`, 'utf-8');
    console.log('✓ /install-hud command added');

    // ── 6. Done ───────────────────────────────────────────────────────────
    console.log('');
    console.log(`✓ HUD v${VERSION} installed!`);
    console.log('');
    console.log('  Restart Claude Code (or run /reload-plugins)');
    console.log('  To configure:    /hud-config');
    console.log('  To update later: /install-hud');
    console.log('');
}

main().catch((err) => {
    console.error('✗', err.message);
    process.exit(1);
});
