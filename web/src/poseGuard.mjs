function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

function insideFace(x,y){
  return (x/94)**2+((y+4)/82)**2<1;
}

function pushOutsideFace(x,y,side){
  if(!insideFace(x,y))return {x,y};
  const dx=x||side*1;
  const dy=y+4;
  const angle=Math.atan2(dy,dx);
  const rx=104,ry=92;
  return {
    x:Math.cos(angle)*rx,
    y:Math.sin(angle)*ry-4
  };
}

export function guardPose(p,context={}){
  if(!p)return p;
  const mode=context.mode||'idle';
  const accessory=context.accessory||null;
  const reduced=Boolean(context.reduced);

  if((p.la||0)>.05){
    const safe=pushOutsideFace(Number(p.lx)||-118,Number(p.ly)||72,-1);
    p.lx=safe.x;p.ly=safe.y;
  }
  if((p.ra||0)>.05){
    const safe=pushOutsideFace(Number(p.rx)||118,Number(p.ry)||72,1);
    p.rx=safe.x;p.ry=safe.y;
  }

  if(mode==='speaking'){
    p.lx=Math.min(Number(p.lx)||-118,-88);
    p.rx=Math.max(Number(p.rx)||118,88);
    p.ly=Math.max(Number(p.ly)||72,18);
    p.ry=Math.max(Number(p.ry)||72,18);
    if((p.la||0)>.72&&(p.ra||0)>.72){
      if((p.la||0)>=(p.ra||0))p.ra*=.62;
      else p.la*=.62;
    }
  }

  if(accessory==='wand'){
    p.ra=Math.min(Number(p.ra)||0,.48);
  }else if(accessory==='fishing'){
    p.la=Math.min(Number(p.la)||0,.45);
  }

  if(reduced){
    p.lx=clamp(Number(p.lx)||-118,-126,-82);
    p.rx=clamp(Number(p.rx)||118,82,126);
    p.ly=clamp(Number(p.ly)||72,34,84);
    p.ry=clamp(Number(p.ry)||72,34,84);
  }

  p.lr=clamp(Number(p.lr)||-10,-48,48);
  p.rr=clamp(Number(p.rr)||10,-48,48);
  return p;
}

export function poseHasFaceCollision(p){
  if(!p)return false;
  return ((p.la||0)>.05&&insideFace(Number(p.lx)||0,Number(p.ly)||0))||
    ((p.ra||0)>.05&&insideFace(Number(p.rx)||0,Number(p.ry)||0));
}
