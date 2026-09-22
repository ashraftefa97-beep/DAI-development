import * as Tone from 'tone';
import { createUISFX } from 'uisfx';

export type DaiSfxMode = 'soft' | 'normal' | 'silent';

type PlayOptions = {
  ducked?: boolean;
  durationMs?: number;
};

type SonicPack =
  | 'soft'
  | 'glass'
  | 'arcade'
  | 'mechanical'
  | 'organic'
  | 'dreamy'
  | 'scifi'
  | 'rubber'
  | 'cinematic'
  | 'studio'
  | 'zen'
  | 'minimal';

class DaiSfxEngine {
  private enabled=true;
  private volume=.78;
  private mode:DaiSfxMode='normal';
  private ready=false;
  private lastMotion='';
  private lastAt=0;
  private timers=new Set<number>();
  private activeStops=new Set<()=>void>();

  private ui=createUISFX({
    pack:'scifi',
    preferences:{}
  } as any);

  private toneMaster:Tone.Gain|null=null;
  private toneLimiter:Tone.Limiter|null=null;
  private toneReverb:Tone.Reverb|null=null;

  configure(config:{enabled:boolean;volume:number;mode:DaiSfxMode}){
    this.enabled=config.enabled;
    this.volume=Math.max(0,Math.min(1,config.volume));
    this.mode=config.mode;
    const active=this.enabled&&this.mode!=='silent';
    this.ui.setEnabled(active);
    this.ui.setVolume(this.outputVolume(false));
    this.refreshTone();
  }

  private outputVolume(ducked:boolean){
    if(!this.enabled||this.mode==='silent')return 0;
    const modeGain=this.mode==='soft'?.72:1;
    return Math.max(0,Math.min(1,this.volume*modeGain*(ducked?.30:1)));
  }

  private ensureTone(){
    if(this.toneMaster)return;
    this.toneMaster=new Tone.Gain(this.outputVolume(false)*.42);
    this.toneReverb=new Tone.Reverb({decay:.85,preDelay:.008,wet:.12});
    this.toneLimiter=new Tone.Limiter(-1.5);
    this.toneMaster.chain(this.toneReverb,this.toneLimiter,Tone.getDestination());
  }

  private refreshTone(ducked=false){
    if(!this.toneMaster)return;
    this.toneMaster.gain.rampTo(this.outputVolume(ducked)*.42,.04);
  }

  async unlock(){
    try{
      this.ensureTone();
      await Promise.all([
        this.ui.unlock(),
        Tone.start()
      ]);
      this.ready=true;
      return true;
    }catch(error){
      console.warn('DAI sonic layer unlock failed',error);
      this.ready=false;
      return false;
    }
  }

  private clearScheduled(){
    for(const timer of this.timers)window.clearTimeout(timer);
    this.timers.clear();
    for(const stop of this.activeStops){
      try{stop();}catch{}
    }
    this.activeStops.clear();
  }

  private schedule(delayMs:number,fn:()=>void){
    const timer=window.setTimeout(()=>{
      this.timers.delete(timer);
      fn();
    },Math.max(0,delayMs));
    this.timers.add(timer);
  }

  private semantic(pack:SonicPack,cue:string,delayMs=0,ducked=false){
    this.schedule(delayMs,()=>{
      if(!this.ready||!this.enabled||this.mode==='silent')return;
      try{
        this.ui.setEnabled(true);
        this.ui.setVolume(this.outputVolume(ducked));
        this.ui.setPack(pack as any);
        const handle=this.ui.play(cue as any);
        if(handle&&typeof handle.stop==='function'){
          const stop=()=>handle.stop();
          this.activeStops.add(stop);
          this.schedule(1800,()=>this.activeStops.delete(stop));
        }
      }catch(error){
        console.debug('DAI semantic SFX skipped',cue,error);
      }
    });
  }

  private semanticLoop(pack:SonicPack,cue:string,durationMs:number,ducked=false,endCue?:string){
    this.schedule(0,()=>{
      if(!this.ready||!this.enabled||this.mode==='silent')return;
      try{
        this.ui.setVolume(this.outputVolume(ducked)*.72);
        this.ui.setPack(pack as any);
        const handle=this.ui.play(cue as any);
        if(handle&&typeof handle.stop==='function'){
          const stop=()=>handle.stop();
          this.activeStops.add(stop);
          this.schedule(Math.max(450,durationMs),()=>{
            try{handle.stop();}catch{}
            this.activeStops.delete(stop);
            if(endCue)this.semantic(pack,endCue,40,ducked);
          });
        }
      }catch(error){
        console.debug('DAI semantic loop skipped',cue,error);
      }
    });
  }

  private breath(offsetMs=0,ducked=false){
    this.schedule(offsetMs,()=>{
      if(!this.ready)return;
      this.ensureTone();
      this.refreshTone(ducked);
      const noise=new Tone.NoiseSynth({
        noise:{type:'pink'},
        envelope:{attack:.08,decay:.20,sustain:.08,release:.42}
      });
      const filter=new Tone.Filter(720,'lowpass');
      const gain=new Tone.Gain(.16);
      noise.chain(filter,gain,this.toneMaster!);
      noise.triggerAttackRelease(.58,Tone.now()+.01,.22);
      window.setTimeout(()=>{
        try{noise.dispose();filter.dispose();gain.dispose();}catch{}
      },1000);
    });
  }

  private softSweep(offsetMs=0,ducked=false,up=true){
    this.schedule(offsetMs,()=>{
      if(!this.ready)return;
      this.ensureTone();
      this.refreshTone(ducked);
      const synth=new Tone.Synth({
        oscillator:{type:'sine'},
        envelope:{attack:.008,decay:.12,sustain:.02,release:.18}
      });
      const gain=new Tone.Gain(.22);
      synth.chain(gain,this.toneMaster!);
      const at=Tone.now()+.01;
      synth.frequency.setValueAtTime(up?310:880,at);
      synth.frequency.exponentialRampToValueAtTime(up?920:280,at+.24);
      synth.triggerAttackRelease(.27,at,.30);
      window.setTimeout(()=>{try{synth.dispose();gain.dispose();}catch{}},700);
    });
  }

  private typingBurst(count:number,spacingMs:number,ducked=false){
    for(let i=0;i<count;i++){
      this.semantic('mechanical','typing',i*spacingMs,ducked);
    }
  }

  private footsteps(count:number,spacingMs:number,ducked=false,soft=false){
    for(let i=0;i<count;i++){
      this.semantic(soft?'zen':'organic','drop',i*spacingMs,ducked);
    }
  }

  private profile(state:string,durationMs:number,ducked:boolean){
    switch(state){
      case 'wave':
        this.semantic('glass','receive',0,ducked);
        this.semantic('soft','reaction',120,ducked);
        break;
      case 'double_wave':
        this.semantic('soft','reaction',0,ducked);
        this.semantic('soft','reaction',170,ducked);
        this.semantic('glass','receive',290,ducked);
        break;
      case 'welcome_back':
        this.semantic('glass','open',0,ducked);
        this.semantic('glass','receive',110,ducked);
        this.semantic('dreamy','reward',220,ducked);
        break;
      case 'hello_shy':
        this.semantic('soft','receive',0,ducked);
        this.semantic('dreamy','reaction',150,ducked);
        break;
      case 'goodbye':
        this.semantic('soft','reaction',0,ducked);
        this.semantic('glass','close',200,ducked);
        break;
      case 'bow':
        this.semantic('organic','swipe',0,ducked);
        this.semantic('zen','check',220,ducked);
        break;
      case 'salute':
        this.semantic('studio','snap',0,ducked);
        this.semantic('glass','check',100,ducked);
        break;

      case 'listen':
        this.semantic('scifi','start',0,ducked);
        this.semantic('glass','focus',100,ducked);
        break;
      case 'search':
        this.semanticLoop('scifi','scanning',Math.min(Math.max(durationMs,800),2600),ducked,'checkpoint');
        break;
      case 'scan':
        this.semanticLoop('scifi','scanning',Math.min(Math.max(durationMs,700),2200),ducked,'checkpoint');
        break;
      case 'detect':
        this.semantic('scifi','checkpoint',0,ducked);
        this.semantic('glass','complete',180,ducked);
        break;
      case 'found':
        this.semantic('glass','complete',0,ducked);
        this.semantic('dreamy','reward',120,ducked);
        break;

      case 'heart':
        this.semantic('dreamy','reaction',0,ducked);
        this.semantic('dreamy','reward',150,ducked);
        this.semantic('glass','check',320,ducked);
        break;
      case 'blush':
      case 'shy':
        this.semantic('soft','reaction',0,ducked);
        this.semantic('dreamy','info',180,ducked);
        break;
      case 'happy':
        this.semantic('soft','success',0,ducked);
        this.semantic('glass','reaction',130,ducked);
        break;
      case 'giggle':
        this.semantic('rubber','reaction',0,ducked);
        this.semantic('rubber','reaction',150,ducked);
        break;
      case 'laugh':
        this.semantic('rubber','reaction',0,ducked);
        this.semantic('rubber','reaction',130,ducked);
        this.semantic('soft','success',270,ducked);
        break;
      case 'excited':
      case 'cheer':
        this.semantic('arcade','reward',0,ducked);
        this.semantic('arcade','reaction',130,ducked);
        this.semantic('glass','success',250,ducked);
        break;
      case 'proud':
        this.semantic('cinematic','achievement',0,ducked);
        break;
      case 'celebrate':
        this.semantic('cinematic','achievement',0,ducked);
        this.semantic('arcade','reward',220,ducked);
        this.semantic('glass','complete',420,ducked);
        break;
      case 'party':
        this.semantic('arcade','play',0,ducked);
        this.semantic('arcade','reward',220,ducked);
        this.semantic('arcade','progress-step',440,ducked);
        this.semantic('cinematic','achievement',700,ducked);
        break;
      case 'clap':
        this.semantic('organic','reaction',0,ducked);
        this.semantic('organic','reaction',230,ducked);
        this.semantic('organic','reaction',460,ducked);
        break;
      case 'high_five':
        this.semantic('rubber','drop',120,ducked);
        this.semantic('glass','success',220,ducked);
        break;

      case 'idea':
        this.semantic('glass','bonus',0,ducked);
        this.semantic('dreamy','achievement',110,ducked);
        break;
      case 'lightbulb_pop':
        this.semantic('glass','bonus',0,ducked);
        this.semantic('glass','achievement',110,ducked);
        break;
      case 'brainstorm':
        this.semantic('scifi','progress-step',0,ducked);
        this.semantic('glass','progress-step',220,ducked);
        this.semantic('dreamy','bonus',440,ducked);
        break;
      case 'thought_orbit':
        this.semantic('dreamy','processing',0,ducked);
        this.schedule(Math.min(1500,durationMs),()=>this.ui.stopAll());
        break;
      case 'thinking_deep':
        this.semanticLoop('studio','processing',Math.min(durationMs,1900),ducked);
        break;
      case 'question':
        this.semantic('scifi','info',0,ducked);
        this.semantic('glass','mention',160,ducked);
        break;
      case 'curious':
      case 'peek':
      case 'window_peek':
      case 'look_around':
      case 'scout':
        this.semantic('scifi','info',0,ducked);
        this.semantic('soft','focus',150,ducked);
        break;

      case 'stretch':
      case 'side_stretch':
        this.semantic('organic','swipe',0,ducked);
        this.semantic('soft','release',240,ducked);
        break;
      case 'relax':
      case 'cozy_sway':
        this.semantic('zen','sleep',0,ducked);
        this.breath(120,ducked);
        break;
      case 'sleep':
        this.semantic('zen','sleep',0,ducked);
        this.breath(160,ducked);
        this.breath(820,ducked);
        break;
      case 'yawn':
        this.breath(0,ducked);
        this.semantic('zen','sleep',250,ducked);
        break;
      case 'dream':
        this.semantic('dreamy','sleep',0,ducked);
        this.semantic('dreamy','info',420,ducked);
        break;
      case 'meditate':
      case 'breathe':
        this.breath(0,ducked);
        this.breath(760,ducked);
        break;
      case 'recharge':
        this.semanticLoop('scifi','processing',Math.min(durationMs,1800),ducked,'complete');
        break;
      case 'wake_up':
        this.semantic('zen','wake',0,ducked);
        this.semantic('glass','open',160,ducked);
        break;

      case 'dance':
      case 'music_groove':
      case 'music_nod':
        this.semantic('arcade','play',0,ducked);
        this.semantic('arcade','progress-step',210,ducked);
        this.semantic('arcade','progress-step',430,ducked);
        this.semantic('arcade','reward',680,ducked);
        break;
      case 'spin':
        this.semantic('scifi','swipe',0,ducked);
        this.softSweep(40,ducked,true);
        this.semantic('glass','snap',300,ducked);
        break;
      case 'bounce':
      case 'hop_left':
      case 'hop_right':
        this.semantic('rubber','drag-start',0,ducked);
        this.semantic('rubber','drop',210,ducked);
        break;
      case 'roam_walk':
        this.footsteps(4,230,ducked,false);
        break;
      case 'tip_toe':
      case 'sneak':
        this.footsteps(3,280,ducked,true);
        break;
      case 'sway':
        this.semantic('organic','swipe',0,ducked);
        this.semantic('organic','swipe',360,ducked);
        break;

      case 'fishing':
        this.semantic('organic','drag-start',0,ducked);
        this.softSweep(60,ducked,false);
        this.semantic('organic','drop',800,ducked);
        this.semantic('mechanical','progress-step',1900,ducked);
        this.semantic('mechanical','progress-step',2200,ducked);
        this.semantic('organic','drop',Math.min(4200,Math.max(2600,durationMs*.58)),ducked);
        this.semantic('glass','complete',Math.min(4600,Math.max(3000,durationMs*.64)),ducked);
        break;

      case 'read':
        this.semantic('zen','open',0,ducked);
        this.semantic('zen','forward',520,ducked);
        break;
      case 'write':
        this.typingBurst(5,85,ducked);
        break;
      case 'type_fast':
        this.typingBurst(11,45,ducked);
        break;
      case 'code_focus':
        this.typingBurst(8,55,ducked);
        this.semantic('scifi','checkpoint',480,ducked);
        break;
      case 'working':
        this.typingBurst(4,110,ducked);
        break;
      case 'loading':
        this.semanticLoop('scifi','loading',Math.min(durationMs,1600),ducked);
        break;
      case 'wait_patient':
        this.semantic('minimal','progress-step',0,ducked);
        this.semantic('minimal','progress-step',520,ducked);
        break;
      case 'impatient':
        this.semantic('mechanical','press',0,ducked);
        this.semantic('mechanical','press',130,ducked);
        this.semantic('mechanical','press',260,ducked);
        break;

      case 'camera_pose':
        this.semantic('studio','snap',300,ducked);
        this.semantic('glass','reward',430,ducked);
        break;
      case 'pose_star':
        this.semantic('glass','achievement',0,ducked);
        break;
      case 'victory':
        this.semantic('cinematic','achievement',0,ducked);
        this.semantic('glass','complete',180,ducked);
        break;
      case 'peace':
        this.semantic('soft','reaction',0,ducked);
        this.semantic('glass','info',170,ducked);
        break;
      case 'approve':
      case 'nod_yes':
      case 'success':
      case 'response_ready':
        this.semantic('glass','success',0,ducked);
        break;

      case 'wow':
        this.semantic('cinematic','notification',0,ducked);
        this.semantic('glass','bonus',160,ducked);
        break;
      case 'surprise_soft':
        this.semantic('soft','notification',0,ducked);
        break;
      case 'startled':
        this.semantic('cinematic','warning',0,ducked);
        this.semantic('rubber','drop',120,ducked);
        break;
      case 'alert':
        this.semantic('scifi','warning',0,ducked);
        break;
      case 'error':
        this.semantic('cinematic','error',0,ducked);
        break;
      case 'shake_no':
        this.semantic('soft','blocked',0,ducked);
        break;
      case 'confused':
        this.semantic('scifi','info',0,ducked);
        this.semantic('soft','warning',180,ducked);
        break;

      // Speech and focus states intentionally stay silent so they never fight DAI voice.
      case 'talk':
      case 'focus':
      case 'voicewait':
      case 'idle':
        break;

      default:
        this.semantic('scifi','info',0,ducked);
        break;
    }
  }

  playMotion(state:string,options:PlayOptions={}){
    if(!this.ready||!this.enabled||this.mode==='silent')return false;
    const now=performance.now();
    if(state===this.lastMotion&&now-this.lastAt<240)return false;
    this.lastMotion=state;
    this.lastAt=now;
    this.clearScheduled();
    this.profile(state,options.durationMs||2200,Boolean(options.ducked));
    return true;
  }

  preview(){
    if(!this.ready)return false;
    this.clearScheduled();
    this.profile('fishing',5200,false);
    return true;
  }

  stopAll(){
    this.clearScheduled();
    try{this.ui.stopAll();}catch{}
  }
}

export const daiSfx=new DaiSfxEngine();
