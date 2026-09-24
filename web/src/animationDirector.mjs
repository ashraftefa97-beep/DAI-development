import { resolveEmotion } from './emotionDirector.mjs';

export const DAI_ANIMATION_CHANNELS=Object.freeze([
  'face','mouth','body','hands','accessory','stateFx','signatureFx','avatarFx','libraryFx','particles'
]);

export const DAI_ANIMATION_PRIORITIES=Object.freeze({
  error:100,
  success:90,
  speaking:80,
  listening:70,
  searching:60,
  thinking:55,
  working:50,
  idle:10
});

const ERROR_GESTURES=new Set(['error','alert','startled','impatient','confused','shake_no']);
const SUCCESS_GESTURES=new Set(['success','found','celebrate','victory','cheer','happy','approve','proud','excited','high_five']);
const SEARCH_GESTURES=new Set(['search','scan','detect','scout','window_peek','peek']);
const THINK_GESTURES=new Set(['thinking_deep','brainstorm','focus','code_focus','read','write','typing','type_fast','idea','lightbulb_pop','question','thought_orbit','working']);
const LISTEN_GESTURES=new Set(['listen']);
const SPEAK_GESTURES=new Set(['talk','reply']);

function qualityBudget(quality='high'){
  if(quality==='low')return 1;
  if(quality==='medium')return 2;
  return 3;
}

export function animationModeForMotion(m){
  const gesture=String(m?.requestedGesture||m?.gesture||'idle');
  if(ERROR_GESTURES.has(gesture)||m?.state==='confused')return 'error';
  if(SUCCESS_GESTURES.has(gesture)||m?.state==='happy')return 'success';
  if((m?.voiceDriven||m?.voice>0.04)&&(SPEAK_GESTURES.has(gesture)||m?.state==='talking'))return 'speaking';
  if(LISTEN_GESTURES.has(gesture)||m?.pose?.listen>0.12)return 'listening';
  if(SEARCH_GESTURES.has(gesture))return 'searching';
  if(THINK_GESTURES.has(gesture)||m?.state==='thinking')return 'thinking';
  if(gesture==='working'||gesture==='loading'||gesture==='wait_patient')return 'working';
  return 'idle';
}

export function animationModeForGesture(gesture='idle'){
  const value=String(gesture||'idle');
  if(ERROR_GESTURES.has(value))return 'error';
  if(SUCCESS_GESTURES.has(value))return 'success';
  if(SPEAK_GESTURES.has(value))return 'speaking';
  if(LISTEN_GESTURES.has(value))return 'listening';
  if(SEARCH_GESTURES.has(value))return 'searching';
  if(THINK_GESTURES.has(value))return 'thinking';
  if(value==='working'||value==='loading'||value==='wait_patient')return 'working';
  return 'idle';
}

export function requestAnimationTransition(currentGesture,nextGesture,context={}){
  const currentMode=animationModeForGesture(currentGesture);
  const nextMode=animationModeForGesture(nextGesture);
  const currentPriority=DAI_ANIMATION_PRIORITIES[currentMode]||0;
  const nextPriority=DAI_ANIMATION_PRIORITIES[nextMode]||0;
  const now=Number(context.now)||0;
  const lockedUntil=Number(context.lockedUntil)||0;
  const voiceActive=Boolean(context.voiceActive);

  if(nextMode==='error')return {accept:true,mode:nextMode,lockMs:650};
  if(currentMode==='speaking'&&voiceActive&&nextMode!=='error'&&nextPriority<currentPriority){
    return {accept:false,mode:currentMode,lockMs:0};
  }
  if(now<lockedUntil&&nextPriority<currentPriority){
    return {accept:false,mode:currentMode,lockMs:0};
  }

  const lockMs=
    nextMode==='success'?480:
    nextMode==='error'?650:
    nextMode==='speaking'?120:
    nextMode==='listening'?100:
    nextMode==='searching'||nextMode==='thinking'?140:
    0;

  return {accept:true,mode:nextMode,lockMs};
}

function pickAccessory(pose={}){
  const options=[
    ['fishing',Number(pose.rod)||0],
    ['wand',Number(pose.wand)||0],
    ['hat',Number(pose.hat)||0]
  ].filter(([,value])=>value>.03).sort((a,b)=>b[1]-a[1]);
  return options[0]?.[0]||null;
}

function fxOrderForMode(mode){
  if(mode==='speaking')return ['signatureFx','avatarFx','libraryFx'];
  if(mode==='listening')return ['avatarFx','signatureFx','libraryFx'];
  if(mode==='searching'||mode==='thinking'||mode==='working')return ['libraryFx','avatarFx','signatureFx'];
  if(mode==='success'||mode==='error')return ['avatarFx','signatureFx','libraryFx'];
  return ['signatureFx','avatarFx','libraryFx'];
}

export function createAnimationPlan(m,context={}){
  const mode=animationModeForMotion(m);
  const reduced=Boolean(m?.reduced);
  const quality=['high','medium','low'].includes(m?.quality)?m.quality:'high';
  const accessory=pickAccessory(m?.pose);
  const emotion=resolveEmotion(m);
  const width=Math.max(0,Number(context?.width)||0);
  const compact=width>0&&width<=640;
  const modeDensity=
    mode==='speaking'?.58:
    mode==='listening'?.70:
    mode==='thinking'||mode==='searching'||mode==='working'?.76:
    mode==='success'?1.06:
    mode==='error'?.82:
    1;
  const qualityDensity=quality==='high'?1:quality==='medium'?.82:.62;
  const compactDensity=compact?.82:1;
  const motionDensity=Math.max(.34,Math.min(1.08,qualityDensity*compactDensity*modeDensity*emotion.energy));
  let budget=qualityBudget(quality);
  if(reduced)budget=0;
  if(accessory)budget=Math.max(0,budget-1);
  if(mode==='speaking')budget=Math.min(budget,quality==='high'?1:0);
  if(mode==='listening')budget=Math.min(budget,1);
  if(emotion.fx<.72)budget=Math.max(0,budget-1);
  if(compact&&quality!=='high')budget=Math.max(0,budget-1);

  const enabledFx=new Set(fxOrderForMode(mode).slice(0,budget));
  const semantic=String(m?.requestedGesture||m?.gesture||'idle');
  const isBusy=mode!=='idle';
  const handScale=(
    mode==='speaking'?.42:
    mode==='listening'?.70:
    mode==='thinking'||mode==='searching'||mode==='working'?.78:
    1
  )*emotion.hand*motionDensity;

  const particles=
    !reduced&&
    quality!=='low'&&
    mode!=='speaking'&&
    !accessory;

  return Object.freeze({
    mode,
    priority:DAI_ANIMATION_PRIORITIES[mode]||0,
    quality,
    reduced,
    compact,
    accessory,
    handScale,
    motionDensity,
    fxAlpha:Math.max(.28,Math.min(1.08,emotion.fx*motionDensity)),
    emotion,
    channels:Object.freeze({
      face:true,
      mouth:true,
      body:true,
      hands:true,
      accessory:Boolean(accessory),
      stateFx:mode==='listening'||mode==='thinking'||mode==='searching'||mode==='working'||mode==='success'||mode==='error',
      signatureFx:enabledFx.has('signatureFx'),
      avatarFx:enabledFx.has('avatarFx'),
      libraryFx:enabledFx.has('libraryFx'),
      particles
    }),
    overlays:Object.freeze({
      listen:mode==='listening',
      personality:mode==='idle'||mode==='success',
      thoughtDots:(mode==='thinking'||mode==='working')&&!SEARCH_GESTURES.has(semantic),
      searchFocus:mode==='searching',
      suppressAmbient:isBusy&&mode!=='success'
    })
  });
}

export function validateAnimationPlan(plan){
  const errors=[];
  if(!plan||typeof plan!=='object')return ['plan missing'];
  const activeFx=['signatureFx','avatarFx','libraryFx'].filter(key=>plan.channels?.[key]);
  const max=plan.reduced?0:plan.quality==='high'?3:plan.quality==='medium'?2:1;
  if(activeFx.length>max)errors.push('fx budget exceeded');
  if(plan.mode==='speaking'&&activeFx.length>1)errors.push('speaking fx overload');
  if(plan.reduced&&plan.channels?.particles)errors.push('reduced motion cannot render particles');
  if(plan.accessory&&!['hat','wand','fishing'].includes(plan.accessory))errors.push('invalid accessory');
  if(!Number.isFinite(plan.motionDensity)||plan.motionDensity<.3||plan.motionDensity>1.1)errors.push('invalid motion density');
  if(!Number.isFinite(plan.fxAlpha)||plan.fxAlpha<.2||plan.fxAlpha>1.1)errors.push('invalid fx alpha');
  return errors;
}
