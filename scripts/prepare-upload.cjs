// Produces only Git-visible files; ignored backups, env and credentials are excluded.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const git=process.env.GIT_BINARY||'git';
const paths=execFileSync(git,['ls-files','-co','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/);
const entries=[...new Set(paths)].filter(p=>fs.existsSync(p)&&fs.statSync(p).isFile()).map(p=>({path:p,encoding:p.endsWith('.png')?'base64':'utf-8',content:fs.readFileSync(p,p.endsWith('.png')?'base64':'utf8')}));
console.log(JSON.stringify(process.argv.includes('--text') ? entries.filter(e=>e.encoding==='utf-8' && (!process.argv.includes('--without-lock') || e.path!=='pnpm-lock.yaml')) : entries));
