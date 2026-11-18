import test from 'node:test';
import assert from 'node:assert/strict';
import {NEIGHBORHOOD_CELLS} from '../src/geography.js';
import {MAP} from '../src/data.js';
import {bounds,nativeZoomLimit,animationFrame} from '../src/raster.js';

test('native detail limits keep every neighborhood within its raster source at ordinary and high pixel density',()=>{
 for(const [width,height,dpr]of [[1363,936,1],[1363,936,2],[390,844,2],[2560,1440,2]]){
  const base=Math.max(MAP.width,MAP.height*width/height);
  for(const cells of NEIGHBORHOOD_CELLS)for(const poly of cells){
   const cell=bounds(poly),zoom=Math.min(48,nativeZoomLimit(width,height,dpr,cell));
   assert.ok(Math.max(cell.w,cell.h)*width/base*zoom*dpr<=1254.000001);
  }
 }
 const large=bounds(NEIGHBORHOOD_CELLS[1176][0]),small=bounds(NEIGHBORHOOD_CELLS[9][0]);
 assert.ok(nativeZoomLimit(1363,936,1,large)<nativeZoomLimit(1363,936,1,small));
});

test('animation sampling stays within the six authored poses and preserves a frozen time',()=>{
 const fixed=animationFrame(12.75,4);for(let i=0;i<10;i++)assert.equal(animationFrame(12.75,4),fixed);
 assert.equal(animationFrame(0),0);assert.equal(animationFrame(6/7),0);
 for(let i=0;i<100;i++)assert.ok(animationFrame(i/11,2)>=0&&animationFrame(i/11,2)<=5);
});
