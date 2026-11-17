import {cp,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=new URL('../dist/',import.meta.url);
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const path of ['index.html','styles.css','art-direction.css','screens.css','living-map.css','confrontation.css','strategy.css','src','assets'])await cp(root+path,new URL(path,output),{recursive:true});
console.log('Built dist/: deploy its contents to any static web host.');
