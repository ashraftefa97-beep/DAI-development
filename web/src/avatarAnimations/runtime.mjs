export const REQUIRED_AVATAR_ANIMATION_SLOTS=[
  'idle','listening','thinking','searching','speaking','success','error'
];

const SLOT_GESTURES={
  idle:new Set(['idle','relax','breathe','sway','cozy_sway','meditate','dream','sleep','yawn','wait_patient','voicewait','recharge','look_around','curious']),
  listening:new Set(['listen','nod_yes','salute','peace']),
  thinking:new Set(['typing','thinking_deep','brainstorm','focus','code_focus','read','write','idea','lightbulb_pop','question','thought_orbit']),
  searching:new Set(['search','scan','detect','scout','window_peek','peek']),
  speaking:new Set(['talk','reply','music_nod']),
  success:new Set(['found','happy','success','celebrate','victory','cheer','approve','proud','excited','high_five','pose_star','welcome_back','giggle','laugh']),
  error:new Set(['error','alert','shake_no','startled','impatient','confused','shy'])
};

export function animationSlotForGesture(gesture='idle'){
  const normalized=String(gesture||'idle').replace(/^dai_/,'').replace('idle_soft','idle');
  for(const slot of REQUIRED_AVATAR_ANIMATION_SLOTS){
    if(SLOT_GESTURES[slot].has(normalized))return slot;
  }
  return null;
}

function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }

function normalizeMotion(base,index){
  const energy=clamp(Number(base.energy)||1,.25,1.8);
  const flow=clamp(Number(base.flow)||1,.3,1.8);
  const tempo=clamp(Number(base.tempo)||1,.35,1.9);
  const phase=(Number(base.phase)||0)+index*.71;
  return {
    x:flow*(.64+index*.10),
    y:flow*(.72+(index%2)*.20),
    tilt:energy*(.34+index*.08),
    scale:energy*(.0028+(index%3)*.0008),
    speed:tempo*(.88+index*.11),
    bounce:energy*(index%2?.18:.06),
    nod:energy*(index%3===2?.22:.05),
    orbit:flow*(index%3===1?.16:.04),
    phase
  };
}

function buildVariants(slot,gestures,base){
  const list=(Array.isArray(gestures)&&gestures.length?gestures:['idle']);
  return list.map((gesture,index)=>({
    id:`${base.id}-${slot}-${index+1}`,
    gesture:String(gesture||'idle'),
    weight:Math.max(.2,1-(index*.08)),
    durationMs:[
      Math.round((base.durationMin||2200)*(1+index*.06)),
      Math.round((base.durationMax||4200)*(1+index*.08))
    ],
    reducedSafe:index===0||slot==='speaking',
    accent:base.accent||'pulse',
    motion:normalizeMotion(base,index)
  }));
}

export function makeAvatarLibrary(config){
  const id=String(config?.id||'').trim();
  if(!id)throw new Error('Avatar animation library requires id');
  const gestures=config.gestures||{};
  const base={
    id,
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
    slots[slot]=buildVariants(slot,gestures[slot],base);
  }
  return Object.freeze({
    id,
    personality:config.personality||id,
    version:1,
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
  for(const slot of REQUIRED_AVATAR_ANIMATION_SLOTS){
    const variants=library.slots?.[slot];
    if(!Array.isArray(variants)||variants.length<2)errors.push(`${slot} requires at least 2 variants`);
    const ids=new Set();
    for(const variant of variants||[]){
      if(!variant.id)errors.push(`${slot}: variant missing id`);
      if(ids.has(variant.id))errors.push(`${slot}: duplicate variant ${variant.id}`);
      ids.add(variant.id);
      if(!variant.gesture)errors.push(`${slot}: ${variant.id||'variant'} missing gesture`);
      if(!variant.motion)errors.push(`${slot}: ${variant.id||'variant'} missing motion`);
    }
  }
  if(!library.reducedMotion)errors.push('missing reducedMotion fallback');
  return errors;
}

export function shouldAutoCycleAvatarSlot(slot){
  return ['idle','listening','thinking','searching','speaking'].includes(slot);
}
