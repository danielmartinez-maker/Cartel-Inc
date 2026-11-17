import {readdir,readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {ART} from '../src/assets.js';
const files=[];
async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,entry.name);if(entry.isDirectory())await scan(p);else if(/\.(mjs|js)$/.test(p))files.push(p);}}
for(const dir of ['src','tools','tests'])await scan(dir);
for(const file of files)execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
const html=await readFile('index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))await access(match[1]);
await access('assets/portraits.webp');await access('assets/initiatives.webp');
for(const path of Object.values(ART))await access(path);
for(const stylesheet of ['styles.css','art-direction.css','screens.css','living-map.css','confrontation.css']){
  const css=await readFile(stylesheet,'utf8');
  for(const match of css.matchAll(/url\(['"]?(\.\/[^'"\)]+)['"]?\)/g))await access(resolve(dirname(stylesheet),match[1]));
}
console.log(`${files.length} JavaScript modules checked. Entry points and generated assets present.`);
