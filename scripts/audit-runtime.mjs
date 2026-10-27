import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=new URL('../extension/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
assert.deepEqual(manifest.permissions,['sidePanel','storage'],'Unexpected permission expansion');
assert.deepEqual(manifest.host_permissions,['https://app.weavy.ai/*','https://www.cbr.ru/*']);
assert.equal(manifest.content_security_policy.extension_pages,"script-src 'self'; object-src 'none'");
const html=fs.readFileSync(new URL('panel.html',root),'utf8');
assert.ok(!/\son\w+\s*=|javascript:|<iframe\b/i.test(html),'Unexpected active HTML');
for(const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 const src=tag[1].match(/src="([^"]+)"/)?.[1];assert.ok(src&&!/^(?:https?:|data:|\/\/)/.test(src));assert.equal(tag[2].trim(),'');
}
let count=0;
for(const name of fs.readdirSync(root,{recursive:true}).filter(n=>n.endsWith('.js'))){
 const code=fs.readFileSync(new URL(name,root),'utf8');
 assert.ok(!/\b(?:eval|Function)\s*\(/.test(code),name+': dynamic code execution');
 assert.ok(!/\b(?:child_process|execFile|spawnSync|chrome\.debugger)\b/.test(code),name+': unexpected native execution');
 for(const [,ref]of code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))assert.ok(fs.existsSync(new URL(ref,new URL(name,root))),name+' → '+ref);
 count++;
}
console.log(`Runtime audit: ${count} JS files; local imports, CSP, permissions and executable-code checks passed. This is not an antivirus verdict.`);
