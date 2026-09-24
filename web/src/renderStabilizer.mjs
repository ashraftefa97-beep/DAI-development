function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

const FACE={rx:104,ry:92,cy:-4};

function insideFace(x,y,margin=0){
  const rx=FACE.rx+margin,ry=FACE.ry+margin;
  return (x/rx)**2+((y-FACE.cy)/ry)**2<1;
}

function pushSideOutside(x,y,side,margin=8){
  const ry=FACE.ry+margin;
  const ny=(y-FACE.cy)/ry;
  if(Math.abs(ny)>=1)return {x,y};
  const boundary=(FACE.rx+margin)*Math.sqrt(Math.max(0,1-ny*ny));
  if(side<0&&x>-boundary)x=-boundary;
  if(side>0&&x<boundary)x=boundary;
  return {x,y};
}

export function stabilizeRenderedHands(left,right,context={}){
  const mode=context.mode||'idle';
  const reduced=Boolean(context.reduced);
  const out={
    left:{...left},
    right:{...right}
  };

  out.left=pushSideOutside(Number(out.left.x)||-118,Number(out.left.y)||72,-1,10);
  out.right=pushSideOutside(Number(out.right.x)||118,Number(out.right.y)||72,1,10);

  if(mode==='speaking'){
    out.left.x=Math.min(out.left.x,-94);
    out.right.x=Math.max(out.right.x,94);
    out.left.y=Math.max(out.left.y,24);
    out.right.y=Math.max(out.right.y,24);
  }

  if(reduced){
    out.left.x=clamp(out.left.x,-130,-90);
    out.right.x=clamp(out.right.x,90,130);
    out.left.y=clamp(out.left.y,36,86);
    out.right.y=clamp(out.right.y,36,86);
  }

  if(insideFace(out.left.x,out.left.y,4))out.left.alpha*=.2;
  if(insideFace(out.right.x,out.right.y,4))out.right.alpha*=.2;

  return out;
}

export function avatarSwapEnvelope(m){
  const start=Number(m?.avatarSwapStartedAt)||0;
  const end=Number(m?.avatarSwapUntil)||0;
  if(end<=start||m.elapsed>=end)return 1;
  const p=clamp((m.elapsed-start)/(end-start),0,1);
  const smooth=p*p*(3-2*p);
  return .18+.82*smooth;
}

export function sanitizePoseForRender(p){
  if(!p)return p;
  for(const key of ['left','right','lw','rw','smile','mouth','cheek','happy','la','ra','sx','sy']){
    if(!Number.isFinite(p[key]))p[key]=key==='sx'||key==='sy'?1:0;
  }
  p.left=clamp(p.left,.05,1.35);
  p.right=clamp(p.right,.05,1.35);
  p.lw=clamp(p.lw,.55,1.35);
  p.rw=clamp(p.rw,.55,1.35);
  p.smile=clamp(p.smile,-.35,1.2);
  p.mouth=clamp(p.mouth,0,1.15);
  p.cheek=clamp(p.cheek,0,1.2);
  p.happy=clamp(p.happy,0,1);
  p.la=clamp(p.la,0,1);
  p.ra=clamp(p.ra,0,1);
  p.sx=clamp(p.sx,.86,1.14);
  p.sy=clamp(p.sy,.86,1.14);
  p.gaze_x=clamp(Number(p.gaze_x)||0,-12,12);
  p.gaze_y=clamp(Number(p.gaze_y)||0,-9,9);
  p.tilt=clamp(Number(p.tilt)||0,-16,16);
  return p;
}
