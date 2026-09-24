export const REQUIRED_AVATAR_ANIMATION_SLOTS=[
  'idle','listening','thinking','searching','speaking','success','error'
];

export const AVATAR_VARIANT_COUNTS=Object.freeze({
  idle:16,
  listening:8,
  thinking:14,
  searching:10,
  speaking:12,
  success:12,
  error:8
});

export const AVATAR_LIBRARY_SIZE=Object.values(AVATAR_VARIANT_COUNTS).reduce((sum,value)=>sum+value,0);

const SLOT_GESTURES={
  idle:new Set(['idle','relax','breathe','sway','cozy_sway','meditate','dream','sleep','yawn','wait_patient','voicewait','recharge','look_around','curious','stretch','side_stretch','roam_walk']),
  listening:new Set(['listen','nod_yes','salute','peace','curious']),
  thinking:new Set(['typing','thinking_deep','brainstorm','focus','code_focus','read','write','idea','lightbulb_pop','question','thought_orbit','working']),
  searching:new Set(['search','scan','detect','scout','window_peek','peek','look_around']),
  speaking:new Set(['talk','reply','music_nod','nod_yes']),
  success:new Set(['found','happy','success','celebrate','victory','cheer','approve','proud','excited','high_five','pose_star','welcome_back','giggle','laugh','clap','double_wave']),
  error:new Set(['error','alert','shake_no','startled','impatient','confused','shy','surprise_soft'])
};

export function animationSlotForGesture(gesture='idle'){
  const normalized=String(gesture||'idle').replace(/^dai_/,'').replace('idle_soft','idle');
  for(const slot of REQUIRED_AVATAR_ANIMATION_SLOTS){
    if(SLOT_GESTURES[slot].has(normalized))return slot;
  }
  return null;
}

function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }
function round(value,places=5){
  const p=10**places;
  return Math.round(value*p)/p;
}
function hash32(input){
  let h=2166136261>>>0;
  const text=String(input);
  for(let i=0;i<text.length;i++){
    h^=text.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  h^=h>>>13;
  h=Math.imul(h,0x5bd1e995);
  h^=h>>>15;
  return h>>>0;
}
function seededUnit(seed,label){
  return hash32(`${seed}|${label}`)/4294967295;
}

function normalizeMotion(base,slot,index,gesture){
  const energy=clamp(Number(base.energy)||1,.25,1.8);
  const flow=clamp(Number(base.flow)||1,.3,1.8);
  const tempo=clamp(Number(base.tempo)||1,.35,1.9);
  const seed=`${base.id}|${base.personality}|${slot}|${index}|${gesture}`;
  const n=label=>seededUnit(seed,label);
  const signed=label=>n(label)*2-1;
  const motion={
    x:round(flow*(.48+n('x')*1.16)),
    y:round(flow*(.52+n('y')*.98)),
    tilt:round(energy*(.18+n('tilt')*.96)),
    scale:round(energy*(.0018+n('scale')*.0068),6),
    speed:round(tempo*(.58+n('speed')*1.06)),
    bounce:round(energy*(.018+n('bounce')*.36)),
    nod:round(energy*(.015+n('nod')*.29)),
    orbit:round(flow*(.012+n('orbit')*.28)),
    lean:round(energy*signed('lean')*.34),
    shake:round(energy*n('shake')*.18),
    breath:round(.58+n('breath')*.92),
    cadence:round(.72+n('cadence')*.86),
    drift:round(flow*signed('drift')*.26),
    gazeX:round(signed('gazeX')*.82),
    gazeY:round(signed('gazeY')*.58),
    handBias:round(signed('handBias')*.72),
    handLift:round(signed('handLift')*.54),
    phase:round((Number(base.phase)||0)+n('phase')*Math.PI*2)
  };
  const fingerprint=[
    motion.x,motion.y,motion.tilt,motion.scale,motion.speed,motion.bounce,motion.nod,
    motion.orbit,motion.lean,motion.shake,motion.breath,motion.cadence,motion.drift,
    motion.gazeX,motion.gazeY,motion.handBias,motion.handLift,motion.phase
  ].join(':');
  return {motion,fingerprint};
}

function buildVariants(slot,gestures,base){
  const list=(Array.isArray(gestures)&&gestures.length?gestures:['idle']);
  const count=AVATAR_VARIANT_COUNTS[slot]||2;
  const offset=hash32(`${base.id}|${slot}|offset`)%list.length;
  return Array.from({length:count},(_,index)=>{
    const gesture=String(list[(index+offset)%list.length]||'idle');
    const {motion,fingerprint}=normalizeMotion(base,slot,index,gesture);
    const durationSeed=seededUnit(`${base.id}|${slot}|${index}`,'duration');
    const spanSeed=seededUnit(`${base.id}|${slot}|${index}`,'span');
    const durationMin=Math.round((base.durationMin||2200)*(.82+durationSeed*.42));
    const durationMax=Math.max(durationMin+550,Math.round((base.durationMax||4200)*(.88+spanSeed*.48)));
    const accentVariant=1+(hash32(`${base.id}|${slot}|${index}|accent`)%4);
    return Object.freeze({
      id:`${base.id}-${slot}-${String(index+1).padStart(2,'0')}`,
      gesture,
      weight:round(.56+seededUnit(`${base.id}|${slot}|${index}`,'weight')*.88),
      durationMs:[durationMin,durationMax],
      reducedSafe:index%4===0||slot==='speaking'||slot==='listening',
      accent:(base.accent||'pulse')+'-'+accentVariant,
      motion:Object.freeze(motion),
      fingerprint
    });
  });
}

export function makeAvatarLibrary(config){
  const id=String(config?.id||'').trim();
  if(!id)throw new Error('Avatar animation library requires id');
  const gestures=config.gestures||{};
  const base={
    id,
    personality:config.personality||id,
    energy:config.energy??1,
    flow:config.flow??1,
    tempo:config.tempo??1,
    phase:config.phase??0,
    accent:config.accent||'pulse',
    durationMin:config.durationMin||2200,
    durationMax:config.durationMax||4200
  };
  const slots={};
  for(const slot of REQUIRED_AVATAR_ANIMATION_SLOTS){
    slots[slot]=Object.freeze(buildVariants(slot,gestures[slot],base));
  }
  return Object.freeze({
    id,
    personality:base.personality,
    version:2,
    variantCount:AVATAR_LIBRARY_SIZE,
    cooldownMs:Math.max(350,Number(config.cooldownMs)||900),
    reducedMotion:Object.freeze({
      intensity:clamp(Number(config.reducedIntensity)||.22,.08,.45),
      minDurationMs:Math.max(2400,Number(config.reducedMinDurationMs)||3600)
    }),
    slots:Object.freeze(slots)
  });
}

function weightedPick(candidates,random){
  const total=candidates.reduce((sum,item)=>sum+(Number(item.weight)||1),0);
  let needle=(random?.()??Math.random())*total;
  for(const item of candidates){
    needle-=Number(item.weight)||1;
    if(needle<=0)return item;
  }
  return candidates[candidates.length-1];
}

export function selectAvatarVariant(library,requestedGesture,options={}){
  if(!library)return null;
  const slot=animationSlotForGesture(requestedGesture);
  if(!slot)return null;
  let candidates=[...(library.slots?.[slot]||[])];
  if(!candidates.length)return null;
  if(options.reduced){
    const safe=candidates.filter(item=>item.reducedSafe!==false);
    if(safe.length)candidates=safe;
  }
  if(options.lastId&&candidates.length>1){
    const fresh=candidates.filter(item=>item.id!==options.lastId);
    if(fresh.length)candidates=fresh;
  }
  const variant=weightedPick(candidates,options.random);
  const min=Math.max(900,Number(variant.durationMs?.[0])||2200);
  const max=Math.max(min,Number(variant.durationMs?.[1])||4200);
  let durationMs=min+((options.random?.()??Math.random())*(max-min));
  if(options.reduced)durationMs=Math.max(durationMs,library.reducedMotion?.minDurationMs||3600);
  return {...variant,slot,durationMs:Math.round(durationMs)};
}

export function validateAvatarLibrary(library){
  const errors=[];
  if(!library||typeof library!=='object')return ['library is not an object'];
  if(!library.id)errors.push('missing id');
  let total=0;
  const libraryIds=new Set();
  const libraryFingerprints=new Set();
  for(const slot of REQUIRED_AVATAR_ANIMATION_SLOTS){
    const variants=library.slots?.[slot];
    const expected=AVATAR_VARIANT_COUNTS[slot];
    if(!Array.isArray(variants)||variants.length!==expected)errors.push(`${slot} requires exactly ${expected} variants`);
    total+=Array.isArray(variants)?variants.length:0;
    for(const variant of variants||[]){
      if(!variant.id)errors.push(`${slot}: variant missing id`);
      if(libraryIds.has(variant.id))errors.push(`${slot}: duplicate variant ${variant.id}`);
      libraryIds.add(variant.id);
      if(!variant.gesture)errors.push(`${slot}: ${variant.id||'variant'} missing gesture`);
      if(!variant.motion)errors.push(`${slot}: ${variant.id||'variant'} missing motion`);
      if(!variant.fingerprint)errors.push(`${slot}: ${variant.id||'variant'} missing fingerprint`);
      if(libraryFingerprints.has(variant.fingerprint))errors.push(`${slot}: duplicate motion fingerprint ${variant.id}`);
      libraryFingerprints.add(variant.fingerprint);
    }
  }
  if(total!==AVATAR_LIBRARY_SIZE)errors.push(`library requires exactly ${AVATAR_LIBRARY_SIZE} variants`);
  if(!library.reducedMotion)errors.push('missing reducedMotion fallback');
  return errors;
}

export function shouldAutoCycleAvatarSlot(slot){
  return ['idle','listening','thinking','searching','speaking'].includes(slot);
}
