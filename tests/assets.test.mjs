import test from 'node:test';
import assert from 'node:assert/strict';
import {preloadAssets,loadImage,ART,TERRAIN_ART} from '../src/assets.js';
import {TERRAIN} from '../src/data.js';
import {access} from 'node:fs/promises';

test('all scene artwork exists and every district terrain maps to an atlas cell',async()=>{
  for(const path of Object.values(ART))await access(path);
  assert.equal(new Set(Object.values(TERRAIN_ART)).size,8);
  for(const key of Object.keys(TERRAIN))assert.ok(Number.isInteger(TERRAIN_ART[key]));
});
test('a failed decorative image does not block readiness or progress completion',async()=>{
  const progress=[];
  const result=await preloadAssets(['menu','map','missing','portraits'],{
    load:async url=>{if(url==='missing')throw new Error('Network error');return {url,ok:true};},
    onProgress:value=>progress.push(value.percent),
  });
  assert.deepEqual(result.failed,['missing']);assert.equal(result.loaded.length,3);
  assert.equal(progress[0],0);assert.equal(progress.at(-1),100);
  assert.deepEqual(progress,[...progress].sort((a,b)=>a-b));
});
test('asset preloading deduplicates requests and respects its concurrency bound',async()=>{
  let active=0,peak=0;const calls=[];
  const result=await preloadAssets(['map','menu','map','icons','portraits','scenes'],{
    concurrency:2,
    load:async url=>{
      calls.push(url);active++;peak=Math.max(peak,active);
      await new Promise(resolve=>setTimeout(resolve,3));active--;
      return {url,ok:true};
    },
  });
  assert.equal(peak,2);assert.equal(result.total,5);assert.equal(calls.filter(x=>x==='map').length,1);
});
test('empty asset sets are immediately ready',async()=>{
  let percent;
  const result=await preloadAssets([],{onProgress:value=>{percent=value.percent;}});
  assert.equal(percent,100);assert.deepEqual(result,{loaded:[],failed:[],total:0});
});
test('a stalled image resolves as a failure instead of leaving loading stuck',async()=>{
  const result=await loadImage('stalled',{createImage:()=>({}),timeoutMs:5});
  assert.deepEqual(result,{url:'stalled',ok:false});
});
test('image decode failures resolve safely and can be retried',async()=>{
  let attempt=0;
  const createImage=()=>({
    set src(value){queueMicrotask(()=>this.onload?.());},
    async decode(){if(attempt++===0)throw new Error('Corrupt image');},
  });
  assert.equal((await loadImage('map',{createImage,timeoutMs:100})).ok,false);
  assert.equal((await loadImage('map',{createImage,timeoutMs:100})).ok,true);
});
