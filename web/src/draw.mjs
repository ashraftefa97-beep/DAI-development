// Canvas equivalents of DaiFace's QPainter paths. No head, body, or ears.
import { clamp } from './motion.mjs';
const rad = a => a * Math.PI / 180;
function path(c, d, fill, stroke, width=1) {
  const p = new Path2D(d);
  if(fill) { c.fillStyle=fill; c.fill(p); }
  if(stroke) { c.strokeStyle=stroke; c.lineWidth=width; c.stroke(p); }
  return p;
}
function ellipse(c,x,y,rx,ry,fill,stroke,width=1) {
  c.beginPath(); c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);
  if(fill) {c.fillStyle=fill;c.fill();}
  if(stroke) {c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function line(c,x,y,x2,y2,color,width) {
  c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function star(c,x,y,size,color,angle=0) {
  c.save();c.translate(x,y);c.rotate(rad(angle));c.scale(size,size);
  path(c,'M0 -1 Q.2 -.2 1 0 Q.2 .2 0 1 Q-.2 .2 -1 0 Q-.2 -.2 0 -1',color);c.restore();
}
function light(c,x,y,r,color,rx=r,ry=r) {
  const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');
  ellipse(c,x,y,rx,ry,g);
}
function hand(c,x,y,rotation,opacity,mirror,grip) {
  if(opacity<.01)return;
  c.save();c.translate(x,y);c.rotate(rad(rotation));c.scale(mirror?-1:1,1);c.globalAlpha=opacity;
  const d=grip?'M-13 11 C-21 0 -11 -16 -4 -11 C4 -23 18 -11 15 -1 C23 8 7 22 -5 18 Q-12 18 -13 11 Z':
    'M-14 13 C-23 6 -24 -3 -19 -5 Q-16 -7 -11 1 L-15 -17 C-17 -24 -10 -27 -7 -19 L-3 -5 L-5 -24 C-5 -31 3 -31 4 -24 L6 -7 L8 -22 C9 -29 16 -26 15 -19 L14 -3 Q21 -18 24 -11 C27 -8 16 17 10 20 C1 24 -9 22 -14 13 Z';
  path(c,d,'#171221','rgba(220,188,242,.098)',8);path(c,d,null,'#FFE1EB',2.4);
  path(c,'M-10 3 Q1 -2 5 8',null,'#C9ACE2',1.5);c.restore();
}
function eye(c,m,x,openness,width,happy,tilt) {
  const q=m.pose; c.save();c.translate(x+q.gaze_x,-17+q.gaze_y);c.rotate(rad(tilt));
  const blink=m.blinkTime<.19?1-.97*Math.sin(Math.PI*m.blinkTime/.19):1;
  const w=35*width,h=Math.max(4,75*openness*blink),r=Math.min(w*.47,h/2);
  const g=c.createLinearGradient(-w/2,-h/2,w/2,h/2);
  g.addColorStop(0,'#FFF7EC');g.addColorStop(.55,'#FFE4ED');g.addColorStop(1,'#CEBDF7');
  c.globalAlpha=1-happy*.94;c.beginPath();c.roundRect(-w/2,-h/2,w,h,r);
  c.fillStyle=g;c.fill();c.strokeStyle='rgba(255,195,220,.059)';c.lineWidth=11;c.stroke();
  c.globalAlpha=happy;path(c,'M-22 5 C-16 -19 16 -19 22 5',null,'#FFE9F0',7);c.restore();
}
function hat(c,m) {
  const amount=m.pose.hat;if(amount<.01)return;
  c.save();c.globalAlpha=amount;c.translate(-4,-78-(1-amount)*45);
  c.rotate(rad(-9+(m.reduced?0:Math.sin(m.elapsed*2)*2)));c.scale(amount,amount);
  const g=c.createLinearGradient(-40,-80,42,0);g.addColorStop(0,'#8B93F2');g.addColorStop(1,'#594E9E');
  path(c,'M-43 -4 C-25 -30 -8 -62 -15 -99 C23 -94 17 -43 46 -8 Q0 8 -43 -4',g,'#B3ABFF',1.5);
  ellipse(c,1,-3,51,9,'#ACA0F0','#B3ABFF',1.5);
  path(c,'M-33 -19 Q0 -8 34 -19 L42 -8 Q0 5 -42 -8 Z','#E8BCD9');
  star(c,1,-50,7,'#FFF0BF',12);star(c,-9,-76,3,'#EEE3FF');star(c,17,-28,3,'#EEE3FF');c.restore();
}
function wand(c,m) {
  const q=m.pose;if(q.wand<.01)return;
  c.save();c.globalAlpha=q.wand;
  const x=q.lx,y=q.ly,tx=x-39,ty=y-77;
  line(c,x,y+5,tx,ty,'#C9B5EC',5);line(c,tx,ty,x-31,y-62,'#FFE3B6',6);
  light(c,tx,ty,38,'rgba(255,215,148,.176)');
  star(c,tx,ty,11,'#FFE7AF',m.reduced?0:m.elapsed*28);
  for(let i=0;i<5;i++) {
    const a=i*1.256+(m.reduced?0:m.elapsed*.65),r=26+(i%2)*12;
    star(c,tx+Math.cos(a)*r,ty+Math.sin(a)*r,2.8+i%2,'rgba(255,222,161,.647)',m.reduced?0:-m.elapsed*20);
  }
  c.restore();
}
function listen(c,m) {
  const q=m.pose;if(q.listen<.01)return;
  c.save();c.globalAlpha=q.listen;
  const level=m.audio;
  for(let i=0;i<3;i++) {
    const a=(i-1)*.5,x=q.rx+34,y=q.ry-6,inner=12+level*3,outer=27+level*12;
    line(c,x+Math.cos(a)*inner,y+Math.sin(a)*inner,x+Math.cos(a)*outer,y+Math.sin(a)*outer,'#F7D799',4);
  }
  for(let i=0;i<11;i++) {
    const h=3+level*(7+12*Math.sin(i*.9+(m.reduced?0:m.elapsed*5))**2);
    line(c,(i-5)*8,124-h/2,(i-5)*8,124+h/2,'rgba(245,177,207,.706)',3);
  }
  c.restore();
}
function fishing(c,m) {
  const q=m.pose;if(q.rod<.01)return;
  c.save();c.globalAlpha=clamp(q.rod,0,1);
  const fish=q.fish,ty=-36-40*fish,bx=168+(m.reduced?0:Math.sin(m.elapsed*3)*3),by=113-106*fish;
  path(c,`M${q.rx-5} ${q.ry-3} Q150 ${-65-50*fish} 175 ${ty}`,null,'#F7E5DC',4);
  path(c,`M175 ${ty} Q195 ${by-22} ${bx} ${by}`,null,'#CBBEE6',1.4);
  if(fish<.1) {
    ellipse(c,bx,by,4,6,'#F5ACBD');
    for(let i=0;i<2;i++) {
      const r=8+(((m.reduced?0:m.elapsed)*.6+i*.5)%1)*15;
      ellipse(c,bx,by+3,r,r*.18,null,`rgba(179,204,234,${(65-i*18)/255})`);
    }
  } else {
    c.translate(bx,by+11);c.rotate(rad(m.reduced?0:Math.sin(m.elapsed*9)*12));c.scale(.65+.35*fish,.65+.35*fish);
    path(c,'M0 17 L-11 31 Q0 26 11 31 Z','#80D7E5','#D8FBFA',1.8);
    ellipse(c,0,3,13,18,'#80D7E5','#D8FBFA',1.8);
    c.beginPath();c.ellipse(-2,3,5,10,0,rad(70),rad(-75),true);c.strokeStyle='#E2FFFF';c.lineWidth=1.3;c.stroke();
    ellipse(c,5,-5,2,2,'#172637');
  }
  c.restore();
}
function personality(c,m) {
  const q=m.pose,t=m.reduced?0:m.gestureTime;
  if(q.heart>.01) for(let i=0;i<3;i++) {
    const progress=m.reduced?.4+i*.16:clamp((t-.65-i*.28)/2.2,0,1),opacity=q.heart*(1-progress);
    if(progress<=0||opacity<.02)continue;
    c.save();c.globalAlpha=opacity;c.translate(62+progress*106+i*9,34-progress*106-i*9);
    c.rotate(rad(progress*15-7));c.scale(.65+progress*.6,.65+progress*.6);
    path(c,'M0 16 C-31 -3 -12 -23 0 -9 C12 -23 31 -3 0 16','#EC9CBD','#FFD8E4',1.2);c.restore();
  }
  if(q.notes>.01) {
    c.save();c.globalAlpha=q.notes;
    [-1,1].forEach((side,i)=>{
      const x=side*169,y=-51+Math.sin(t*3+i)*12;
      line(c,x,y,x,y-26,'#B7B5EF',3.5);line(c,x,y-26,x+13,y-30,'#B7B5EF',3.5);
      ellipse(c,x-5,y,7,5,'#E2B9DC');star(c,x-side*12,y-51,4,'#F6D995',t*20);
    });c.restore();
  }
  if(q.bulb>.01) {
    c.save();c.globalAlpha=q.bulb;c.translate(-12,-127-(1-q.bulb)*20);
    light(c,0,0,47,'rgba(255,220,134,.235)');
    path(c,'M-8 20 C-7 12 -21 6 -18 -8 C-15 -29 16 -29 19 -8 C23 6 9 12 9 20 Z','#FFE0A0','#FFF1C5',2);
    line(c,-6,25,7,25,'#9F85BC',3);line(c,-4,30,5,30,'#9F85BC',3);
    line(c,-5,2,0,10,'#C18F5D',1.6);line(c,5,2,0,10,'#C18F5D',1.6);
    for(let i=0;i<5;i++) {
      const a=-Math.PI+i*Math.PI/4;
      line(c,Math.cos(a)*29,Math.sin(a)*29-5,Math.cos(a)*37,Math.sin(a)*37-5,'#FCE5AD',2.5);
    }c.restore();
  }
  if(q.sleep>.01) {
    c.save();
    for(let i=0;i<3;i++) {
      const phase=m.reduced?i*.25:(t*.35+i*.33)%1,size=7+phase*8,x=92+phase*42,y=-59-phase*60;
      c.globalAlpha=q.sleep*(1-phase);
      path(c,`M${x} ${y} h${size} l${-size} ${size} h${size}`,null,'#CABDEB',2);
    }c.restore();
  }
}
export function stageScale(w,h) { return Math.max(.35,Math.min(w/600,h/420,1.12)); }
export function drawDai(c,m,w,h) {
  c.clearRect(0,0,w,h);c.save();c.lineCap='round';c.lineJoin='round';
  const scale=stageScale(w,h),q=m.pose;
  c.translate(w/2+m.offset.x*scale,h/2+7+m.offset.y*scale);c.scale(scale,scale);
  const g=c.createRadialGradient(0,5,0,0,5,210);
  g.addColorStop(0,'rgba(171,99,155,.071)');g.addColorStop(.65,'rgba(127,95,170,.020)');g.addColorStop(1,'transparent');
  ellipse(c,0,5,220,170,g);
  c.save();c.translate(0,q.bob);c.rotate(rad(q.tilt));c.scale(q.sx,q.sy);
  hat(c,m);wand(c,m);fishing(c,m);
  hand(c,q.lx,q.ly,q.lr,q.la,true,q.wand>.3);hand(c,q.rx,q.ry,q.rr,q.ra,false,q.rod>.3);
  listen(c,m);personality(c,m);
  eye(c,m,-49,q.left,q.lw,q.happy,-2);eye(c,m,49,q.right,q.rw,q.happy,2);
  const alpha=clamp(Math.abs(q.tilt)/10+q.brow*.5,.08,.72)*160/255;
  for(const [x,dy] of [[-49,3],[49,-3]]) path(c,`M${x-13} ${-73+dy} Q${x} ${-79+dy} ${x+13} ${-73+dy}`,null,`rgba(222,193,238,${alpha})`,2.8);
  ellipse(c,-82,40,13,5,`rgba(247,142,183,${78*q.cheek/255})`);
  ellipse(c,82,40,13,5,`rgba(247,142,183,${78*q.cheek/255})`);
  if(q.mouth>.095) {
    const mw=25+q.smile*7,mh=7+q.mouth*25;
    const shape=path(c,`M${-mw/2} 52 Q0 56 ${mw/2} 52 C${mw*.55} ${55+mh} ${-mw*.55} ${55+mh} ${-mw/2} 52`,'#FFE7EA');
    c.save();c.clip(shape);ellipse(c,2,54+mh,mw*.42,mh*.30,'#E798B4');c.restore();
  } else path(c,`M-20 55 C-8 ${55+q.smile*22} 8 ${55+q.smile*22} 20 55`,null,'#FFDAE5',3.5);
  if(m.state==='thinking'&&!['search','found'].includes(m.gesture)) for(let i=0;i<3;i++) {
    const a=m.reduced?110:90+100*(.5+.5*Math.sin(m.elapsed*4-i));
    ellipse(c,(i-1)*12,118,3,3,`rgba(214,191,239,${a/255})`);
  }
  c.restore();
  const colors=['#F7C4D5','#FFE2A1','#BAAEF3'];
  for(const [x,y,,,age,life,kind] of m.particles) {
    c.globalAlpha=clamp(1-age/life,0,1);star(c,x,y,3.5*(1-age/life)+1,colors[kind],age*100);
  }
  c.restore();
}
