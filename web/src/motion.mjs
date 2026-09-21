import { product } from './product.mjs';
// Ported from the 2026-09-20 DaiFace reference. Units: seconds and desktop stage pixels.
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const back = (t, o = 1.2) => { t = clamp(t, 0, 1) - 1; return 1 + t * t * ((o + 1) * t + o); };
export const expressions = {
  idle: [.94,.94,1,1,.25,0,0,0], thinking: [.70,.86,1,1,.08,0,-5,.08],
  talking: [.94,.94,1,1,.36,.12,0,.12], happy: [.66,.66,1.1,1.1,.95,.18,-3,.7],
  curious: [1.12,.78,1,1,.24,0,6,.12], surprised: [1.2,1.2,.94,.94,.05,.72,-3,.2],
  confused: [.65,1,1,1,-.18,0,-7,0], sleepy: [.28,.32,1,1,.22,0,-5,.1]
};
export const gestures = [...new Set([
  ...product.animations.map(name => name.replace(/^dai_/, '').replace('idle_soft', 'idle')),
  'typing',
  'reply'
])];
const moods = {typing:'thinking',reply:'idle',listen:'curious',search:'thinking',found:'happy',talk:'talking',happy:'happy',fishing:'curious',heart:'happy',dance:'happy',idea:'surprised',sleep:'sleepy'};
export class DaiMotion {
  constructor(random = Math.random) {
    this.random = random;
    this.state = this.gesture = 'idle';
    this.elapsed = this.gestureTime = 0;
    this.reduced = false;
    this.voiceDriven = false;
    this.voice = this.voiceTarget = this.audio = this.audioTarget = 0;
    this.nextBlink = 2.5; this.blinkTime = 1;
    this.nextIdle = 3.5; this.idleUntil = 0; this.idleAction = 'look'; this.idleSide = 1;
    this.pointer = {x:0,y:0}; this.mouseInside = this.dragging = false;
    this.offset = {x:0,y:0}; this.offsetTarget = {x:0,y:0};
    this.particles = []; this.caught = false;
    this.pose = this.targets();
  }
  setGesture(name) {
    name = name.replace(/^dai_/, '').replace('idle_soft', 'idle');
    const nextGesture = gestures.includes(name) ? name : 'idle';
    if (this.gesture === nextGesture) return;
    this.gesture = nextGesture;
    this.state = moods[this.gesture] || 'idle';
    this.gestureTime = 0; this.idleUntil = 0; this.caught = false;
    if (['happy','found','idea'].includes(this.gesture)) this.burst(0,-65,this.gesture === 'found' ? 18 : 10);
  }
  burst(x,y,count=14) {
    if (this.reduced) return;
    for(let i=0;i<count;i++) {
      const angle=-Math.PI+this.random()*Math.PI, speed=45+this.random()*70;
      this.particles.push([x,y,Math.cos(angle)*speed,Math.sin(angle)*speed,0,.6+this.random()*.6,i%3]);
    }
    this.particles=this.particles.slice(-40);
  }
  targets() {
    let e=this.gestureTime; const t=this.elapsed;
    const [left,right,lw,rw,smile,mouth,tilt,cheek]=expressions[this.state];
    const p={left,right,lw,rw,smile,mouth,tilt,cheek,happy:this.state==='happy'?1:0,
      gaze_x:0,gaze_y:0,sx:1,sy:1,bob:0,lx:-118,ly:72,rx:118,ry:72,la:0,ra:0,lr:-10,rr:10,
      hat:0,wand:0,listen:0,rod:0,fish:0,brow:0,heart:0,notes:0,bulb:0,sleep:0};
    const set = values => Object.assign(p, values);
    let active=this.gesture;
    if(this.state==='idle' && active==='idle' && this.elapsed<this.idleUntil) {
      const action=this.idleAction;
      if(action==='look') set({gaze_x:this.idleSide*9,gaze_y:-2});
      else if(action==='smile') set({smile:.75,cheek:.35,happy:.7});
      else if(action==='tilt') set({tilt:this.idleSide*7,left:.76,right:1.05});
      else if(action==='sleepy') set({left:.3,right:.35,tilt:-5,smile:.3});
      else { active=action; e=1.7-(this.idleUntil-this.elapsed); }
    }
    if(this.mouseInside&&!this.dragging) set({gaze_x:clamp(this.pointer.x/22,-10,10),gaze_y:clamp(this.pointer.y/32,-5,5)});
    if(!this.reduced) p.bob=Math.sin(t*1.7)*2.2;
    const enter=e<.62?back(e/.62,.8):1;
    if(e<.14 && active!=='idle') set({sx:1.018,sy:.985});
    if(active==='typing') {
      const glance=this.reduced?0:Math.sin(e*2.4);
      set({
        gaze_x:glance*4.2,
        gaze_y:4.5,
        tilt:glance*1.8,
        left:.82,
        right:.88,
        smile:.34,
        mouth:0,
        cheek:.10,
        brow:.25
      });
      if(!this.reduced) p.bob+=Math.sin(e*2.1)*.45;
    } else if(active==='reply') {
      const sway=this.reduced?0:Math.sin(e*2.8);
      set({
        gaze_x:sway*2.8,
        gaze_y:-1.5,
        tilt:sway*1.4,
        left:.92,
        right:.96,
        smile:.62,
        mouth:0,
        cheek:.22,
        ra:.68,
        rx:116+sway*3,
        ry:30-20*enter,
        rr:-8+sway*5,
        brow:.08
      });
      if(!this.reduced) p.bob+=Math.sin(e*2.2)*.7;
    } else if(active==='listen') {
      set({ra:1,rx:111,ry:48-98*enter,rr:-16,tilt:6,left:.42,right:.52,smile:.66,listen:1,cheek:.25,gaze_x:3,happy:.32});
      if(!this.reduced) p.bob+=Math.sin(t*3)*this.audio*2.5;
    } else if(active==='search'||active==='found') {
      const sweep=this.reduced?0:Math.sin(e*2);
      set({la:1,lx:-111-sweep*5,ly:65-39*enter,lr:-24+sweep*8,hat:1,wand:1,tilt:-4+sweep*3,gaze_x:-7+sweep*2,gaze_y:-5,left:.65,right:.78,smile:.14});
      if(active==='found') set({happy:1,smile:1,mouth:.26,cheek:.8,tilt:-3,sy:1.03,bob:-5,gaze_y:-2});
    } else if(active==='talk'||this.state==='talking') {
      let beat=this.voice;
      if(!this.voiceDriven) beat=this.reduced?.3:(.5+.5*Math.sin(e*13))*(.55+.45*Math.sin(e*4.1)**2);
      set({ra:.95,rx:119,ry:57-beat*14,rr:6-beat*12,mouth:.025+beat*.72,smile:.6,cheek:.23});
      if(!this.reduced) { p.tilt+=Math.sin(e*2)*2.5; p.sy+=beat*.018; }
    } else if(active==='happy'||active==='wave') {
      const wave=this.reduced?0:Math.sin(e*9);
      set({ra:1,rx:126+wave*9,ry:54-91*enter,rr:wave*22,smile:.95,cheek:.65,happy:.86,tilt:-5});
      if(active==='happy') {
        set({la:1,lx:-124-wave*4,ly:-22,lr:-wave*18,mouth:.26});
        if(!this.reduced) p.bob-=Math.abs(Math.sin(e*4.5))*7*Math.exp(-e*.35);
      }
    } else if(active==='stretch') {
      set({la:1,ra:1,lx:-143,rx:143,ly:-30,ry:-30,lr:-30,rr:30,left:.26,right:.26,sy:1.05,sx:.96,smile:.7});
    } else if(active==='fishing') {
      set({ra:1,rx:101,ry:55,rr:-25,rod:enter,gaze_x:10,gaze_y:5,tilt:5,smile:.48});
      if(e<1) set({rx:80+21*enter,ry:15+40*enter,tilt:-8+13*enter});
      else if(e<4.2) set({left:.72,right:.90,tilt:3});
      else if(e<4.75) set({left:1.2,right:1.2,mouth:.56,smile:.05,ry:38,tilt:-7});
      else {
        const reveal=back((e-4.75)/.65,.7);
        set({ry:55-55*reveal,fish:clamp(reveal,0,1),happy:1,smile:1,mouth:.38,cheek:.8,gaze_y:-3,tilt:-4});
      }
    } else if(active==='heart') {
      const release=ease((e-.65)/.6);
      set({ra:1,rx:52+65*release,ry:65-22*release,rr:-25+40*release,smile:.85,cheek:.85,happy:.8*release,mouth:.25*(1-release),heart:release,tilt:-6});
    } else if(active==='dance') {
      const beat=this.reduced?0:Math.sin(e*7);
      set({la:1,ra:1,lx:-121,rx:121,ly:20+beat*35,ry:20-beat*35,lr:-20+beat*22,rr:20+beat*22,happy:.85,smile:1,mouth:.28,cheek:.5,tilt:beat*9,bob:-Math.abs(beat)*9,notes:1,sx:1+Math.abs(beat)*.025,sy:1-Math.abs(beat)*.02});
    } else if(active==='idea') {
      set({left:1.13,right:1.13,smile:.85,mouth:.3,gaze_x:-4,gaze_y:-7,tilt:-6,ra:1,rx:113,ry:-25,rr:-20,bulb:clamp(back((e-.2)/.65,.6),0,1),cheek:.5});
    } else if(active==='sleep') {
      const yawn=Math.sin(clamp(e/1.7,0,1)*Math.PI);
      set({left:.10,right:.10,mouth:.72*yawn,smile:.2,tilt:-9,gaze_y:3,sleep:clamp((e-1.2)/.7,0,1),ra:1-clamp((e-1)/.8,0,1),rx:33,ry:69,rr:-35,bob:1});
    } else if(this.state==='thinking') set({gaze_x:-7,gaze_y:-6,tilt:-5,brow:1});
    if(this.dragging) set({sx:1.055,sy:.94,left:1.1,right:1.1,mouth:.35,tilt:clamp(this.offsetTarget.x*.07,-8,8)});
    if(this.reduced) set({bob:0,sx:1,sy:1});
    return p;
  }
  advance(elapsedDt) {
    elapsedDt=Math.max(0,elapsedDt); const dt=Math.min(elapsedDt,.05);
    this.elapsed+=elapsedDt; this.gestureTime+=elapsedDt;
    if(this.elapsed>this.nextBlink&&!this.reduced) {
      this.blinkTime=0; this.nextBlink=this.elapsed+2.6+this.random()*2.9;
    }
    this.blinkTime+=elapsedDt;
    if(this.elapsed>this.nextIdle&&this.state==='idle'&&this.gesture==='idle'&&!this.dragging&&!this.reduced) {
      const v=this.random()*100;
      this.idleAction=v<35?'look':v<58?'smile':v<78?'tilt':v<87?'wave':v<95?'stretch':'sleepy';
      this.idleSide=this.random()<.5?-1:1;
      this.idleUntil=this.elapsed+1.7; this.nextIdle=this.elapsed+5+this.random()*3;
    }
    if(this.gesture==='fishing'&&this.gestureTime>4.8&&!this.caught) { this.caught=true; this.burst(142,24,18); }
    const mix=(a,b,r)=>a+(b-a)*(1-Math.exp(-r*dt));
    this.voice=mix(this.voice,this.voiceTarget,18); this.audio=mix(this.audio,this.audioTarget,12);
    this.audioTarget*=Math.exp(-dt*1.7);
    const target=this.targets();
    for(const key of Object.keys(this.pose)) this.pose[key]=mix(this.pose[key],target[key],this.reduced?22:['mouth','left','right','gaze_x','gaze_y'].includes(key)?10:6.2);
    for(const axis of ['x','y']) {
      if(!this.dragging) this.offsetTarget[axis]*=Math.exp(-dt*2.3);
      this.offset[axis]=mix(this.offset[axis],this.offsetTarget[axis],9);
    }
    for(const v of this.particles) { v[0]+=v[2]*dt; v[1]+=v[3]*dt; v[3]+=80*dt; v[4]+=dt; }
    this.particles=this.particles.filter(v=>v[4]<v[5]);
  }
}
