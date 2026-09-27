import test from 'node:test';
import assert from 'node:assert/strict';
import {queuePcmLipSync} from '../src/pcmLipSync.mjs';
import {DaiMotion} from '../src/motion.mjs';
test('clock skips stale poses, holds onset and cancels',()=>{
 let next;const old=globalThis.requestAnimationFrame;
 globalThis.requestAnimationFrame=fn=>{next=fn;return 1;};
 try{const ctx={currentTime:0,state:'running'},events=[];let active=true;
 queuePcmLipSync(ctx,[{level:.2},{level:.4},{level:.8}],1,.02,.06,()=>active,(...args)=>events.push(args));
 next();assert.equal(events.at(-1)[0],0);
 ctx.currentTime=1.045;next();assert.equal(events.at(-1)[0],.8);
 ctx.state='suspended';next();assert.equal(events.at(-1)[0],0);
 ctx.state='running';active=false;next();assert.equal(events.at(-1)[1],false);
 }finally{globalThis.requestAnimationFrame=old;}
});
test('silent audio closes the mouth within 120ms without synthetic speech',()=>{
 const m=new DaiMotion();m.setGesture('talk');
 for(let i=0;i<30;i++){m.setVoiceLevel(.8,true);m.advance(1/60);}
 assert.ok(m.pose.mouth>.2);
 for(let i=0;i<7;i++){m.setVoiceLevel(0,true);m.advance(1/60);}
 assert.ok(m.pose.mouth<.055,`mouth remains open: ${m.pose.mouth}`);
});
