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
      const wandPhase=clamp(1-Math.max(0,t-2.0)/.34,0,1);
      p.hat=1;
      p.wand=wandPhase;
      const sweep=reduced?0:Math.sin(t*2);
      p.la=wandPhase;
      p.lx=-111-sweep*5;
      p.ly=26;
      p.lr=-24+sweep*8;
    }else{
      // Scan/detect/scout and all non-Classic search states stay face/body led.
      p.hat=0;
      p.wand=0;
      p.la=0;
      p.ra=0;
    }
  }

  return p;
}

export function avatarAllowsLegacyAccessory(id,kind,gesture=''){
  const profile=getAvatarBehaviorProfile(id);
  if(kind==='fishing')return String(gesture)==='fishing';
  if(kind==='hat'||kind==='wand')return profile.legacySearchProps&&String(gesture)==='search';
  return false;
}

export function avatarAllowsHandGesture(id,gesture=''){
  const value=String(gesture||'idle');
  const profile=getAvatarBehaviorProfile(id);
  if(value==='search')return Boolean(profile.searchHand);
  if(['scan','detect','scout','found'].includes(value))return false;
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
