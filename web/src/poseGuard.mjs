function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

const FACE_RX=98;
const FACE_RY=86;
const FACE_CY=-4;
const HAND_MARGIN=10;

function insideFace(x,y,margin=0){
  const rx=FACE_RX+margin;
  const ry=FACE_RY+margin;
  return (x/rx)**2+((y-FACE_CY)/ry)**2<1;
}

function safeHandPoint(x,y,side){
  const dy=y-FACE_CY;
  const ny=dy/(FACE_RY+HAND_MARGIN);
  if(Math.abs(ny)>=1)return {x,y};

  const boundary=(FACE_RX+HAND_MARGIN)*Math.sqrt(Math.max(0,1-ny*ny));
  const safeX=(side<0?-1:1)*boundary;

  if(side<0&&x>safeX)return {x:safeX,y};
  if(side>0&&x<safeX)return {x:safeX,y};
  return {x,y};
}

function dampTwoHandCrowding(p){
  if((p.la||0)>.72&&(p.ra||0)>.72){
    const leftDist=Math.hypot((Number(p.lx)||-118)+92,(Number(p.ly)||72)-28);
    const rightDist=Math.hypot((Number(p.rx)||118)-92,(Number(p.ry)||72)-28);
    if(leftDist<rightDist)p.la*=.72;
    else p.ra*=.72;
  }
}

const HAND_INTENT_WINDOWS=Object.freeze({
  wave:1.8,
  double_wave:2.0,
  goodbye:1.9,
  hello_shy:1.5,
  salute:1.25,
  peace:1.6,
  high_five:1.35,
  clap:2.1,
  celebrate:2.25,
  cheer:1.9,
  victory:1.7,
  pose_star:1.8,
  stretch:2.4,
  side_stretch:2.35,
  heart:1.9,
  dance:2.8,
  music_groove:2.4,
  party:2.6,
  fishing:6.8,
  write:2.6,
  type_fast:2.2,
  search:2.1,
  scout:1.6,
  window_peek:1.5
});

export function handIntentScale(context={}){
  if(context.allowHands===false)return 0;
  const requested=String(context.requestedGesture||'idle');
  const active=String(context.activeGesture||requested);
  const gesture=HAND_INTENT_WINDOWS[requested]!=null?requested:
    HAND_INTENT_WINDOWS[active]!=null?active:null;
  if(!gesture)return 0;

  const maxHold=Number(HAND_INTENT_WINDOWS[gesture])||0;
  const age=Math.max(0,Number(context.gestureTime)||0);
  if(age<=maxHold)return 1;

  const fade=.34;
  if(age>=maxHold+fade)return 0;
  return Math.max(0,1-(age-maxHold)/fade);
}

export function handsShouldRest(context={}){
  return handIntentScale(context)<=.01;
}

export function applyNaturalHandPolicy(p,context={}){
  if(!p)return p;

  const scale=handIntentScale(context);
  if(scale<=.01){
    p.la=0;
    p.ra=0;
    p.lx=-118;p.ly=72;p.lr=-10;
    p.rx=118;p.ry=72;p.rr=10;
    return p;
  }

  p.la=(Number(p.la)||0)*scale;
  p.ra=(Number(p.ra)||0)*scale;

  // Even intentional gestures should not keep two hands equally dominant
  // unless the gesture itself clearly calls for both hands.
  const requested=String(context.requestedGesture||'');
  const twoHanded=new Set([
    'double_wave','clap','celebrate','victory','pose_star','stretch',
    'side_stretch','heart','dance','music_groove','party','type_fast'
  ]);
  if(!twoHanded.has(requested)){
    const la=Number(p.la)||0;
    const ra=Number(p.ra)||0;
    if(la>.08&&ra>.08){
      if(ra>=la)p.la=Math.min(la,.08);
      else p.ra=Math.min(ra,.08);
    }
  }

  return p;
}

export function guardPose(p,context={}){
  if(!p)return p;
  const mode=context.mode||'idle';
  const accessory=context.accessory||null;
  const reduced=Boolean(context.reduced);

  applyNaturalHandPolicy(p,context);

  if((p.la||0)>.05){
    const safe=safeHandPoint(Number(p.lx)||-118,Number(p.ly)||72,-1);
    p.lx=safe.x;p.ly=safe.y;
  }
  if((p.ra||0)>.05){
    const safe=safeHandPoint(Number(p.rx)||118,Number(p.ry)||72,1);
    p.rx=safe.x;p.ry=safe.y;
  }

  if(mode==='speaking'){
    p.lx=Math.min(Number(p.lx)||-118,-92);
    p.rx=Math.max(Number(p.rx)||118,92);
    p.ly=Math.max(Number(p.ly)||72,22);
    p.ry=Math.max(Number(p.ry)||72,22);
    dampTwoHandCrowding(p);
  }

  if(mode==='listening'){
    p.lx=Math.min(Number(p.lx)||-118,-86);
    p.rx=Math.max(Number(p.rx)||118,86);
  }

  if(accessory==='wand'){
    p.ra=Math.min(Number(p.ra)||0,.44);
  }else if(accessory==='fishing'){
    p.la=Math.min(Number(p.la)||0,.42);
  }

  if(reduced){
    p.lx=clamp(Number(p.lx)||-118,-126,-86);
    p.rx=clamp(Number(p.rx)||118,86,126);
    p.ly=clamp(Number(p.ly)||72,38,84);
    p.ry=clamp(Number(p.ry)||72,38,84);
  }

  p.lr=clamp(Number(p.lr)||-10,-44,44);
  p.rr=clamp(Number(p.rr)||10,-44,44);
  return p;
}

export function guardInterpolatedPose(p,context={}){
  if(!p)return p;
  guardPose(p,context);

  // Emergency visual guard: if smoothing would cross the face, fade the hand
  // slightly instead of allowing a sudden teleport through the character.
  if((p.la||0)>.05&&insideFace(Number(p.lx)||0,Number(p.ly)||0,2))p.la*=.28;
  if((p.ra||0)>.05&&insideFace(Number(p.rx)||0,Number(p.ry)||0,2))p.ra*=.28;
  return p;
}

export function poseHasFaceCollision(p){
  if(!p)return false;
  return ((p.la||0)>.05&&insideFace(Number(p.lx)||0,Number(p.ly)||0))||
    ((p.ra||0)>.05&&insideFace(Number(p.rx)||0,Number(p.ry)||0));
}
