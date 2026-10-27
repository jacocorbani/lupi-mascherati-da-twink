// Produces only Git-visible files; ignored backups, env and credentials are excluded.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const git=process.env.GIT_BINARY||'git';
const paths=execFileSync(git,['ls-files','-co','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/);
const entries=[...new Set(paths)].filter(p=>fs.statSync(p).isFile()).map(p=>({path:p,encoding:p.endsWith('.png')?'base64':'utf-8',content:fs.readFileSync(p,p.endsWith('.png')?'base64':'utf8')}));
console.log(JSON.stringify(entries));
