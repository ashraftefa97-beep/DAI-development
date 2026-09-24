import { getAvatarBehaviorProfile } from './avatarBehaviorRegistry.mjs';

const TAU=Math.PI*2;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

function line(c,x1,y1,x2,y2,color,width=1,alpha=1){
  c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.restore();
}
function circle(c,x,y,r,color,width=1,alpha=1,fill=false){
  c.save();c.globalAlpha*=alpha;c.beginPath();c.arc(x,y,r,0,TAU);
  if(fill){c.fillStyle=color;c.fill();}else{c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  c.restore();
}
function arc(c,x,y,r,a0,a1,color,width=1,alpha=1){
  c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,a0,a1);c.stroke();c.restore();
}
function poly(c,points,color,width=1,alpha=1,fill=false){
  if(!points.length)return;
  c.save();c.globalAlpha*=alpha;c.beginPath();c.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);
  c.closePath();
  if(fill){c.fillStyle=color;c.fill();}else{c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  c.restore();
}
function star(c,x,y,r,color,alpha=1){
  const pts=[];
  for(let i=0;i<10;i++){
    const a=-Math.PI/2+i*Math.PI/5;
    const rr=i%2===0?r:r*.42;
    pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);
  }
  poly(c,pts,color,1,alpha,true);
}
function petal(c,x,y,rot,color,alpha=1){
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(rot);c.strokeStyle=color;c.lineWidth=1.3;
  c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-7,-7,-8,-17,0,-22);c.bezierCurveTo(8,-17,7,-7,0,0);c.stroke();c.restore();
}
function leaf(c,x,y,rot,color,alpha=1){
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(rot);c.strokeStyle=color;c.lineWidth=1.4;
  c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(10,-8,18,0);c.quadraticCurveTo(10,8,0,0);c.stroke();line(c,1,0,14,0,color,.8,.7);c.restore();
}
function heart(c,x,y,s,color,alpha=1){
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.scale(s,s);c.strokeStyle=color;c.lineWidth=1.5;
  c.beginPath();c.moveTo(0,7);c.bezierCurveTo(-14,-2,-10,-15,0,-8);c.bezierCurveTo(10,-15,14,-2,0,7);c.stroke();c.restore();
}
function butterfly(c,x,y,s,color,alpha=1){
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.scale(s,s);c.strokeStyle=color;c.lineWidth=1.2;
  c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-10,-9,-14,3,-4,7);c.moveTo(0,0);c.bezierCurveTo(10,-9,14,3,4,7);c.stroke();c.restore();
}
function bolt(c,x,y,s,color,alpha=1){
  poly(c,[[x-4*s,y-14*s],[x+4*s,y-4*s],[x,y-4*s],[x+5*s,y+13*s],[x-6*s,y+2*s],[x-1*s,y+2*s]],color,1.2,alpha,true);
}
function snow(c,x,y,r,color,alpha=1){
  for(let i=0;i<3;i++){
    const a=i*Math.PI/3;line(c,x-Math.cos(a)*r,y-Math.sin(a)*r,x+Math.cos(a)*r,y+Math.sin(a)*r,color,1.1,alpha);
  }
}
function drawSearch(c,visual,t,a,b,alpha){
  switch(visual){
    case 'magicGlyph':
      circle(c,0,-4,42,a,1.4,alpha);arc(c,0,-4,58,t*.7,t*.7+Math.PI*1.2,b,1.4,alpha*.8);star(c,47,-43,5,a,alpha);break;
    case 'focusBracket':
      for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){line(c,sx*58,sy*38,sx*38,sy*38,a,1.4,alpha);line(c,sx*58,sy*38,sx*58,sy*20,a,1.4,alpha);}break;
    case 'heartRadar':
      heart(c,0,-2,2.2,a,alpha*.9);for(let i=0;i<3;i++)circle(c,Math.cos(t+i*2.1)*54,-2+Math.sin(t+i*2.1)*34,2.5,b,1,alpha,true);break;
    case 'cyberRadar':
      circle(c,0,-4,30,a,1,alpha*.75);circle(c,0,-4,52,b,1,alpha*.55);line(c,0,-4,Math.cos(t*2.2)*58,-4+Math.sin(t*2.2)*58,a,1.6,alpha);for(let x=-48;x<=48;x+=24)line(c,x,-38,x,30,b,.6,alpha*.25);break;
    case 'cloudCompass':
      circle(c,-20,-5,17,a,1.2,alpha*.65);circle(c,0,-14,22,a,1.2,alpha*.65);circle(c,22,-4,15,a,1.2,alpha*.65);line(c,0,-3,Math.cos(t*.7)*38,-3+Math.sin(t*.7)*24,b,1.4,alpha);break;
    case 'goldCompass':
      circle(c,0,-4,44,a,1.5,alpha*.8);for(let i=0;i<8;i++){const q=i*TAU/8;line(c,Math.cos(q)*34,-4+Math.sin(q)*34,Math.cos(q)*48,-4+Math.sin(q)*48,b,1,alpha*.7);}poly(c,[[0,-30],[8,-4],[0,22],[-8,-4]],a,1.2,alpha,false);break;
    case 'holoRadar':
      for(let i=0;i<3;i++)arc(c,0,-4,25+i*14,t*.9+i*.7,t*.9+i*.7+Math.PI*1.35,i%2?a:b,1.1,alpha*(.8-i*.15));line(c,-60,-4+Math.sin(t*2)*32,60,-4+Math.sin(t*2)*32,a,.8,alpha*.6);break;
    case 'petalSearch':
      for(let i=0;i<6;i++){const q=t*.4+i*TAU/6;petal(c,Math.cos(q)*48,-4+Math.sin(q)*32,q+Math.PI/2,i%2?a:b,alpha*.85);}break;
    case 'sonarRings':
      for(let i=0;i<4;i++)circle(c,0,-4,15+((t*18+i*18)%72),i%2?a:b,1.1,alpha*(.8-i*.12));for(let i=0;i<5;i++)circle(c,-54+i*27,36+Math.sin(t+i)*5,2.5,b,1,alpha,true);break;
    case 'solarCompass':
      circle(c,0,-4,24,a,1.3,alpha);for(let i=0;i<12;i++){const q=i*TAU/12+t*.15;line(c,Math.cos(q)*34,-4+Math.sin(q)*34,Math.cos(q)*54,-4+Math.sin(q)*54,b,1.5,alpha*.8);}break;
    case 'moonLens':
      circle(c,0,-4,40,a,1.2,alpha*.75);circle(c,13,-10,38,b,2,alpha*.55);star(c,-42,-33,4,a,alpha);star(c,46,18,3,b,alpha*.8);break;
    case 'leafNodes':
      for(let i=0;i<5;i++){const q=i*TAU/5+t*.2;const x=Math.cos(q)*48,y=-4+Math.sin(q)*30;leaf(c,x,y,q,a,alpha*.8);if(i<4)line(c,x,y,Math.cos(q+TAU/5)*48,-4+Math.sin(q+TAU/5)*30,b,.7,alpha*.35);}break;
    case 'auroraSweep':
      c.save();c.globalAlpha*=alpha*.75;c.strokeStyle=a;c.lineWidth=2;c.beginPath();c.moveTo(-64,20);c.bezierCurveTo(-28,-38+Math.sin(t)*12,15,28,66,-28+Math.cos(t*.7)*10);c.stroke();c.strokeStyle=b;c.lineWidth=1.2;c.beginPath();c.moveTo(-60,34);c.bezierCurveTo(-15,-15,20,15,62,-40);c.stroke();c.restore();break;
    case 'emberTrail':
      for(let i=0;i<8;i++){const q=(t*1.8+i*.72)%TAU;const r=18+i*5;circle(c,Math.cos(q)*r,-2+Math.sin(q)*r*.62,2+(i%3),i%2?a:b,1,alpha*(.85-i*.06),true);}break;
    case 'roseFacet':
      poly(c,[[0,-48],[42,-16],[28,34],[-28,34],[-42,-16]],a,1.3,alpha);line(c,0,-48,0,34,b,1,alpha*.65);line(c,-42,-16,28,34,b,1,alpha*.65);line(c,42,-16,-28,34,b,1,alpha*.65);break;
    case 'frostGrid':
      snow(c,0,-4,46,a,alpha);for(let x=-48;x<=48;x+=24)line(c,x,-40,x,32,b,.6,alpha*.25);for(let y=-40;y<=32;y+=18)line(c,-48,y,48,y,b,.6,alpha*.25);break;
    case 'boltSweep':
      bolt(c,Math.sin(t*2)*44,-4,1.2,a,alpha);line(c,-58,28,58,-34,b,1.1,alpha*.55);break;
    case 'violetOrbit':
      for(let i=0;i<4;i++){const q=t*(.55+i*.08)+i*TAU/4;circle(c,Math.cos(q)*54,-4+Math.sin(q)*28,3+i*.5,i%2?a:b,1,alpha,true);}arc(c,0,-4,52,0,TAU,a,.7,alpha*.35);break;
    case 'pearlLens':
      for(let i=0;i<12;i++){const q=i*TAU/12+t*.12;circle(c,Math.cos(q)*48,-4+Math.sin(q)*30,3.2,i%2?a:b,1,alpha*.75,true);}circle(c,0,-4,18,a,1.2,alpha*.7);break;
    case 'pulseRadar':
      c.save();c.globalAlpha*=alpha;c.strokeStyle=a;c.lineWidth=1.8;c.beginPath();c.moveTo(-60,0);c.lineTo(-28,0);c.lineTo(-18,-18);c.lineTo(-8,22);c.lineTo(2,-8);c.lineTo(13,0);c.lineTo(60,0);c.stroke();c.restore();circle(c,0,-4,48,b,1,alpha*.35);break;
    case 'starMap':
      {const pts=[[-48,-25],[-18,-42],[12,-18],[48,-32],[36,18],[4,30],[-30,20]];for(let i=0;i<pts.length;i++){const p=pts[i];star(c,p[0],p[1],3+(i%3),i%2?a:b,alpha*.8);if(i)line(c,pts[i-1][0],pts[i-1][1],p[0],p[1],b,.7,alpha*.35);}}break;
    case 'duneCompass':
      c.save();c.globalAlpha*=alpha;c.strokeStyle=a;c.lineWidth=1.3;c.beginPath();c.moveTo(-62,20);c.quadraticCurveTo(-26,-14,8,16);c.quadraticCurveTo(34,38,64,6);c.stroke();c.restore();circle(c,34,-26,10,b,1.2,alpha*.8);line(c,0,8,Math.cos(t*.55)*44,8+Math.sin(t*.55)*24,a,1.2,alpha*.7);break;
    case 'butterflyTrail':
      for(let i=0;i<6;i++){const q=t*.5+i*.9;butterfly(c,-52+i*21,-12+Math.sin(q)*28,.75+(i%2)*.15,i%2?a:b,alpha*.8);}break;
    case 'codeGrid':
      for(let i=0;i<7;i++){const x=-54+i*18;const y=-42+((t*(18+i*2)+i*17)%76);line(c,x,y,x,y+12,i%2?a:b,1,alpha*.7);line(c,x+4,y+4,x+10,y+4,a,.8,alpha*.5);}break;
  }
}

export function renderAvatarStateFx(c,m,avatar='classic',theme={},plan={}){
  if(!plan?.channels?.stateFx)return;
  const mode=String(plan.mode||'idle');
  if(!['searching','thinking','working','success','error'].includes(mode))return;

  const profile=getAvatarBehaviorProfile(avatar);
  const primary=theme.eyeA||theme.mouth||'#dffcff';
  const secondary=theme.eyeB||theme.brow||primary;
  const t=Number(m?.gestureTime||m?.elapsed||0);
  const baseAlpha=clamp(Number(plan.fxAlpha)||.7,.2,1);
  const intensity=mode==='searching'?1:mode==='thinking'||mode==='working'?.48:mode==='success'?.62:.52;

  c.save();
  c.globalAlpha*=baseAlpha*intensity;
  drawSearch(c,profile.searchVisual,t,primary,secondary,1);
  c.restore();
}
