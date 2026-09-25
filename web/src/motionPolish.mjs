import { getAvatarBehaviorProfile } from './avatarBehaviorRegistry.mjs';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const HASH_MOD=997;
function phaseFrom(value=''){
  let hash=17;
  for(const ch of String(value||''))hash=(hash*31+ch.charCodeAt(0))%HASH_MOD;
  return (hash/HASH_MOD)*Math.PI*2;
}

function motionMode(m){
  const gesture=String(m?.requestedGesture||m?.gesture||'idle');
  if(gesture==='talk'||gesture==='reply'||m?.state==='talking')return 'speaking';
  if(gesture==='listen')return 'listening';
  if(['search','scan','detect','scout','window_peek','peek'].includes(gesture))return 'searching';
  if(['thinking_deep','brainstorm','focus','code_focus','read','write','typing','type_fast','idea','lightbulb_pop','question','thought_orbit'].includes(gesture)||m?.state==='thinking')return 'thinking';
  if(['working','loading','wait_patient'].includes(gesture))return 'working';
  if(['success','found','celebrate','victory','cheer','happy','approve','proud','excited','high_five'].includes(gesture))return 'success';
  if(['error','alert','startled','impatient','confused','shake_no'].includes(gesture))return 'error';
  return 'idle';
}

const MODE_ENERGY={
  idle:.40,
  listening:.78,
  thinking:.82,
  searching:.90,
  working:.86,
  speaking:.72,
  success:1.04,
  error:.74
};

const MODE_GAZE={
  idle:.46,
  listening:.88,
  thinking:.80,
  searching:1.00,
  working:.82,
  speaking:.66,
  success:.72,
  error:.58
};

/**
 * Final procedural polish layer.
 *
 * The base gesture still owns meaning. This layer only adds multi-frequency
 * micro motion so DAI does not read as one repeated sine-wave animation.
 * It is deterministic for an avatar + semantic gesture, frame-rate independent
 * and deliberately never moves the hands.
 */
export function applyActiveMotionPolish(p,m){
  if(!p||!m||m.reduced)return p;

  const profile=getAvatarBehaviorProfile(m.avatarStyle);
  const mode=motionMode(m);
  const quality=m.quality==='high'?1:m.quality==='medium'?.82:.64;
  const t=Number(m.gestureTime||0);
  const gesture=String(m.requestedGesture||m.gesture||'idle');
  const phase=profile.phase+phaseFrom(String(m.avatarVariantId||m.avatarStyle)+':'+gesture);
  const tempo=Math.max(.42,Number(profile.tempo)||1);
  const energy=(MODE_ENERGY[mode]||.55)*quality;
  const gazeEnergy=(MODE_GAZE[mode]||.55)*quality;

  // Incommensurate frequencies prevent the mechanical "same beat forever" feel.
  const slow=
    Math.sin(t*(.34+.08*tempo)+phase)+
    .42*Math.sin(t*(.61+.05*tempo)+phase*.47);
  const mid=
    Math.sin(t*(.88+.19*tempo)+phase*.73)+
    .31*Math.cos(t*(1.31+.11*tempo)+phase*1.27);
  const fine=
    Math.sin(t*(1.74+.23*tempo)+phase*1.61)+
    .24*Math.sin(t*(2.47+.17*tempo)+phase*.29);
  const breathe=
    Math.sin(t*(.58+.035*tempo)+phase*.31)+
    .28*Math.sin(t*(.29+.02*tempo)+phase*1.13);

  const enter=clamp(t/.42,0,1);
  const settle=.72+.28*enter;

  // Head/body motion is layered over the semantic pose, never replaces it.
  p.tilt=(Number(p.tilt)||0)+slow*profile.tiltAmp*.18*energy*settle;
  p.bob=(Number(p.bob)||0)+mid*profile.bobAmp*.24*energy*settle;
  p.sx=(Number(p.sx)||1)+breathe*profile.scaleAmp*.42*energy;
  p.sy=(Number(p.sy)||1)-breathe*profile.scaleAmp*.56*energy;

  // Eyes should feel observant, not locked to one direction.
  p.gaze_x=(Number(p.gaze_x)||0)+
    (slow*.34+mid*.15)*profile.gazeAmp*gazeEnergy;
  p.gaze_y=(Number(p.gaze_y)||0)+
    (Math.cos(t*(.43+.07*tempo)+phase*.91)*.24+fine*.045)*
    Math.min(3.6,profile.gazeAmp*.52)*gazeEnergy;

  // Tiny facial life. Keep the amplitude low enough that the authored emotion
  // remains readable.
  p.brow=clamp((Number(p.brow)||0)+fine*.020*energy,-.35,1.25);
  p.smile=clamp((Number(p.smile)||0)+slow*.012*energy,-.35,1.2);

  if(mode==='listening'){
    // Listening is active attention: eyes lead, head follows slightly later.
    p.gaze_x+=(Math.sin(t*(1.07+.10*tempo)+phase)*.55)*gazeEnergy;
    p.tilt+=(Math.sin(t*.62+phase*.54)*.38)*energy;
    p.left=clamp((Number(p.left)||1)+Math.max(0,Math.sin(t*.55+phase))*.018*energy,.05,1.35);
    p.right=clamp((Number(p.right)||1)+Math.max(0,Math.cos(t*.57+phase))*.018*energy,.05,1.35);
  }else if(mode==='thinking'||mode==='searching'||mode==='working'){
    // Busy modes use a quicker eye layer and a slower body layer.
    p.gaze_x+=(Math.sin(t*(1.42+.14*tempo)+phase)*.52)*gazeEnergy;
    p.gaze_y-=Math.max(0,Math.sin(t*(.77+.05*tempo)+phase*.8))*.24*gazeEnergy;
    p.brow=clamp((Number(p.brow)||0)+Math.sin(t*.71+phase)*.035*energy,-.35,1.25);
  }else if(mode==='speaking'){
    // Speech remains face-led. Real voice amplitude adds gentle emphasis,
    // while hands stay untouched and therefore at rest.
    const voice=m.voiceDriven?clamp(Number(m.voice)||0,0,1):0;
    const emphasis=Math.pow(voice,.72);
    p.tilt+=(mid*.15+fine*.035)*energy;
    p.bob+=(mid*.055-emphasis*.18)*energy;
    p.gaze_x+=(slow*.18)*gazeEnergy;
    p.gaze_y-=emphasis*.10;
    p.sy+=(emphasis*.0018);
  }else if(mode==='success'){
    const lift=Math.max(0,Math.sin(t*(1.24+.08*tempo)+phase));
    p.bob-=lift*1.10*energy;
    p.tilt+=mid*.34*energy;
    p.smile=clamp((Number(p.smile)||0)+lift*.035*energy,-.35,1.2);
  }else if(mode==='error'){
    p.tilt+=Math.sin(t*.94+phase)*.24*energy;
    p.gaze_x+=Math.sin(t*1.18+phase)*.28*gazeEnergy;
    p.sx-=Math.abs(fine)*.0016*energy;
  }

  return p;
}
