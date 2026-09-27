import test from 'node:test';
import assert from 'node:assert/strict';
import { DaiMotion } from '../src/motion.mjs';
import { applyClassicPerformance, CLASSIC_PERFORMANCE_FAMILIES } from '../src/classicPerformance.mjs';

test('Classic performance preserves audio, Astra props and hands across every gesture',()=>{
  for(const gesture of Object.keys(CLASSIC_PERFORMANCE_FAMILIES)){
    const motion=new DaiMotion(()=>.5);motion.setGesture(gesture);
    for(let i=0;i<180;i++){
      motion.advance(1/60);
      const pose=motion.targets(),before={...pose};
      applyClassicPerformance(pose,motion);
      for(const key of ['mouth','mouthWide','mouthRound','lx','ly','rx','ry','la','ra','hat','wand','rod'])
        assert.equal(pose[key],before[key],`${gesture}: ${key}`);
      for(const value of Object.values(pose))assert.ok(Number.isFinite(value));
    }
  }
});
test('performance respects non-Classic, reduced motion, text and live speech',()=>{
  const motion=new DaiMotion(()=>.5);motion.setGesture('happy');motion.advance(.4);
  for(const override of [{avatarStyle:'cute'},{reduced:true},{voiceDriven:true},{voice:.2},{requestedGesture:'typing'},{requestedGesture:'talk'}]){
    const pose=motion.targets(),before={...pose};
    applyClassicPerformance(pose,{...motion,...override});
    assert.deepEqual(pose,before);
  }
});
test('one-shot accents settle without replaying while a state is held',()=>{
  const motion=new DaiMotion(()=>.5);
  for(const requestedGesture of Object.keys(CLASSIC_PERFORMANCE_FAMILIES)){
    const pose=motion.targets(),before={...pose};
    applyClassicPerformance(pose,{...motion,requestedGesture,gestureTime:5});
    assert.deepEqual(pose,before);
  }
});
