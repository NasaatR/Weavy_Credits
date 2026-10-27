import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const fixture=()=>{
 fs.mkdirSync('.cache',{recursive:true});const root=fs.mkdtempSync('.cache/package-');fs.mkdirSync(path.join(root,'scripts'));fs.mkdirSync(path.join(root,'extension'));
 fs.copyFileSync('scripts/package.py',path.join(root,'scripts/package.py'));fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'0.0.999-test'}));fs.writeFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),'Synthetic fixture');
 fs.writeFileSync(path.join(root,'extension/manifest.json'),JSON.stringify({background:{service_worker:'worker.js'},side_panel:{default_path:'panel.html'},content_scripts:[{js:['content.js']}]}));
 for(const [name,body]of Object.entries({'worker.js':"import './shared.js';",'shared.js':'export const test=1;','content.js':'(()=>{})();','panel.html':'<link href="panel.css"><script src="panel.js"></script>','panel.js':"import './shared.js';",'panel.css':'body {color:black}','unused.js':'not part of runtime','unused.exe':'not executable; synthetic unused file'}))fs.writeFileSync(path.join(root,'extension',name),body);
 return {root,archive:path.join(root,'downloads/WEAVY-CREDITS-0.0.999-test.zip'),build:()=>execFileSync('python3',[path.join(root,'scripts/package.py')],{stdio:'pipe'}),remove:()=>fs.rmSync(root,{recursive:true,force:true})};
};
test('the installable archive contains the complete runtime graph and no unrelated source files',()=>{
 const f=fixture();try{f.build();const names=JSON.parse(execFileSync('python3',['-c','import zipfile,json,sys;print(json.dumps(zipfile.ZipFile(sys.argv[1]).namelist()))',f.archive],{encoding:'utf8'}));assert.ok(names.every(n=>n.startsWith('WEAVY-CREDITS-0.0.999-test/')));assert.ok(names.includes('WEAVY-CREDITS-0.0.999-test/extension/manifest.json'));assert.ok(names.some(n=>n.endsWith('/extension/shared.js')));assert.ok(names.some(n=>n.endsWith('/PACKAGE-CONTENTS.sha256')));assert.ok(!names.some(n=>n.includes('unused')));assert.ok(names.every(n=>!n.includes('\\')));}finally{f.remove();}
});
test('packaging rejects a module reference outside the extension directory',()=>{
 const f=fixture();try{fs.writeFileSync(path.join(f.root,'extension/worker.js'),"import '../outside.js';");assert.throws(f.build,/Runtime reference escapes extension/);}finally{f.remove();}
});
test('a committed version archive cannot silently be replaced by changed bytes',()=>{
 const f=fixture();try{f.build();const before=fs.readFileSync(f.archive);execFileSync('git',['init','-q',f.root]);execFileSync('git',['-C',f.root,'add','.']);execFileSync('git',['-C',f.root,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','Synthetic package fixture']);fs.writeFileSync(path.join(f.root,'extension/shared.js'),'export const test=2;');assert.throws(f.build,/Refusing to replace/);assert.deepEqual(fs.readFileSync(f.archive),before);}finally{f.remove();}
});
