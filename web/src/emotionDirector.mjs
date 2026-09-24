const EMOTION_PROFILES=Object.freeze({
  neutral:{energy:1,smile:0,cheek:0,tilt:0,gazeY:0,brow:0,hand:1,fx:1},
  warm:{energy:.92,smile:.10,cheek:.11,tilt:1.1,gazeY:.3,brow:-.02,hand:.92,fx:.90},
  happy:{energy:1.18,smile:.20,cheek:.20,tilt:1.8,gazeY:-.2,brow:.05,hand:1.08,fx:1.12},
  curious:{energy:1.02,smile:.05,cheek:.04,tilt:3.0,gazeY:-1.0,brow:.16,hand:.95,fx:.96},
  calm:{energy:.66,smile:.05,cheek:.05,tilt:.5,gazeY:.8,brow:-.08,hand:.72,fx:.62},
  serious:{energy:.78,smile:-.12,cheek:-.08,tilt:-.8,gazeY:-.5,brow:.20,hand:.68,fx:.54}
});

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

export function resolveEmotion(m){
  const mood=EMOTION_PROFILES[m?.speechMood]?m.speechMood:'neutral';
  const base=EMOTION_PROFILES[mood];
  const voice=clamp(Number(m?.voice)||0,0,1);
  const intensity=clamp(Number(m?.speechMoodIntensity)||.65,.15,1);
  const active=Boolean(m?.voiceDriven||voice>.03);
  const blend=active?clamp(.35+voice*.65,0,1)*intensity:intensity*.36;
  return Object.freeze({
    mood,
    blend,
    energy:1+(base.energy-1)*blend,
    smile:base.smile*blend,
    cheek:base.cheek*blend,
    tilt:base.tilt*blend,
    gazeY:base.gazeY*blend,
    brow:base.brow*blend,
    hand:1+(base.hand-1)*blend,
    fx:1+(base.fx-1)*blend
  });
}

export function applyEmotionToPose(p,m){
  const e=resolveEmotion(m);
  if(!p||!e)return p;
  p.smile=clamp((Number(p.smile)||0)+e.smile,-.35,1.2);
  p.cheek=clamp((Number(p.cheek)||0)+e.cheek,0,1.2);
  p.tilt=clamp((Number(p.tilt)||0)+e.tilt,-14,14);
  p.gaze_y=clamp((Number(p.gaze_y)||0)+e.gazeY,-9,9);
  p.brow=clamp((Number(p.brow)||0)+e.brow,-.35,1.25);
  p.la=clamp((Number(p.la)||0)*e.hand,0,1);
  p.ra=clamp((Number(p.ra)||0)*e.hand,0,1);
  if(!m?.reduced){
    p.bob=(Number(p.bob)||0)*e.energy;
  }
  return p;
}

export function validateEmotionProfile(){
  const errors=[];
  for(const [name,p] of Object.entries(EMOTION_PROFILES)){
    for(const key of ['energy','smile','cheek','tilt','gazeY','brow','hand','fx']){
      if(!Number.isFinite(p[key]))errors.push(`${name}: invalid ${key}`);
    }
  }
  return errors;
}
