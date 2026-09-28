const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const CLASSIC_PROFILE=Object.freeze({
  id:'classic',
  motionFamily:'magic-arc',
  searchVisual:'magicGlyph',
  listeningVisual:'magicGlyphListen',
  thinkingVisual:'orbitThought',
  successVisual:'softBurst',
  errorVisual:'softShake',
  tempo:1,
  tiltAmp:2.4,
  gazeAmp:5,
  bobAmp:1,
  scaleAmp:.006,
  phase:.1,
  legacySearchProps:true,
  searchHand:true
});

export const AVATAR_BEHAVIOR_PROFILES=Object.freeze({classic:CLASSIC_PROFILE});

export function getAvatarBehaviorProfile(){
  return CLASSIC_PROFILE;
}

export function applyAvatarBehaviorToPose(p,m){
  if(!p||!m)return p;
  const gesture=String(m.requestedGesture||m.gesture||'idle');
  const t=Number(m.gestureTime||0);
  const reduced=Boolean(m.reduced);

  if(['search','found'].includes(gesture)){
    const sweep=reduced?0:Math.sin(t*2);
    const wandPhase=clamp(t/.24,0,1);
    p.hat=1;
    p.wand=wandPhase;
    p.la=Math.max(Number(p.la)||0,wandPhase);
    p.lx=-111-sweep*5;
    p.ly=26;
    p.lr=-24+sweep*8;
  }

  return p;
}

export function avatarAllowsLegacyAccessory(_id,kind,gesture=''){
  if(kind==='fishing')return String(gesture)==='fishing';
  if(kind==='hat'||kind==='wand')return ['search','found'].includes(String(gesture));
  return false;
}

export function avatarAllowsHandGesture(_id,gesture=''){
  const value=String(gesture||'idle');
  if(['scan','detect','scout'].includes(value))return false;
  return true;
}

export function validateAvatarBehaviorProfiles(ids=[]){
  return ids.every(id=>id==='classic')?[]:['only Classic behavior profile is supported'];
}
