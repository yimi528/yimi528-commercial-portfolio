import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCMSConfig, readCMSResponse } from '../src/lib/cmsConfig.ts';
const config={stats:{makers:10,finalistProjects:5,prizePool:'88万',judges:3},announcement:'中文公告'};
test('legacy missing English fields preserve the Chinese source and never invent a different prize value',()=>{
 const saved=normalizeCMSConfig(config);assert.equal(saved.stats.prizePool,'88万');assert.equal(saved.stats.prizePoolEn,'');assert.equal(saved.announcementEn,'');assert.equal(saved.streamUrl,'');
 assert.deepEqual(readCMSResponse({config:null}),{config:null,updatedAt:null});
});
test('malformed counts, text objects and missing content/version are rejected before publication',()=>{
 for(const value of [null,false,'10',1.5,-1,1000001])assert.throws(()=>normalizeCMSConfig({...config,stats:{...config.stats,makers:value}}));
 for(const value of [{...config,announcement:{}},{...config,stats:[]},{...config,stats:{...config.stats,prizePoolEn:null}},{...config,streamUrl:'javascript:alert(1)'}])assert.throws(()=>normalizeCMSConfig(value));
 for(const value of [{},{config},{config:null,updatedAt:'2026-10-27T00:00:00Z'},{config,updatedAt:'invalid'}])assert.throws(()=>readCMSResponse(value));
});
test('explicit zero is valid and text normalization matches persisted server values',()=>{
 const saved=normalizeCMSConfig({...config,stats:{...config.stats,makers:0},announcement:'  saved notice  '});assert.equal(saved.stats.makers,0);assert.equal(saved.announcement,'saved notice');
 assert.equal(readCMSResponse({config:saved,updatedAt:'2026-10-27T00:00:00Z'}).config.stats.makers,0);
});
