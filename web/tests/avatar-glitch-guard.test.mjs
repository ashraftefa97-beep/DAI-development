import test from 'node:test';
import assert from 'node:assert/strict';

import { stabilizeRenderedHands, avatarSwapEnvelope, sanitizePoseForRender } from '../src/renderStabilizer.mjs';

test('final render stabilizer keeps post-DNA hand offsets away from the face',()=>{
  const result=stabilizeRenderedHands(
    {x:-30,y:-15,alpha:1},
    {x:35,y:-12,alpha:1},
    {mode:'idle',reduced:false}
  );
  assert.ok(result.left.x<=-90);
  assert.ok(result.right.x>=90);
});

test('speaking render stabilizer protects the mouth area',()=>{
  const result=stabilizeRenderedHands(
    {x:-70,y:-28,alpha:1},
    {x:72,y:-25,alpha:1},
    {mode:'speaking',reduced:false}
  );
  assert.ok(result.left.x<=-94);
  assert.ok(result.right.x>=94);
  assert.ok(result.left.y>=24);
  assert.ok(result.right.y>=24);
});

test('pose sanitizer removes invalid numbers and extreme geometry',()=>{
  const pose={
    left:NaN,right:Infinity,lw:5,rw:-2,smile:9,mouth:-4,cheek:8,happy:4,
    la:3,ra:-2,sx:5,sy:.1,gaze_x:90,gaze_y:-90,tilt:100
  };
  sanitizePoseForRender(pose);
  for(const key of ['left','right','lw','rw','smile','mouth','cheek','happy','la','ra','sx','sy','gaze_x','gaze_y','tilt']){
    assert.ok(Number.isFinite(pose[key]),key+' should be finite');
  }
  assert.ok(pose.sx<=1.14&&pose.sy>=.86);
  assert.ok(pose.gaze_x<=12&&pose.gaze_y>=-9);
  assert.ok(pose.tilt<=16);
});

test('avatar swap envelope softens the first rendered frames',()=>{
  const start={elapsed:5,avatarSwapStartedAt:5,avatarSwapUntil:5.26};
  const middle={elapsed:5.13,avatarSwapStartedAt:5,avatarSwapUntil:5.26};
  const end={elapsed:5.3,avatarSwapStartedAt:5,avatarSwapUntil:5.26};
  assert.ok(avatarSwapEnvelope(start)<avatarSwapEnvelope(middle));
  assert.ok(avatarSwapEnvelope(middle)<1);
  assert.equal(avatarSwapEnvelope(end),1);
});
