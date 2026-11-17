import test from 'node:test';
import assert from 'node:assert/strict';
import {MANDATE_DAYS,STABILITY_TARGET} from '../src/data.js';
import {simulateCampaign} from '../tools/simulate.mjs';
import {stableDistricts,restore,serialize} from '../src/engine.js';

for(const [difficulty,seed,governor]of [['relaxed',72841,'cruz'],['standard',4,'cruz'],['standard',197,'ibarra'],['standard',72841,'vega'],['veteran',197,'cruz']]){
  test(`legal orders can win ${difficulty} as ${governor} (seed ${seed})`,()=>{
    const s=simulateCampaign({difficulty,seed,governor});
    assert.equal(s.outcome,'victory');assert.ok(s.day<MANDATE_DAYS);
    assert.ok(stableDistricts(s)>=STABILITY_TARGET);assert.ok(s.networks.every(n=>n.dismantled&&n.captured));
    assert.equal(s.holdDays,14);assert.ok(s.money>=0);assert.ok(s.trust>0);
    assert.equal(restore(serialize(s)).outcome,'victory');
  });
}
