const sin=Math.sin;

export const AVATAR_CHOREOGRAPHY_DNA=Object.freeze({
  classic:{motif:'balanced-sway',speech:'balanced'}
});

export function applyAvatarChoreography(p,m){
  if(!p||!m)return p;
  const gesture=String(m.requestedGesture||m.gesture||'idle');
  const t=Number(m.gestureTime||0);
  const reduced=Boolean(m.reduced);

  // Classic keeps only subtle body presence outside the explicit Astra gestures.
  if(!reduced&&['idle','voicewait','thinking_deep','working'].includes(gesture)){
    p.bob=(Number(p.bob)||0)+sin(t*1.15)*.35;
    p.tilt=(Number(p.tilt)||0)+sin(t*.72)*.35;
  }
  return p;
}

export function validateAvatarChoreography(ids=[]){
  return ids.every(id=>id==='classic')?[]:['only Classic choreography is supported'];
}
