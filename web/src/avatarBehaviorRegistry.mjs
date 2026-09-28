const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const profile=(id,motionFamily,searchVisual,thinkingVisual,successVisual,errorVisual,opts={})=>Object.freeze({
  id,
  motionFamily,
  searchVisual,
  listeningVisual:opts.listeningVisual||`${searchVisual}Listen`,
  thinkingVisual,
  successVisual,
  errorVisual,
  tempo:opts.tempo??1,
  tiltAmp:opts.tiltAmp??2,
  gazeAmp:opts.gazeAmp??4,
  bobAmp:opts.bobAmp??1,
  scaleAmp:opts.scaleAmp??.006,
  phase:opts.phase??0,
  legacySearchProps:Boolean(opts.legacySearchProps),
  searchHand:Boolean(opts.searchHand)
});

const SHARED_GESTURES=new Set([
  'wave','listen','search','found','talk','happy',
  'stretch','fishing','heart','dance','idea','sleep'
]);

function applySharedGestureStyle(p,m,profile,gesture,t,reduced){
  if(!SHARED_GESTURES.has(gesture))return p;
  const w=reduced?0:Math.sin(t*profile.tempo+profile.phase);
  const w2=reduced?0:Math.cos(t*profile.tempo*.71+profile.phase*.53);
  const motionScale=clamp(.72+profile.tempo*.22,.78,1.28);

  // Keep semantic motion common, then add each avatar's own timing/body language.
  if(gesture==='wave'){
    p.tilt=(Number(p.tilt)||0)+w*profile.tiltAmp*.45;
    p.gaze_x=(Number(p.gaze_x)||0)+w2*profile.gazeAmp*.18;
    p.bob=(Number(p.bob)||0)+w*profile.bobAmp*.45;
    if(Number(p.ra)>0.01){
      p.rx=(Number(p.rx)||0)+w*6*motionScale;
      p.rr=(Number(p.rr)||0)+w*8*motionScale;
    }
  }else if(gesture==='listen'){
    p.tilt=(Number(p.tilt)||0)+w*profile.tiltAmp*.22;
    p.gaze_x=(Number(p.gaze_x)||0)+w2*profile.gazeAmp*.16;
    p.bob=(Number(p.bob)||0)+w*profile.bobAmp*.30;
  }else if(gesture==='found'||gesture==='happy'){
    p.tilt=(Number(p.tilt)||0)+w*profile.tiltAmp*.38;
    p.gaze_x=(Number(p.gaze_x)||0)+w2*profile.gazeAmp*.18;
    p.bob=(Number(p.bob)||0)-Math.abs(w)*profile.bobAmp*.55;
    p.sx=(Number(p.sx)||1)+Math.abs(w)*profile.scaleAmp*.7;
    p.sy=(Number(p.sy)||1)-Math.abs(w)*profile.scaleAmp*.42;
  }else if(gesture==='stretch'){
    p.tilt=(Number(p.tilt)||0)+w*profile.tiltAmp*.18;
    p.bob=(Number(p.bob)||0)-Math.abs(w)*profile.bobAmp*.25;
    if(Number(p.la)>0.01)p.lx=(Number(p.lx)||0)-Math.abs(w)*5*motionScale;
    if(Number(p.ra)>0.01)p.rx=(Number(p.rx)||0)+Math.abs(w)*5*motionScale;
  }else if(gesture==='fishing'){
    p.tilt=(Number(p.tilt)||0)+w*profile.tiltAmp*.32;
    p.gaze_x=(Number(p.gaze_x)||0)+w2*profile.gazeAmp*.24;
    p.bob=(Number(p.bob)||0)+w*profile.bobAmp*.34;
  }else if(gesture==='heart'){
    p.tilt=(Number(p.tilt)||0)+w*profile.tiltAmp*.30;
    p.bob=(Number(p.bob)||0)-Math.abs(w)*profile.bobAmp*.34;
    p.sx=(Number(p.sx)||1)+Math.abs(w)*profile.scaleAmp*.45;
  }else if(gesture==='dance'){
    p.tilt=(Number(p.tilt)||0)+w*profile.tiltAmp*.64;
    p.gaze_x=(Number(p.gaze_x)||0)+w2*profile.gazeAmp*.22;
    p.bob=(Number(p.bob)||0)-Math.abs(w)*profile.bobAmp*.80;
    p.sx=(Number(p.sx)||1)+Math.abs(w)*profile.scaleAmp;
    p.sy=(Number(p.sy)||1)-Math.abs(w)*profile.scaleAmp*.64;
  }else if(gesture==='idea'){
    p.tilt=(Number(p.tilt)||0)+w*profile.tiltAmp*.26;
    p.gaze_x=(Number(p.gaze_x)||0)+w2*profile.gazeAmp*.20;
    p.gaze_y=(Number(p.gaze_y)||0)-Math.abs(w)*Math.min(2.5,profile.gazeAmp*.24);
    p.bob=(Number(p.bob)||0)-Math.abs(w)*profile.bobAmp*.24;
  }else if(gesture==='sleep'){
    p.tilt=(Number(p.tilt)||0)+w*profile.tiltAmp*.10;
    p.bob=(Number(p.bob)||0)+w*profile.bobAmp*.16;
    p.sx=(Number(p.sx)||1)-w*profile.scaleAmp*.20;
    p.sy=(Number(p.sy)||1)+w*profile.scaleAmp*.28;
  }else if(gesture==='talk'){
    // Voice remains the only mouth authority; personality only affects head/gaze.
    p.tilt=(Number(p.tilt)||0)+w*profile.tiltAmp*.10;
    p.gaze_x=(Number(p.gaze_x)||0)+w2*profile.gazeAmp*.08;
    p.bob=(Number(p.bob)||0)+w*profile.bobAmp*.08;
  }
  return p;
}

export const AVATAR_BEHAVIOR_PROFILES=Object.freeze({
  classic:profile('classic','magic-arc','magicGlyph','orbitThought','softBurst','softShake',{tempo:1.0,tiltAmp:2.4,gazeAmp:5,bobAmp:1.0,phase:.1,legacySearchProps:true,searchHand:true}),
  minimal:profile('minimal','precision-still','focusBracket','singleDot','cleanTick','flatBlink',{tempo:.62,tiltAmp:.55,gazeAmp:2,bobAmp:.12,scaleAmp:.001,phase:.4}),
  cute:profile('cute','bouncy-pop','heartRadar','bubbleThought','heartPop','poutRipple',{tempo:1.45,tiltAmp:3.4,gazeAmp:4.4,bobAmp:2.5,scaleAmp:.014,phase:.8}),
  cyber:profile('cyber','servo-snap','cyberRadar','dataOrbit','circuitBurst','glitchCross',{tempo:2.05,tiltAmp:2.2,gazeAmp:6.2,bobAmp:.45,scaleAmp:.003,phase:1.2}),
  soft:profile('soft','floating-breath','cloudCompass','softCloud','pastelBloom','fadeRipple',{tempo:.72,tiltAmp:1.7,gazeAmp:3,bobAmp:1.8,scaleAmp:.009,phase:1.7}),
  pro:profile('pro','formal-control','goldCompass','goldFocus','goldCheck','goldAlert',{tempo:.58,tiltAmp:.7,gazeAmp:2.4,bobAmp:.18,scaleAmp:.002,phase:2.0}),
  hologram:profile('hologram','phase-shift','holoRadar','echoThought','phaseBurst','signalBreak',{tempo:1.7,tiltAmp:2.7,gazeAmp:5.5,bobAmp:.8,scaleAmp:.005,phase:2.4}),
  sakura:profile('sakura','petal-arc','petalSearch','petalThought','petalBloom','petalFall',{tempo:.92,tiltAmp:2.8,gazeAmp:3.8,bobAmp:1.1,scaleAmp:.007,phase:2.8}),
  ocean:profile('ocean','wave-flow','sonarRings','waterOrbit','waveBurst','rippleDrop',{tempo:.78,tiltAmp:2.5,gazeAmp:4.2,bobAmp:1.7,scaleAmp:.008,phase:3.1}),
  solar:profile('solar','radial-rise','solarCompass','sunFocus','sunBurst','eclipsePulse',{tempo:1.18,tiltAmp:2.9,gazeAmp:4.6,bobAmp:2.0,scaleAmp:.011,phase:3.5}),
  midnight:profile('midnight','moon-drift','moonLens','constellation','starTwinkle','moonFade',{tempo:.54,tiltAmp:1.8,gazeAmp:3.2,bobAmp:1.5,scaleAmp:.005,phase:3.9}),
  mint:profile('mint','sprout-bounce','leafNodes','sproutThought','leafBurst','wiltPulse',{tempo:.95,tiltAmp:2.1,gazeAmp:3.8,bobAmp:1.4,scaleAmp:.008,phase:4.2}),
  aurora:profile('aurora','ribbon-cross','auroraSweep','ribbonThought','auroraBloom','ribbonFade',{tempo:1.12,tiltAmp:3.0,gazeAmp:4.8,bobAmp:1.5,scaleAmp:.009,phase:4.6}),
  ember:profile('ember','ember-punch','emberTrail','sparkThought','flameBurst','ashFall',{tempo:1.65,tiltAmp:3.4,gazeAmp:5.0,bobAmp:2.6,scaleAmp:.014,phase:5.0}),
  rose:profile('rose','wrist-bloom','roseFacet','gemThought','roseBloom','crackFade',{tempo:.76,tiltAmp:2.0,gazeAmp:3.4,bobAmp:.9,scaleAmp:.006,phase:5.4}),
  ice:profile('ice','crystal-lock','frostGrid','crystalThought','iceFlash','crackPulse',{tempo:.82,tiltAmp:1.5,gazeAmp:3.0,bobAmp:.4,scaleAmp:.003,phase:5.8}),
  lime:profile('lime','zigzag-snap','boltSweep','chargeThought','boltBurst','staticBreak',{tempo:2.2,tiltAmp:3.8,gazeAmp:6.0,bobAmp:1.1,scaleAmp:.007,phase:6.1}),
  violet:profile('violet','orbital-hands','violetOrbit','orbitalThought','violetBurst','orbitDrop',{tempo:1.04,tiltAmp:2.6,gazeAmp:4.5,bobAmp:1.0,scaleAmp:.006,phase:6.5}),
  pearl:profile('pearl','poised-glide','pearlLens','pearlThought','pearlFlash','softDim',{tempo:.48,tiltAmp:.55,gazeAmp:2.0,bobAmp:.2,scaleAmp:.002,phase:6.9}),
  crimson:profile('crimson','heartbeat-hit','pulseRadar','pulseThought','heartBeatBurst','pulseDrop',{tempo:1.42,tiltAmp:2.8,gazeAmp:4.8,bobAmp:1.6,scaleAmp:.010,phase:7.3}),
  galaxy:profile('galaxy','counter-orbit','starMap','cosmicThought','novaBurst','starCollapse',{tempo:.88,tiltAmp:2.4,gazeAmp:4.4,bobAmp:1.3,scaleAmp:.008,phase:7.7}),
  desert:profile('desert','dune-sway','duneCompass','sandThought','sunDuneBurst','sandFade',{tempo:.66,tiltAmp:2.3,gazeAmp:3.1,bobAmp:1.2,scaleAmp:.007,phase:8.0}),
  lavender:profile('lavender','butterfly-flutter','butterflyTrail','flutterThought','flowerBurst','petalFade',{tempo:1.2,tiltAmp:2.7,gazeAmp:4.0,bobAmp:1.6,scaleAmp:.009,phase:8.4}),
  matrix:profile('matrix','quantized-code','codeGrid','codeThought','codeSuccess','codeError',{tempo:2.35,tiltAmp:2.4,gazeAmp:6.3,bobAmp:.25,scaleAmp:.002,phase:8.8})
});

export function getAvatarBehaviorProfile(id='classic'){
  return AVATAR_BEHAVIOR_PROFILES[id]||AVATAR_BEHAVIOR_PROFILES.classic;
}

export function applyAvatarBehaviorToPose(p,m){
  if(!p||!m)return p;
  const profile=getAvatarBehaviorProfile(m.avatarStyle);
  const gesture=String(m.requestedGesture||m.gesture||'idle');
  const searchLike=['search','scan','detect','scout'].includes(gesture);
  const t=Number(m.gestureTime||0);
  const reduced=Boolean(m.reduced);
  const wave=reduced?0:Math.sin(t*profile.tempo+profile.phase);
  const wave2=reduced?0:Math.cos(t*profile.tempo*.73+profile.phase*.67);

  // Legacy magic props belong to Classic DAI only. Every other avatar owns
  // its own visual search language.
  if(!profile.legacySearchProps){
    p.hat=0;
    p.wand=0;
  }

  if(searchLike){
    p.tilt=(Number(p.tilt)||0)+wave*profile.tiltAmp;
    p.gaze_x=(Number(p.gaze_x)||0)+wave2*profile.gazeAmp;
    p.gaze_y=(Number(p.gaze_y)||0)-Math.abs(wave)*Math.min(4,profile.gazeAmp*.5);
    p.bob=(Number(p.bob)||0)+wave*profile.bobAmp;
    p.sx=(Number(p.sx)||1)+Math.abs(wave)*profile.scaleAmp;
    p.sy=(Number(p.sy)||1)-Math.abs(wave)*profile.scaleAmp*.65;

    const magicSearch=profile.legacySearchProps&&gesture==='search';
    if(magicSearch){
      const wandPhase=clamp(t/.24,0,1);
      p.hat=1;
      p.wand=wandPhase;
      const sweep=reduced?0:Math.sin(t*2);
      p.la=wandPhase;
      p.lx=-111-sweep*5;
      p.ly=26;
      p.lr=-24+sweep*8;
    }else{
      // Non-Classic avatars keep their own search hand, but never inherit
      // Classic's magic hat or wand. Scan/detect/scout remain hand-free.
      p.hat=0;
      p.wand=0;
      if(['scan','detect','scout'].includes(gesture)){
        p.la=0;
        p.ra=0;
      }
    }
  }

  applySharedGestureStyle(p,m,profile,gesture,t,reduced);
  return p;
}

export function avatarAllowsLegacyAccessory(id,kind,gesture=''){
  const profile=getAvatarBehaviorProfile(id);
  if(kind==='fishing')return String(gesture)==='fishing';
  if(kind==='hat'||kind==='wand')return profile.legacySearchProps&&['search','found'].includes(String(gesture));
  return false;
}

export function avatarAllowsHandGesture(id,gesture=''){
  const value=String(gesture||'idle');
  const profile=getAvatarBehaviorProfile(id);
  if(value==='search'||value==='found')return true;
  if(['scan','detect','scout'].includes(value))return false;
  return true;
}

export function validateAvatarBehaviorProfiles(ids=[]){
  const errors=[];
  const visualSets={
    searchVisual:new Set(),
    listeningVisual:new Set(),
    thinkingVisual:new Set(),
    successVisual:new Set(),
    errorVisual:new Set()
  };
  const motionFamilies=new Set();
  for(const id of ids){
    const p=AVATAR_BEHAVIOR_PROFILES[id];
    if(!p){errors.push(`${id}: missing behavior profile`);continue;}

    for(const key of Object.keys(visualSets)){
      const value=p[key];
      if(!value)errors.push(`${id}: missing ${key}`);
      else if(visualSets[key].has(value))errors.push(`${id}: duplicate ${key} ${value}`);
      else visualSets[key].add(value);
    }

    if(motionFamilies.has(p.motionFamily))errors.push(`${id}: duplicate motion family ${p.motionFamily}`);
    motionFamilies.add(p.motionFamily);

    for(const key of ['tempo','tiltAmp','gazeAmp','bobAmp','scaleAmp','phase']){
      if(!Number.isFinite(p[key]))errors.push(`${id}: invalid ${key}`);
    }
  }
  return errors;
}
