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
  ...product.animationCatalog.map(item => item.gesture.replace('idle_soft','idle')),
  'typing',
  'reply',
  'curious',
  'voicewait'
])];
const moods = {
  ...Object.fromEntries(product.animationCatalog.map(item => [item.gesture.replace('idle_soft','idle'),item.state])),
  typing:'thinking',
  reply:'idle',
  curious:'curious',
  voicewait:'idle'
};
export class DaiMotion {
  constructor(random = Math.random) {
    this.random = random;
    this.state = this.gesture = 'idle';
    this.elapsed = this.gestureTime = 0;
    this.reduced = false;
    this.voiceDriven = false;
    this.voice = this.voiceTarget = this.audio = this.audioTarget = 0;
    this.speechMood = 'neutral';
    this.nextBlink = 2.5; this.blinkTime = 1;
    this.nextIdle = 3.5; this.idleUntil = 0; this.idleAction = 'look'; this.idleSide = 1;
    this.pointer = {x:0,y:0}; this.mouseInside = this.dragging = false;
    this.offset = {x:0,y:0}; this.offsetTarget = {x:0,y:0};
    this.particles = []; this.caught = false; this.audioEvents = [];
    this.pose = this.targets();
  }
  setGesture(name) {
    name = name.replace(/^dai_/, '').replace('idle_soft', 'idle');
    const nextGesture = gestures.includes(name) ? name : 'idle';
    if (this.gesture === nextGesture) return;
    this.gesture = nextGesture;
    this.state = moods[this.gesture] || 'idle';
    this.gestureTime = 0; this.idleUntil = 0; this.caught = false; this.audioEvents = [];
    if (['happy','found','idea','celebrate','wow','response_ready','success','wake_up','bounce','double_wave','welcome_back'].includes(this.gesture)) {
      this.burst(0,-65,['found','celebrate','success'].includes(this.gesture)?18:10);
    }
  }
  setVoiceLevel(level=0, active=true) {
    const value=clamp(Number(level)||0,0,1);
    this.voiceDriven=Boolean(active);
    this.voiceTarget=active?value:0;
    if(!active)this.voice=0;
  }
  setSpeechMood(mood='neutral') {
    const allowed=new Set(['neutral','warm','happy','curious','calm','serious']);
    this.speechMood=allowed.has(mood)?mood:'neutral';
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
      mouthWide:0,hat:0,wand:0,listen:0,rod:0,fish:0,brow:0,heart:0,notes:0,bulb:0,sleep:0};
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
      if(!this.voiceDriven) {
        beat=this.reduced?.18:(.16+.28*(.5+.5*Math.sin(e*7.4)))*(.78+.22*Math.sin(e*2.0)**2);
      }
      beat=clamp(beat,0,1);

      // Gate tiny room/noise energy so the mouth actually closes between words.
      const speechOpen=beat<.035?0:Math.pow(clamp((beat-.035)/.72,0,1),.68);
      const mouthWide=speechOpen*(.62-.26*speechOpen);
      const phrase=this.reduced?0:Math.sin(e*.82);
      const micro=this.reduced?0:Math.sin(e*1.55+.7);

      let speechSmile=.44;
      let speechCheek=.12;
      let speechLeft=.94;
      let speechRight=.96;
      let speechTilt=phrase*.55;

      if(this.speechMood==='warm') {
        speechSmile=.64; speechCheek=.24; speechLeft=.88; speechRight=.91; speechTilt=-1.2+phrase*.45;
      } else if(this.speechMood==='happy') {
        speechSmile=.80; speechCheek=.42; speechLeft=.80; speechRight=.83; speechTilt=-1.7+phrase*.55;
      } else if(this.speechMood==='curious') {
        speechSmile=.38; speechCheek=.10; speechLeft=1.02; speechRight=.80; speechTilt=3.2+phrase*.65;
      } else if(this.speechMood==='calm') {
        speechSmile=.40; speechCheek=.10; speechLeft=.86; speechRight=.88; speechTilt=-.7+phrase*.30;
      } else if(this.speechMood==='serious') {
        speechSmile=.18; speechCheek=.04; speechLeft=.90; speechRight=.92; speechTilt=phrase*.22;
      }

      set({
        left:speechLeft,
        right:speechRight,
        smile:speechSmile,
        cheek:speechCheek,
        mouth:speechOpen*.78,
        mouthWide,
        tilt:speechTilt,
        gaze_x:phrase*.72,
        gaze_y:-.8+micro*.18,

        // Speaking is face-led. Keep both hands completely at rest/invisible.
        la:0,
        ra:0,
        lx:-118,
        ly:72,
        rx:118,
        ry:72,
        lr:-10,
        rr:10
      });

      if(!this.reduced) {
        p.bob+=micro*.16+speechOpen*.14;
        p.sy+=speechOpen*.0025;
      }
    } else if(active==='happy'||active==='wave') {
      const wave=this.reduced?0:Math.sin(e*9);
      set({ra:1,rx:126+wave*9,ry:54-91*enter,rr:wave*22,smile:.95,cheek:.65,happy:.86,tilt:-5});
      if(active==='happy') {
        set({la:1,lx:-124-wave*4,ly:-22,lr:-wave*18,mouth:.26});
        if(!this.reduced) p.bob-=Math.abs(Math.sin(e*4.5))*7*Math.exp(-e*.35);
      }
    } else if(active==='stretch') {
      set({la:1,ra:1,lx:-143,rx:143,ly:-30,ry:-30,lr:-30,rr:30,left:.26,right:.26,sy:1.05,sx:.96,smile:.7});
    } else if(active==='curious') {
      const peek=this.reduced?0:Math.sin(e*2.2);
      set({
        left:1.08,
        right:.72,
        tilt:8+peek*2.5,
        gaze_x:7+peek*2,
        gaze_y:-3,
        smile:.48,
        cheek:.18,
        ra:1,
        rx:92+peek*4,
        ry:38,
        rr:-28,
        brow:.18
      });
      if(!this.reduced)p.bob+=Math.sin(e*2.7)*1.1;
    } else if(active==='celebrate') {
      const beat=this.reduced?0:Math.sin(e*7.5);
      set({
        la:1,ra:1,
        lx:-132,rx:132,
        ly:-38+beat*9,ry:-38-beat*9,
        lr:-26+beat*11,rr:26+beat*11,
        left:.58,right:.58,
        smile:1,mouth:.36,cheek:.82,happy:1,
        tilt:beat*5,
        notes:1
      });
      if(!this.reduced){
        p.bob-=Math.abs(Math.sin(e*4.2))*10;
        p.sx=1+Math.abs(beat)*.025;
        p.sy=1-Math.abs(beat)*.018;
      }
    } else if(active==='focus') {
      const micro=this.reduced?0:Math.sin(e*1.8);
      set({
        left:.78,right:.78,
        gaze_x:-2+micro*1.4,
        gaze_y:-6,
        tilt:-3+micro,
        smile:.18,
        mouth:0,
        brow:1,
        cheek:.05
      });
      if(!this.reduced)p.bob+=Math.sin(e*1.4)*.35;
    } else if(active==='voicewait') {
      set({
        left:.92,
        right:.92,
        gaze_x:0,
        gaze_y:-2,
        tilt:0,
        smile:.24,
        mouth:0,
        cheek:.04,
        brow:.18,
        la:0,
        ra:0,
        bob:0,
        sx:1,
        sy:1
      });
    } else if(active==='error') {
      const shake=this.reduced?0:Math.sin(e*15)*Math.exp(-e*.45);
      set({
        left:.55,right:.92,
        gaze_x:shake*4,
        gaze_y:2,
        tilt:-7+shake*5,
        smile:-.16,
        mouth:.12,
        brow:.9,
        cheek:.04,
        ra:1,
        rx:103,
        ry:58,
        rr:-18+shake*8
      });
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
    } else if(active==='blush') {
      const pulse=this.reduced?0:Math.sin(e*4.2)*.08;
      set({left:.58,right:.58,smile:.78,cheek:1,happy:.86,la:.72,ra:.72,lx:-86,rx:86,ly:22,ry:22,lr:-38,rr:38,tilt:-4,sx:1+pulse,sy:1-pulse*.5});
    } else if(active==='wow') {
      const settle=e<.55?back(e/.55,.7):1;
      set({left:1.28,right:1.28,lw:.94,rw:.94,mouth:.82,smile:.02,cheek:.18,gaze_y:-4,tilt:-5,sx:.96+.04*settle,sy:1.06-.06*settle});
    } else if(active==='approve') {
      const nod=this.reduced?0:Math.sin(Math.min(e,1.8)*5.2)*Math.exp(-e*.9);
      set({ra:1,rx:126,ry:-28,rr:12,smile:.92,cheek:.55,happy:.82,mouth:.12,tilt:nod*7,gaze_x:4});
    } else if(active==='relax') {
      const sway=this.reduced?0:Math.sin(e*1.35);
      set({left:.36,right:.40,smile:.62,cheek:.22,happy:.35,tilt:-6+sway*2.5,bob:3+sway*1.2,la:.45,ra:.45,lx:-118,rx:118,ly:82,ry:82});
    } else if(active==='working') {
      const scan=this.reduced?0:Math.sin(e*2.4);
      set({left:.72,right:.78,smile:.18,brow:.75,gaze_x:scan*7,gaze_y:-5,tilt:scan*2,la:.62,ra:.62,lx:-100-scan*4,rx:100+scan*4,ly:56,ry:56});
    } else if(active==='response_ready') {
      const pop=e<.55?back(e/.55,.9):1;
      set({left:.78,right:.78,smile:1,cheek:.72,happy:1,mouth:.18,tilt:-4,bob:-5*pop,sx:.96+.04*pop,sy:.96+.04*pop,ra:1,rx:126,ry:-16,rr:18});
    } else if(active==='peek') {
      const side=Math.sin(e*2)<0?-1:1;
      set({left:1.08,right:.74,smile:.46,cheek:.18,gaze_x:side*9,gaze_y:-2,tilt:side*7,sx:.99,sy:1.01});
    } else if(active==='nod_yes') {
      const nod=this.reduced?0:Math.sin(e*7)*Math.exp(-e*.45);
      set({smile:.82,cheek:.38,happy:.72,tilt:nod*8,mouth:.10,gaze_y:2*nod});
    } else if(active==='shake_no') {
      const shake=this.reduced?0:Math.sin(e*8.2)*Math.exp(-e*.38);
      set({left:.72,right:.86,smile:-.10,brow:.75,gaze_x:shake*5,tilt:shake*9,mouth:.06});
    } else if(active==='shy') {
      const sway=this.reduced?0:Math.sin(e*2.3);
      set({left:.46,right:.50,smile:.72,cheek:1,happy:.78,la:.62,ra:.62,lx:-72,rx:72,ly:25,ry:25,lr:-42,rr:42,tilt:-5+sway*3,gaze_y:4});
    } else if(active==='alert') {
      const pop=e<.45?back(e/.45,.8):1;
      set({left:1.30,right:1.30,mouth:.55,smile:.02,gaze_y:-5,tilt:-3,sx:.95+.05*pop,sy:1.08-.08*pop});
    } else if(active==='look_around') {
      const scan=this.reduced?0:Math.sin(e*2.1);
      set({gaze_x:scan*10,gaze_y:-2+Math.cos(e*1.5)*2,tilt:scan*5,left:.94+.08*scan,right:.94-.08*scan,smile:.32});
    } else if(active==='recharge') {
      const breathe=this.reduced?0:Math.sin(e*1.5);
      set({left:.18,right:.20,smile:.30,cheek:.12,tilt:-7,bob:2+breathe*1.5,sx:1-breathe*.008,sy:1+breathe*.012,sleep:.45});
    } else if(active==='success') {
      const pop=e<.5?back(e/.5,.9):1;
      set({ra:1,rx:128,ry:-30,rr:12,smile:1,mouth:.20,cheek:.70,happy:1,bob:-5*pop,tilt:-4,sx:.97+.03*pop,sy:.97+.03*pop});
    } else if(active==='music_groove') {
      const beat=this.reduced?0:Math.sin(e*6.2);
      set({la:.82,ra:.82,lx:-119,rx:119,ly:34+beat*22,ry:34-beat*22,lr:-15+beat*16,rr:15+beat*16,smile:.92,mouth:.22,cheek:.45,happy:.82,tilt:beat*7,bob:-Math.abs(beat)*4,notes:.85});
    } else if(active==='wake_up') {
      const pop=e<.7?back(e/.7,.8):1;
      set({left:.18+pop,right:.18+pop,smile:.52*pop,mouth:.35*(1-pop),gaze_y:-4*pop,tilt:-8+8*pop,sy:.94+.06*pop,sx:1.05-.05*pop});
    } else if(active==='roam_walk') {
      const step=this.reduced?0:Math.sin(e*6);
      set({left:.86,right:.92,smile:.48,cheek:.15,la:.72,ra:.72,lx:-118+step*7,rx:118+step*7,ly:58-step*9,ry:58+step*9,lr:-12+step*10,rr:12+step*10,tilt:step*3.5,bob:-Math.abs(step)*5,sx:1+Math.abs(step)*.012,sy:1-Math.abs(step)*.01});
    } else if(active==='bounce') {
      const jump=this.reduced?0:Math.abs(Math.sin(Math.min(e,1.7)*5.4))*Math.exp(-e*.38);
      set({happy:.95,smile:1,cheek:.72,mouth:.22,bob:-jump*16,la:1,ra:1,lx:-128,rx:128,ly:-18-jump*8,ry:-18-jump*8,lr:-18,rr:18,sx:1+jump*.035,sy:1-jump*.025});
    } else if(active==='bow') {
      const bend=Math.sin(clamp(e/1.8,0,1)*Math.PI);
      set({left:.62,right:.62,smile:.9,cheek:.4,tilt:10*bend,gaze_y:5*bend,sy:1-.05*bend,sx:1+.025*bend,la:.55,ra:.55,lx:-104,rx:104,ly:70,ry:70});
    } else if(active==='double_wave') {
      const wave=this.reduced?0:Math.sin(e*9.5);
      set({la:1,ra:1,lx:-130-wave*8,rx:130+wave*8,ly:-28,ry:-28,lr:-wave*24,rr:wave*24,smile:1,cheek:.68,happy:.92,mouth:.22,tilt:wave*3});
    } else if(active==='side_stretch') {
      const sway=this.reduced?0:Math.sin(clamp(e/2.4,0,1)*Math.PI);
      const side=Math.sin(e*.9)>=0?1:-1;
      set({la:1,ra:.65,lx:-146,ly:-34,lr:-34,rx:112,ry:64,rr:20,left:.42,right:.48,smile:.7,tilt:side*9*sway,sx:1-.025*sway,sy:1+.045*sway});
    } else if(active==='startled') {
      const shock=Math.exp(-e*2.2)*(this.reduced?0:Math.cos(e*13));
      set({left:1.25,right:1.25,mouth:.66,smile:.02,tilt:shock*8,bob:-Math.abs(shock)*7,sx:.98,sy:1.04,la:.65,ra:.65,lx:-112,rx:112,ly:42,ry:42});
    } else if(active==='scout') {
      const scan=this.reduced?0:Math.sin(e*1.6);
      set({ra:.85,rx:58,ry:-85,rr:-16,gaze_x:scan*10,gaze_y:-4,tilt:scan*4,left:1.10,right:.84,smile:.48});
    } else if(active==='window_peek') {
      const lean=Math.sin(clamp(e/3.2,0,1)*Math.PI);
      const side=this.pointer.x<0?-1:1;
      set({tilt:side*11*lean,gaze_x:side*10,left:1.16,right:.82,smile:.6,la:.6,ra:.6,lx:-101,rx:101,ly:48-lean*10,ry:48-lean*10,sy:1+lean*.025});
    } else if(active==='tip_toe') {
      const lift=Math.sin(clamp(e/2.8,0,1)*Math.PI);
      set({bob:-9*lift,sy:1+.045*lift,sx:1-.02*lift,la:.75,ra:.75,lx:-138,rx:138,ly:45,ry:45,gaze_y:-5,smile:.42,left:1.08,right:1.08});
    } else if(active==='thought_orbit') {
      const orbit=this.reduced?0:e*2.1;
      set({gaze_x:Math.cos(orbit)*8,gaze_y:Math.sin(orbit)*4,tilt:Math.sin(orbit)*4,ra:.85,rx:42,ry:83,rr:-32,brow:.5,bulb:.4+.3*Math.sin(orbit),smile:.35});
    } else if(active==='cozy_sway') {
      const sway=this.reduced?0:Math.sin(e*1.4);
      set({left:.26,right:.30,smile:.48,cheek:.28,tilt:sway*5,bob:2,la:.45,ra:.45,lx:-81,rx:81,ly:83,ry:83,sleep:.25});
    } else if(active==='welcome_back') {
      const greet=this.reduced?0:Math.sin(e*6)*Math.exp(-e*.55);
      set({ra:1,rx:128,ry:-38,rr:20+greet*24,la:.55,lx:-130,ly:42,smile:1,cheek:.75,happy:.9,tilt:greet*4,mouth:.16});
    } else if(active==='giggle') {
      const beat=this.reduced?0:Math.sin(e*9)*Math.exp(-e*.18);
      set({left:.48,right:.48,smile:1,mouth:.16,cheek:.95,happy:.9,tilt:-3+beat*2,bob:-Math.abs(beat)*3,la:.45,ra:.45,lx:-76,rx:76,ly:38,ry:38});
    } else if(active==='laugh') {
      const beat=this.reduced?0:Math.sin(e*7.5);
      set({left:.30,right:.30,smile:1,mouth:.48,cheek:1,happy:1,tilt:beat*3,bob:-Math.abs(beat)*6,la:.7,ra:.7,lx:-112,rx:112,ly:18,ry:18});
    } else if(active==='proud') {
      const swell=this.reduced?0:Math.sin(e*1.6)*.02;
      set({left:.74,right:.74,smile:.86,mouth:.08,cheek:.5,happy:.78,tilt:-7,bob:-2,la:.55,ra:.55,lx:-102,rx:102,ly:75,ry:75,sx:1+swell,sy:1-swell});
    } else if(active==='excited') {
      const beat=this.reduced?0:Math.sin(e*10);
      set({left:1.1,right:1.1,smile:1,mouth:.32,cheek:.8,happy:1,la:1,ra:1,lx:-132,rx:132,ly:-18+beat*8,ry:-18-beat*8,tilt:beat*3,bob:-Math.abs(beat)*7});
    } else if(active==='confused') {
      const sway=this.reduced?0:Math.sin(e*2.2);
      set({left:.62,right:1.02,smile:-.12,mouth:.10,brow:.95,gaze_x:4+sway*2,tilt:-8+sway*3,ra:.6,rx:90,ry:54,rr:-26});
    } else if(active==='thinking_deep') {
      const drift=this.reduced?0:Math.sin(e*1.2);
      set({left:.5,right:.56,smile:.06,mouth:0,brow:1,gaze_x:-8+drift*2,gaze_y:-7,tilt:-6+drift,ra:.7,rx:50,ry:78,rr:-34,bulb:.12});
    } else if(active==='question') {
      const bob=this.reduced?0:Math.sin(e*2.6);
      set({left:1.1,right:.82,smile:.26,mouth:.12,brow:.65,gaze_x:6,gaze_y:-3,tilt:8+bob*2,ra:.7,rx:86,ry:42,rr:-28});
    } else if(active==='surprise_soft') {
      const pop=e<.45?back(e/.45,.6):1;
      set({left:1.16,right:1.16,smile:.18,mouth:.34,cheek:.2,gaze_y:-3,tilt:-2,sx:.97+.03*pop,sy:1.04-.04*pop});
    } else if(active==='cheer') {
      const beat=this.reduced?0:Math.sin(e*8);
      set({left:.72,right:.72,smile:1,mouth:.24,cheek:.72,happy:1,ra:1,rx:132,ry:-28+beat*6,rr:18+beat*10,la:.8,lx:-118,ly:5,bob:-Math.abs(beat)*5});
    } else if(active==='clap') {
      const beat=this.reduced?0:(.5+.5*Math.sin(e*10));
      set({left:.68,right:.68,smile:1,mouth:.18,cheek:.68,happy:.9,la:1,ra:1,lx:-22-beat*24,rx:22+beat*24,ly:10,ry:10,lr:-12,rr:12,bob:-beat*2});
    } else if(active==='salute') {
      const enterSalute=e<.5?back(e/.5,.5):1;
      set({left:.82,right:.82,smile:.72,cheek:.34,happy:.6,ra:1,rx:86,ry:-56*enterSalute,rr:-18,tilt:-3,gaze_x:3});
    } else if(active==='hello_shy') {
      const wave=this.reduced?0:Math.sin(e*8)*Math.exp(-e*.22);
      set({left:.52,right:.56,smile:.78,cheek:1,happy:.72,tilt:-6,ra:1,rx:112,ry:-18,rr:wave*18,la:.4,lx:-72,ly:42});
    } else if(active==='goodbye') {
      const wave=this.reduced?0:Math.sin(e*8.8);
      set({left:.7,right:.7,smile:.88,cheek:.5,happy:.8,ra:1,rx:132,ry:-34,rr:wave*26,tilt:4});
    } else if(active==='yawn') {
      const y=Math.sin(clamp(e/2.0,0,1)*Math.PI);
      set({left:.18,right:.2,smile:.12,mouth:.82*y,tilt:-8,gaze_y:4,ra:.65,rx:44,ry:60,rr:-34,sleep:.35});
    } else if(active==='dream') {
      const sway=this.reduced?0:Math.sin(e*1.2);
      set({left:.12,right:.14,smile:.42,mouth:.02,cheek:.24,tilt:-7+sway*2,bob:2,la:.35,ra:.35,lx:-72,rx:72,ly:84,ry:84,sleep:.75,heart:.12});
    } else if(active==='meditate') {
      const breathe=this.reduced?0:Math.sin(e*1.3);
      set({left:.16,right:.16,smile:.38,mouth:0,cheek:.18,tilt:0,bob:1+breathe*.6,la:.55,ra:.55,lx:-68,rx:68,ly:88,ry:88,sx:1-breathe*.006,sy:1+breathe*.01});
    } else if(active==='breathe') {
      const breathe=this.reduced?0:Math.sin(e*1.45);
      set({left:.42,right:.42,smile:.5,mouth:0,cheek:.2,tilt:-2,bob:2+breathe,la:.42,ra:.42,lx:-100,rx:100,ly:76,ry:76,sx:1-breathe*.008,sy:1+breathe*.014});
    } else if(active==='read') {
      const scan=this.reduced?0:Math.sin(e*2.2);
      set({left:.64,right:.7,smile:.2,mouth:0,brow:.45,gaze_x:scan*5,gaze_y:6,tilt:-4,la:.72,ra:.72,lx:-84,rx:84,ly:62,ry:62});
    } else if(active==='write') {
      const beat=this.reduced?0:Math.sin(e*7);
      set({left:.72,right:.76,smile:.24,gaze_x:3,gaze_y:6,tilt:-5,ra:.9,rx:82+beat*8,ry:58,rr:-20+beat*6,la:.45,lx:-92,ly:72});
    } else if(active==='type_fast') {
      const beat=this.reduced?0:Math.sin(e*12);
      set({left:.78,right:.82,smile:.3,gaze_y:6,tilt:beat*1.2,la:.9,ra:.9,lx:-78+beat*7,rx:78-beat*7,ly:68,ry:68,lr:-8,rr:8});
    } else if(active==='code_focus') {
      const scan=this.reduced?0:Math.sin(e*3);
      set({left:.56,right:.62,smile:.08,brow:1,gaze_x:scan*6,gaze_y:4,tilt:-4,la:.68,ra:.68,lx:-86,rx:86,ly:64,ry:64,bulb:.08});
    } else if(active==='brainstorm') {
      const orbit=this.reduced?0:e*2.6;
      set({left:.92,right:.92,smile:.46,mouth:.08,cheek:.26,gaze_x:Math.cos(orbit)*7,gaze_y:-4+Math.sin(orbit)*3,tilt:Math.sin(orbit)*3,bulb:.55+.25*Math.sin(orbit),ra:.65,rx:54,ry:72,rr:-28});
    } else if(active==='lightbulb_pop') {
      const pop=clamp(back((e-.1)/.5,.9),0,1);
      set({left:1.18,right:1.18,smile:.9,mouth:.26,cheek:.55,happy:.82,gaze_y:-6,tilt:-5,bulb:pop,ra:1,rx:110,ry:-18,rr:-18,bob:-4*pop});
    } else if(active==='scan') {
      const sweep=this.reduced?0:Math.sin(e*2.8);
      set({left:1.02,right:.92,smile:.22,gaze_x:sweep*10,gaze_y:-1,tilt:sweep*4,brow:.35,ra:.55,rx:92,ry:52,rr:-18});
    } else if(active==='detect') {
      const pop=e<.45?back(e/.45,.5):1;
      set({left:1.2,right:.96,smile:.54,mouth:.12,cheek:.26,gaze_x:7,gaze_y:-4,tilt:7,ra:1,rx:82,ry:-24*pop,rr:-28,bulb:.35*pop});
    } else if(active==='loading') {
      const orbit=this.reduced?0:e*3;
      set({left:.7,right:.7,smile:.12,brow:.75,gaze_x:Math.cos(orbit)*6,gaze_y:Math.sin(orbit)*3,tilt:Math.sin(orbit)*2,bulb:.25+.15*Math.cos(orbit)});
    } else if(active==='wait_patient') {
      const sway=this.reduced?0:Math.sin(e*1.1);
      set({left:.72,right:.72,smile:.46,cheek:.18,tilt:sway*2,bob:1.5,la:.4,ra:.4,lx:-92,rx:92,ly:78,ry:78});
    } else if(active==='impatient') {
      const tap=this.reduced?0:Math.sin(e*9);
      set({left:.62,right:.68,smile:-.08,brow:.9,gaze_x:5,tilt:-4+tap*2,ra:.7,rx:104,ry:68+tap*7,rr:-8,bob:-Math.abs(tap)*1.5});
    } else if(active==='sneak') {
      const step=this.reduced?0:Math.sin(e*5.5);
      set({left:.88,right:.74,smile:.34,gaze_x:8,tilt:6+step*2,la:.72,ra:.72,lx:-120+step*8,rx:120+step*8,ly:54-step*8,ry:54+step*8,bob:-Math.abs(step)*3});
    } else if(active==='hop_left') {
      const hop=this.reduced?0:Math.sin(clamp(e/1.7,0,1)*Math.PI);
      set({left:.9,right:.9,smile:.9,happy:.8,bob:-hop*12,tilt:-7*hop,gaze_x:-6,la:.8,ra:.8,lx:-132,rx:114,ly:18,ry:30,sx:1-hop*.02,sy:1+hop*.03});
    } else if(active==='hop_right') {
      const hop=this.reduced?0:Math.sin(clamp(e/1.7,0,1)*Math.PI);
      set({left:.9,right:.9,smile:.9,happy:.8,bob:-hop*12,tilt:7*hop,gaze_x:6,la:.8,ra:.8,lx:-114,rx:132,ly:30,ry:18,sx:1-hop*.02,sy:1+hop*.03});
    } else if(active==='spin') {
      const turn=this.reduced?0:Math.sin(e*4.5);
      set({left:.86,right:.86,smile:1,happy:.9,tilt:turn*14,gaze_x:turn*8,la:.9,ra:.9,lx:-128,rx:128,ly:4,ry:4,bob:-Math.abs(turn)*5,sx:1+Math.abs(turn)*.025,sy:1-Math.abs(turn)*.018});
    } else if(active==='sway') {
      const sway=this.reduced?0:Math.sin(e*1.8);
      set({left:.62,right:.66,smile:.66,cheek:.3,tilt:sway*7,bob:2,la:.5,ra:.5,lx:-108,rx:108,ly:70+sway*4,ry:70-sway*4});
    } else if(active==='pose_star') {
      const pop=e<.55?back(e/.55,.8):1;
      set({left:.8,right:.8,smile:1,mouth:.18,cheek:.65,happy:1,la:1,ra:1,lx:-145,rx:145,ly:-35,ry:-35,lr:-28,rr:28,bob:-5*pop,sx:.97+.03*pop,sy:.97+.03*pop});
    } else if(active==='party') {
      const beat=this.reduced?0:Math.sin(e*8.5);
      set({left:.58,right:.58,smile:1,mouth:.30,cheek:.82,happy:1,la:1,ra:1,lx:-134,rx:134,ly:-24+beat*12,ry:-24-beat*12,lr:-25+beat*16,rr:25+beat*16,tilt:beat*5,bob:-Math.abs(beat)*8,notes:1});
    } else if(active==='music_nod') {
      const beat=this.reduced?0:Math.sin(e*5.8);
      set({left:.56,right:.56,smile:.78,mouth:.08,cheek:.38,happy:.65,tilt:beat*6,bob:-Math.abs(beat)*2,notes:.65,la:.42,ra:.42,lx:-100,rx:100,ly:70,ry:70});
    } else if(active==='camera_pose') {
      const pose=this.reduced?0:Math.sin(e*2)*.5+.5;
      set({left:.72,right:1.06,smile:1,mouth:.12,cheek:.78,happy:.9,tilt:-8,ra:1,rx:110,ry:-20,rr:-18,la:.65,lx:-108,ly:44,heart:.2*pose});
    } else if(active==='victory') {
      const pop=e<.5?back(e/.5,.8):1;
      set({left:.72,right:.72,smile:1,mouth:.24,cheek:.72,happy:1,la:1,ra:1,lx:-122,rx:122,ly:-28,ry:-28,lr:-20,rr:20,bob:-7*pop,tilt:-3,notes:.25});
    } else if(active==='high_five') {
      const reach=e<.55?back(e/.55,.7):1;
      set({left:.84,right:.84,smile:1,mouth:.16,cheek:.55,happy:.9,ra:1,rx:138,ry:-52*reach,rr:8,tilt:-4,bob:-3*reach});
    } else if(active==='peace') {
      const pop=e<.5?back(e/.5,.6):1;
      set({left:.74,right:1.02,smile:.95,mouth:.10,cheek:.7,happy:.85,ra:1,rx:118,ry:-36*pop,rr:-12,tilt:-7,gaze_x:3});
    } else if(this.state==='thinking') set({gaze_x:-7,gaze_y:-6,tilt:-5,brow:1});
    if(this.dragging) set({sx:1.055,sy:.94,left:1.1,right:1.1,mouth:.35,tilt:clamp(this.offsetTarget.x*.07,-8,8)});
    if(this.reduced) set({bob:0,sx:1,sy:1});
    return p;
  }

  emitAudio(cue, volume=1, rate=1, pan=0) {
    this.audioEvents.push({cue,volume,rate,pan});
  }
  consumeAudioEvents() {
    const events=this.audioEvents;
    this.audioEvents=[];
    return events;
  }
  audioCrossed(prev, now, time, cue, volume=1, rate=1, pan=0) {
    if(prev<time && now>=time) this.emitAudio(cue,volume,rate,pan);
  }
  audioEvery(prev, now, first, period, cue, volume=1, rate=1, pan=0, until=Infinity) {
    if(period<=0 || now<first || prev>=until) return;
    let k=Math.max(0,Math.ceil((prev-first)/period));
    if(first+k*period<=prev+1e-6) k++;
    for(let t=first+k*period;t<=now+1e-6 && t<=until;t+=period) {
      this.emitAudio(cue,volume,rate,pan);
    }
  }
  advanceAudio(prev, now) {
    const g=this.gesture;
    const cross=(t,cue,v=1,r=1,p=0)=>this.audioCrossed(prev,now,t,cue,v,r,p);
    const every=(first,period,cue,v=1,r=1,p=0,until=Infinity)=>this.audioEvery(prev,now,first,period,cue,v,r,p,until);

    // Physical motion: derive cue timing from the same equations that drive the pose.
    if(g==='wave') {
      every(Math.PI/9,2*Math.PI/9,'swish',.46,1.00,-.12,2.5);
    } else if(g==='double_wave') {
      every(Math.PI/9.5,2*Math.PI/9.5,'swish',.48,1.01,0,2.4);
    } else if(g==='hello_shy') {
      every(Math.PI/8,2*Math.PI/8,'swish',.28,.96,.08,1.65);
    } else if(g==='goodbye') {
      every(Math.PI/8.8,2*Math.PI/8.8,'swish',.40,.98,.12,2.35);
    } else if(g==='welcome_back') {
      every(Math.PI/6,2*Math.PI/6,'swish',.38,1.00,.10,1.9);
      cross(.82,'bell',.12,1.02,0);
    } else if(g==='clap') {
      // Hands are closest when (.5 + .5*sin(10t)) reaches zero.
      every(3*Math.PI/20,2*Math.PI/10,'clap',.56,1.00,0,3.05);
    } else if(g==='high_five') {
      cross(.55,'clap',.62,1.02,0);
    } else if(g==='spin') {
      // Highest rotational velocity happens at sin(4.5t) zero crossings.
      every(Math.PI/4.5,Math.PI/4.5,'swish',.52,1.04,0,2.95);
    } else if(g==='dance') {
      // Visible motion is hands/body sway, so use movement Foley rather than footsteps.
      every(Math.PI/7,2*Math.PI/7,'swish',.30,1.00,0,4.45);
    } else if(g==='music_groove') {
      every(Math.PI/6.2,2*Math.PI/6.2,'fabric',.20,.99,0,3.8);
    } else if(g==='music_nod') {
      every(Math.PI/5.8,2*Math.PI/5.8,'fabric',.10,.98,0,2.8);
    } else if(g==='party') {
      every(Math.PI/8.5,2*Math.PI/8.5,'swish',.30,1.02,0,3.25);
    } else if(g==='celebrate') {
      every(Math.PI/7.5,2*Math.PI/7.5,'swish',.28,1.02,0,3.6);
      cross(3.45,'bell',.12,1.02,0);
    } else if(g==='excited') {
      every(Math.PI/10,2*Math.PI/10,'swish',.26,1.03,0,2.45);
    } else if(g==='cheer') {
      every(Math.PI/8,2*Math.PI/8,'swish',.24,1.01,.08,2.25);
    } else if(g==='stretch') {
      cross(.22,'fabric',.40,.94,0);
      cross(.78,'swish',.18,.92,0);
    } else if(g==='side_stretch') {
      cross(.28,'fabric',.38,.95,-.06);
      cross(1.20,'swish',.18,.92,.06);
      cross(2.18,'fabric',.20,.94,0);
    } else if(g==='bow') {
      cross(.18,'fabric',.34,.94,0);
      cross(.90,'swish',.16,.92,0);
      cross(1.68,'fabric',.16,.94,0);
    } else if(g==='bounce') {
      cross(.12,'swish',.20,1.01,0);
      every(Math.PI/5.4,Math.PI/5.4,'fabric',.18,.98,0,1.68);
    } else if(g==='hop_left' || g==='hop_right') {
      cross(.16,'swish',.24,1.00,g==='hop_left'?-.12:.12);
      cross(1.70,'fabric',.24,.98,g==='hop_left'?-.08:.08);
    } else if(g==='roam_walk') {
      // The visible animation is floating/hand motion, not literal feet.
      every(Math.PI/6,Math.PI/6,'fabric',.16,.98,0,2.85);
    } else if(g==='sneak') {
      every(Math.PI/5.5,Math.PI/5.5,'fabric',.13,.94,0,2.65);
    } else if(g==='tip_toe') {
      cross(.20,'fabric',.14,.92,0);
      cross(1.40,'swish',.13,.92,0);
      cross(2.80,'fabric',.14,.92,0);
    } else if(g==='sway' || g==='cozy_sway') {
      const speed=g==='sway'?1.8:1.4;
      every(Math.PI/speed,Math.PI/speed,'fabric',.12,.96,0,3.5);
    } else if(g==='fishing') {
      // These times are the exact phase boundaries used by targets().
      cross(.42,'swish',.52,1.00,-.12);   // rod cast
      cross(.96,'water',.40,1.00,.10);    // line settles in water
      cross(4.20,'fabric',.18,.96,0);      // surprise / hand reposition
      cross(4.77,'ratchet',.28,1.00,-.04);// reel starts
      cross(4.94,'ratchet',.26,1.03,.04);
      cross(5.11,'ratchet',.24,.98,-.03);
      cross(4.84,'water',.32,.98,.10);     // fish breaks surface
    } else if(g==='write') {
      // Hand x position is sin(7t); key presses align to extrema.
      every(Math.PI/14,Math.PI/7,'key',.28,1.00,0,3.85);
    } else if(g==='type_fast') {
      every(Math.PI/24,Math.PI/12,'key',.25,1.04,0,3.45);
    } else if(g==='code_focus') {
      // No visible typing motion in this pose; use only a subtle terminal-like click.
      cross(.72,'click',.09,.98,0);
      cross(2.45,'click',.08,1.02,0);
    } else if(g==='camera_pose') {
      // pose = sin(2t)*.5+.5 reaches its first clear peak here.
      cross(Math.PI/4,'mech',.46,1.00,0);
    } else if(g==='salute') {
      cross(.50,'mech',.18,1.00,0);
    } else if(g==='read') {
      // No physical book is drawn; keep this silent to avoid fake Foley.
    } else if(g==='heart') {
      cross(.72,'fabric',.12,.96,0);
    } else if(g==='sleep') {
      cross(.82,'breath',.24,.90,0);
      cross(2.55,'breath',.20,.92,0);
      cross(4.10,'breath',.18,.92,0);
    } else if(g==='yawn') {
      cross(.82,'breath',.28,.88,0);
    } else if(g==='breathe') {
      every(.52,Math.PI/1.45,'breath',.22,.94,0,4.15);
    } else if(g==='meditate') {
      every(.55,Math.PI/1.3,'breath',.20,.92,0,4.05);
    } else if(g==='relax') {
      every(.55,Math.PI/1.35,'breath',.18,.94,0,3.6);
    } else if(g==='wake_up') {
      cross(.42,'fabric',.18,1.00,0);
    }

    // Digital/semantic events stay minimal and only fire at visible state changes.
    if(g==='idea') {
      cross(.42,'glass',.20,1.02,0);
    } else if(g==='lightbulb_pop') {
      cross(.28,'glass',.24,1.05,0);
    } else if(g==='brainstorm') {
      cross(.60,'glass',.10,1.00,-.05);
      cross(3.02,'glass',.09,1.03,.05);
    } else if(g==='search' || g==='scan') {
      cross(.18,'computer',.08,g==='scan'?1.03:.98,0);
    } else if(g==='found' || g==='success' || g==='response_ready') {
      cross(.22,'bell',.18,1.03,0);
    } else if(g==='detect') {
      cross(.46,'bell',.13,1.04,0);
    } else if(g==='recharge') {
      cross(.22,'computer',.07,.95,0);
      cross(2.85,'bell',.10,1.00,0);
    } else if(g==='loading') {
      cross(.20,'computer',.06,.94,0);
    }
  }

  advance(elapsedDt) {
    elapsedDt=Math.max(0,elapsedDt); const dt=Math.min(elapsedDt,.05);
    const prevGestureTime=this.gestureTime;
    this.elapsed+=elapsedDt; this.gestureTime+=elapsedDt;
    this.advanceAudio(prevGestureTime,this.gestureTime);
    if(this.elapsed>this.nextBlink&&!this.reduced) {
      this.blinkTime=0; this.nextBlink=this.elapsed+2.6+this.random()*2.9;
    }
    this.blinkTime+=elapsedDt;
    if(this.elapsed>this.nextIdle&&this.state==='idle'&&this.gesture==='idle'&&!this.dragging&&!this.reduced) {
      const v=this.random()*100;
      this.idleAction=v<39?'look':v<66?'smile':v<88?'tilt':v<96?'stretch':'sleepy';
      this.idleSide=this.random()<.5?-1:1;
      this.idleUntil=this.elapsed+1.7; this.nextIdle=this.elapsed+5+this.random()*3;
    }
    if(this.gesture==='fishing'&&this.gestureTime>4.8&&!this.caught) { this.caught=true; this.burst(142,24,18); }
    const mix=(a,b,r)=>a+(b-a)*(1-Math.exp(-r*dt));
    this.voice=mix(this.voice,this.voiceTarget,18); this.audio=mix(this.audio,this.audioTarget,12);
    if(this.voiceDriven)this.voiceTarget*=Math.exp(-dt*2.2);
    this.audioTarget*=Math.exp(-dt*1.7);
    const target=this.targets();
    const speechFace=this.voiceDriven&&(this.gesture==='talk'||this.state==='talking');
    for(const key of Object.keys(this.pose)) {
      const rate=this.reduced
        ? 22
        : speechFace&&key==='mouth'
          ? 24
          : speechFace&&key==='mouthWide'
            ? 18
            : ['left','right','gaze_x','gaze_y'].includes(key)
              ? 10
              : 6.2;
      this.pose[key]=mix(this.pose[key],target[key],rate);
    }
    for(const axis of ['x','y']) {
      if(!this.dragging) this.offsetTarget[axis]*=Math.exp(-dt*2.3);
      this.offset[axis]=mix(this.offset[axis],this.offsetTarget[axis],9);
    }
    for(const v of this.particles) { v[0]+=v[2]*dt; v[1]+=v[3]*dt; v[3]+=80*dt; v[4]+=dt; }
    this.particles=this.particles.filter(v=>v[4]<v[5]);
  }
}
