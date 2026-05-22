---
description: Update Claude Code HUD to the latest version
allowed-tools: [Bash]
---

Update Claude Code HUD to the latest version from `main`. Same underlying installer as `/install-hud` — safe to re-run anytime.

The installer prints `Updating X → Y` (upgrade), `Already at X — reinstalling` (same version), or `Installing X` (if somehow not previously installed). Run this command — works on any platform with Node.js:

```bash
node -e "const h=require('https'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');const dir=path.join(os.homedir(),'.claude','hud');fs.mkdirSync(dir,{recursive:true});const dest=path.join(dir,'setup.mjs');function get(u,cb){h.get(u,r=>{if(r.statusCode>=300&&r.statusCode<400)return get(r.headers.location,cb);let d='';r.on('data',c=>d+=c);r.on('end',()=>cb(d))}).on('error',e=>{console.error(e.message);process.exit(1)})}get('https://raw.githubusercontent.com/TomasHolas/claude-code-hud/main/setup.mjs',s=>{fs.writeFileSync(dest,s);cp.execFileSync(process.execPath,[dest],{stdio:'inherit'})})"
```

When done, tell the user: **"HUD updated. Restart Claude Code or run `/reload-plugins` to apply."** The user's `config.json` is never modified.

Note: GitHub raw has a 5-minute CDN cache, so freshly-pushed versions may take up to 5 min to appear here.
