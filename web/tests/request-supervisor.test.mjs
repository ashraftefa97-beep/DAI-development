import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  DaiSupervisorError,
  getSupervisorHealth,
  resetSupervisorHealth,
  runSupervised,
  supervisorHttpError
} from '../src/requestSupervisor.ts';

test('supervisor retries a transient failure and returns the later success',async()=>{
  resetSupervisorHealth();
  let calls=0;
  const value=await runSupervised('chat-connect',async()=>{
    calls++;
    if(calls===1)throw supervisorHttpError(503,'TEMPORARY');
    return 'ok';
  },{baseDelayMs:0,maxDelayMs:0});
  assert.equal(value,'ok');
  assert.equal(calls,2);
  const health=getSupervisorHealth().find(item=>item.channel==='chat-connect');
  assert.equal(health?.retries,1);
  assert.equal(health?.successes,1);
});

test('abort errors are never retried',async()=>{
  resetSupervisorHealth();
  let calls=0;
  await assert.rejects(
    runSupervised('tts',async()=>{
      calls++;
      const error=new Error('user cancelled');
      error.name='AbortError';
      throw error;
    },{baseDelayMs:0,maxDelayMs:0}),
    error=>error?.name==='AbortError'
  );
  assert.equal(calls,1);
});

test('circuit breaker opens after repeated final failures',async()=>{
  resetSupervisorHealth('transcription');
  for(let i=0;i<2;i++){
    await assert.rejects(
      runSupervised('transcription',async()=>{
        throw new DaiSupervisorError('TRANSIENT','temporary',{retryable:true});
      },{
        maxAttempts:1,
        breakerThreshold:2,
        breakerCooldownMs:5000,
        baseDelayMs:0,
        maxDelayMs:0
      })
    );
  }
  const health=getSupervisorHealth().find(item=>item.channel==='transcription');
  assert.ok((health?.circuitUntil||0)>Date.now());

  await assert.rejects(
    runSupervised('transcription',async()=>true,{maxAttempts:1}),
    error=>error instanceof DaiSupervisorError&&error.code==='CIRCUIT_OPEN'
  );
});

test('reset clears a channel circuit without affecting other channels',async()=>{
  resetSupervisorHealth();
  await assert.rejects(
    runSupervised('live-token',async()=>{
      throw new DaiSupervisorError('LIVE_DOWN','down',{retryable:true});
    },{
      maxAttempts:1,
      breakerThreshold:2,
      breakerCooldownMs:5000
    })
  );
  resetSupervisorHealth('live-token');
  const live=getSupervisorHealth().find(item=>item.channel==='live-token');
  assert.equal(live?.failures,0);
  assert.equal(live?.circuitUntil,0);
});

test('channels keep independent health counters',async()=>{
  resetSupervisorHealth();
  await runSupervised('tts',async()=>true,{maxAttempts:1});
  await assert.rejects(
    runSupervised('research',async()=>{
      throw supervisorHttpError(500,'RESEARCH_DOWN');
    },{maxAttempts:1})
  );
  const health=getSupervisorHealth();
  assert.equal(health.find(item=>item.channel==='tts')?.successes,1);
  assert.equal(health.find(item=>item.channel==='research')?.failures,1);
  assert.equal(health.find(item=>item.channel==='chat-connect')?.failures,0);
});

test('GithubApp routes text and voice recovery through the supervisor',()=>{
  const app=fs.readFileSync(new URL('../src/GithubApp.tsx',import.meta.url),'utf8');
  assert.match(app,/runSupervised\('chat-connect'/);
  assert.match(app,/runSupervised\('tts'/);
  assert.match(app,/runSupervised\('transcription'/);
  assert.match(app,/runSupervised\('live-token'/);
  assert.match(app,/liveReconnectAttemptsRef/);
  assert.match(app,/ضي بترجعه تلقائيًا/);
  assert.doesNotMatch(app,/تشخيص الصوت:/);
  assert.doesNotMatch(app,/DAI Gemini voice failed/);
});

test('diagnostics use the real voice endpoint and expose supervisor health',()=>{
  const app=fs.readFileSync(new URL('../src/GithubApp.tsx',import.meta.url),'utf8');
  assert.match(app,/functions\.invoke\('tts-gemini'/);
  assert.match(app,/getSupervisorHealth\(\)/);
  assert.match(app,/id:'supervisor'/);
});
