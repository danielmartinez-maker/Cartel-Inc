export const ART=Object.freeze({
  province:'./assets/connected-country.webp',
  neighborhoods:'./assets/neighborhood-tiles.webp',
  sprites:'./assets/map-sprites.webp',
  terrainCivic:'./assets/terrain-civic.webp',
  terrainResidential:'./assets/terrain-residential.webp',
  terrainDocks:'./assets/terrain-docks.webp',
  terrainRural:'./assets/terrain-rural.webp',
  terrainHills:'./assets/terrain-hills.webp',
  terrainIndustrial:'./assets/terrain-industrial.webp',
  terrainArid:'./assets/terrain-arid.webp',
  terrainWetland:'./assets/terrain-wetland.webp',
  terrainCoast:'./assets/terrain-coast.webp',
  menu:'./assets/menu-coast.webp',
  districts:'./assets/district-scenes.webp',
  portraits:'./assets/portraits-print.webp',
  cartelPortraits:'./assets/cartel-leaders.webp',
  emblems:'./assets/initiatives-print.webp',
  grain:'./assets/print-grain.svg',
});
export const TERRAIN_ART=Object.freeze({arid:2,wetland:6,mountain:0,forest:1,rural:2,urban:3,capital:4,border:5,coast:6,port:7});

export function loadImage(url,{createImage=()=>new Image(),timeoutMs=10000}={}){
  return new Promise(resolve=>{
    const image=createImage();let settled=false;
    const finish=ok=>{
      if(settled)return;
      settled=true;clearTimeout(timer);image.onload=null;image.onerror=null;
      resolve({url,ok});
    };
    const timer=setTimeout(()=>finish(false),timeoutMs);
    image.onload=async()=>{
      try{if(image.decode)await image.decode();finish(true);}catch{finish(false);}
    };
    image.onerror=()=>finish(false);
    image.decoding='async';image.src=url;
  });
}

// Progress represents settled image loads, including failures. A decorative
// image or stalled network request must never prevent a campaign from opening.
export async function preloadAssets(urls,{load=loadImage,onProgress=()=>{},concurrency=4}={}){
  const queue=[...new Set(urls)],total=queue.length,loaded=[],failed=[];
  let cursor=0,completed=0;
  const progress=()=>onProgress({completed,total,percent:total?Math.round(completed/total*100):100});
  progress();
  async function worker(){
    while(cursor<total){
      const url=queue[cursor++];
      try{const result=await load(url);(result.ok?loaded:failed).push(url);}catch{failed.push(url);}
      completed++;progress();
    }
  }
  await Promise.all(Array.from({length:Math.min(total,Math.max(1,Math.floor(concurrency)||1))},worker));
  return {loaded,failed,total};
}
