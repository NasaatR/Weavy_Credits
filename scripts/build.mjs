import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
await fs.writeFile(path.join(root,'extension/version.js'),`// Generated from package.json by npm run build.\nexport const VERSION = ${JSON.stringify(version)};\n`);
const manifestPath=path.join(root,'extension/manifest.json'),manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
manifest.version=version;manifest.version_name=version;
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
const htmlPath=path.join(root,'extension/panel.html'),html=await fs.readFile(htmlPath,'utf8');
await fs.writeFile(htmlPath,html.replace(/(<span (?:id="version"|data-version)>)[^<]*(<\/span>)/g,(_,start,end)=>start+version+end));
for(const name of ['content','observer']){
 await build({absWorkingDir:root,entryPoints:[`extension/${name}-source.js`],outfile:`extension/${name}.js`,bundle:true,format:'iife',platform:'browser',target:'chrome116',charset:'utf8',minify:true,legalComments:'eof',loader:{'.css':'text'},logLevel:'silent'});
}
console.log('Built local Chrome 116+ content and observer bundles.');
