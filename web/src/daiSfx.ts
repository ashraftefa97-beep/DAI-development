import * as Tone from 'tone';

export type DaiSfxMode = 'soft' | 'normal' | 'silent';

type PlayOptions = {
  ducked?: boolean;
  durationMs?: number;
};

class DaiSfxEngine {
  private enabled=true;
  private volume=.72;
  private mode:DaiSfxMode='normal';
  private ready=false;
  private lastMotion='';
  private lastAt=0;

  private master:Tone.Gain|null=null;
  private compressor:Tone.Compressor|null=null;
  private limiter:Tone.Limiter|null=null;
  private reverb:Tone.Reverb|null=null;
  private delay:Tone.FeedbackDelay|null=null;
  private bright:Tone.Filter|null=null;

  configure(config:{enabled:boolean;volume:number;mode:DaiSfxMode}){
    this.enabled=config.enabled;
    this.volume=Math.max(0,Math.min(1,config.volume));
    this.mode=config.mode;
    this.refreshMaster();
  }

  private ensureGraph(){
    if(this.master)return;
    this.master=new Tone.Gain(1);
    this.compressor=new Tone.Compressor({threshold:-18,ratio:3.5,attack:.008,release:.16});
    this.limiter=new Tone.Limiter(-1.2);
    this.reverb=new Tone.Reverb({decay:1.15,preDelay:.012,wet:.23});
    this.delay=new Tone.FeedbackDelay({delayTime:.10,feedback:.10,wet:.09});
    this.bright=new Tone.Filter({frequency:5600,type:'lowpass',rolloff:-12});
    this.master.chain(
      this.bright,
      this.delay,
      this.reverb,
      this.compressor,
      this.limiter,
      Tone.getDestination()
    );
    this.refreshMaster();
  }

  private refreshMaster(){
    if(!this.master)return;
    const base=this.mode==='silent'||!this.enabled?0:this.mode==='soft'?.74:1;
    this.master.gain.rampTo(base*this.volume,.04);
  }

  async unlock(){
    try{
      this.ensureGraph();
      await Tone.start();
      this.ready=Tone.getContext().state==='running';
      return this.ready;
    }catch{
      this.ready=false;
      return false;
    }
  }

  private level(ducked=false){
    if(!this.enabled||this.mode==='silent')return 0;
    const modeGain=this.mode==='soft'?.80:1;
    return Math.max(.01,modeGain*(ducked?.24:1));
  }

  private connect<T extends Tone.ToneAudioNode>(node:T,gainValue:number){
    this.ensureGraph();
    const gain=new Tone.Gain(gainValue);
    node.connect(gain);
    gain.connect(this.master!);
    return gain;
  }

  private cleanup(nodes:Array<{dispose:()=>unknown}>,delay=1900){
    window.setTimeout(()=>{
      for(const node of nodes){
        try{node.dispose();}catch{}
      }
    },delay);
  }

  private bell(notes:string[],velocity:number,spacing=.08,offset=0,release=.22){
    const synth=new Tone.PolySynth(Tone.Synth,{
      oscillator:{type:'sine'},
      envelope:{attack:.005,decay:.09,sustain:.04,release}
    });
    const gain=this.connect(synth,1);
    const now=Tone.now()+.012+offset;
    notes.forEach((note,index)=>synth.triggerAttackRelease(note,.12,now+index*spacing,velocity));
    this.cleanup([synth,gain],Math.round((offset+1.35)*1000));
  }

  private pluck(notes:string[],velocity:number,spacing=.075,offset=0){
    const synth=new Tone.PluckSynth({attackNoise:.75,dampening:3600,resonance:.86});
    const gain=this.connect(synth,.9*Math.max(.12,Math.min(1,velocity)));
    const now=Tone.now()+.012+offset;
    notes.forEach((note,index)=>synth.triggerAttack(note,now+index*spacing));
    this.cleanup([synth,gain],Math.round((offset+1.2)*1000));
  }

  private noise(
    velocity:number,
    duration=.16,
    filterFreq=1800,
    offset=0,
    type:'pink'|'white'|'brown'='pink',
    filterType:BiquadFilterType='lowpass'
  ){
    const filter=new Tone.Filter(filterFreq,filterType);
    const synth=new Tone.NoiseSynth({
      noise:{type},
      envelope:{attack:.004,decay:duration*.55,sustain:.01,release:duration*.40}
    });
    const gain=this.connect(filter,.8);
    synth.connect(filter);
    synth.triggerAttackRelease(duration,Tone.now()+.012+offset,velocity);
    this.cleanup([synth,filter,gain],Math.round((offset+1.1)*1000));
  }

  private tone(
    note:string,
    velocity:number,
    duration=.14,
    offset=0,
    type:'sine'|'triangle'|'square'='sine'
  ){
    const synth=new Tone.Synth({
      oscillator:{type},
      envelope:{attack:.004,decay:duration*.45,sustain:.03,release:duration*.55}
    });
    const gain=this.connect(synth,.82);
    synth.triggerAttackRelease(note,duration,Tone.now()+.012+offset,velocity);
    this.cleanup([synth,gain],Math.round((offset+1.1)*1000));
  }

  private sweep(fromHz:number,toHz:number,velocity:number,duration=.26,offset=0){
    const synth=new Tone.Synth({
      oscillator:{type:'triangle'},
      envelope:{attack:.005,decay:duration*.55,sustain:.02,release:duration*.35}
    });
    const gain=this.connect(synth,.85);
    const now=Tone.now()+.012+offset;
    synth.frequency.setValueAtTime(fromHz,now);
    synth.frequency.exponentialRampToValueAtTime(Math.max(35,toHz),now+duration);
    synth.triggerAttackRelease(duration,now,velocity);
    this.cleanup([synth,gain],Math.round((offset+1.1)*1000));
  }

  private thump(note:string,velocity:number,offset=0){
    const synth=new Tone.MembraneSynth({
      pitchDecay:.025,
      octaves:2.1,
      envelope:{attack:.002,decay:.10,sustain:0,release:.08}
    });
    const gain=this.connect(synth,.82);
    synth.triggerAttackRelease(note,.09,Tone.now()+.012+offset,velocity);
    this.cleanup([synth,gain],Math.round((offset+1)*1000));
  }

  private clap(velocity:number,offset=0){
    this.noise(.68*velocity,.055,2400,offset,'white','highpass');
    this.noise(.42*velocity,.045,3400,offset+.018,'white','bandpass');
  }

  private click(velocity:number,offset=0){
    this.noise(.36*velocity,.024,2800,offset,'white','highpass');
    this.tone('C7',.15*velocity,.025,offset,'square');
  }

  private shutter(velocity:number,offset=0){
    this.click(.85*velocity,offset);
    this.click(.62*velocity,offset+.055);
    this.noise(.20*velocity,.07,1600,offset+.02,'white','highpass');
  }

  private footstep(velocity:number,offset=0,soft=false){
    this.thump(soft?'D2':'F2',(soft?.22:.38)*velocity,offset);
    this.noise((soft?.10:.16)*velocity,.05,soft?700:1100,offset+.012,'brown','lowpass');
  }

  private boing(velocity:number,offset=0){
    this.thump('C3',.48*velocity,offset);
    this.sweep(210,510,.35*velocity,.18,offset+.025);
  }

  private breathe(velocity:number,offset=0,long=false){
    this.noise(.17*velocity,long?.62:.40,620,offset,'pink','lowpass');
    this.tone(long?'D4':'E4',.12*velocity,long?.48:.30,offset+.03,'sine');
  }

  private typing(velocity:number,offset=0,count=6,fast=false){
    const step=fast?.045:.085;
    for(let i=0;i<count;i++)this.click((.42+(i%3)*.08)*velocity,offset+i*step);
  }

  private rhythm(velocity:number,offset=0,bars=1){
    const pattern=[
      [0,'C3',.52],
      [.18,'G3',.34],
      [.36,'C3',.45],
      [.54,'G3',.30]
    ] as const;
    for(let b=0;b<bars;b++){
      const base=offset+b*.72;
      for(const [t,n,v] of pattern)this.thump(n,v*velocity,base+t);
      this.pluck(['C5','E5','G5'],.24*velocity,.075,base+.08);
    }
  }

  private fishing(velocity:number,durationMs=7400){
    const scale=Math.max(.75,Math.min(1.15,durationMs/7400));
    this.noise(.22*velocity,.22,2200,0,'white','highpass');
    this.sweep(520,190,.30*velocity,.32,.03);
    this.noise(.26*velocity,.11,900,.88*scale,'pink','lowpass');
    this.thump('C3',.20*velocity,.90*scale);
    for(let i=0;i<5;i++)this.click(.34*velocity,2.15*scale+i*.18*scale);
    this.noise(.34*velocity,.18,1200,4.45*scale,'pink','lowpass');
    this.bell(['G5','C6'],.42*velocity,.07,4.62*scale,.24);
  }

  private motionProfile(state:string,velocity:number,durationMs=2200){
    switch(state){
      case 'wave':
        this.noise(.15*velocity,.11,2100,0,'white','highpass');
        this.bell(['E5','A5'],.34*velocity,.09,.03,.18);
        break;
      case 'double_wave':
        this.noise(.13*velocity,.10,2300,0,'white','highpass');
        this.noise(.13*velocity,.10,2300,.16,'white','highpass');
        this.bell(['E5','A5','C6'],.32*velocity,.07,.03,.18);
        break;
      case 'welcome_back':
        this.bell(['C5','E5','A5'],.44*velocity,.08,0,.24);
        this.noise(.12*velocity,.12,2200,.05,'white','highpass');
        break;
      case 'hello_shy':
        this.bell(['E5','A5'],.25*velocity,.12,0,.30);
        this.noise(.08*velocity,.10,1800,.05,'pink','highpass');
        break;
      case 'goodbye':
        this.bell(['A5','E5'],.30*velocity,.13,0,.26);
        this.noise(.12*velocity,.13,1800,.04,'white','highpass');
        break;
      case 'bow':
        this.sweep(410,240,.20*velocity,.25,0);
        this.bell(['E5'],.25*velocity,.08,.22,.22);
        break;
      case 'salute':
        this.click(.42*velocity,0);
        this.bell(['A5'],.28*velocity,.07,.06,.16);
        break;

      case 'listen':
        this.bell(['D5','A5'],.36*velocity,.065,0,.17);
        this.tone('A6',.14*velocity,.07,.13);
        break;
      case 'search':
        this.sweep(260,860,.43*velocity,.30,0);
        this.tone('B6',.20*velocity,.08,.28);
        break;
      case 'scan':
        this.sweep(310,1180,.40*velocity,.36,0);
        this.click(.26*velocity,.19);
        break;
      case 'detect':
        this.sweep(340,920,.34*velocity,.22,0);
        this.bell(['G5','C6'],.36*velocity,.06,.23,.19);
        break;
      case 'found':
        this.bell(['E5','G5','C6'],.52*velocity,.065,0,.23);
        break;

      case 'heart':
        this.thump('C3',.42*velocity,0);
        this.thump('E3',.34*velocity,.13);
        this.bell(['A5'],.30*velocity,.06,.20,.34);
        break;
      case 'blush':
      case 'shy':
        this.thump('C3',.24*velocity,0);
        this.bell(['E5','A5'],.23*velocity,.11,.08,.28);
        break;
      case 'happy':
        this.pluck(['C5','E5','G5'],.48*velocity,.07,0);
        break;
      case 'giggle':
        this.pluck(['E5','G5','B5'],.38*velocity,.055,0);
        this.pluck(['G5','B5'],.26*velocity,.05,.20);
        break;
      case 'laugh':
        this.pluck(['C5','E5','G5','C6'],.43*velocity,.06,0);
        this.pluck(['E5','G5','C6'],.31*velocity,.055,.28);
        break;
      case 'excited':
      case 'cheer':
        this.pluck(['C5','E5','G5','C6'],.52*velocity,.05,0);
        this.clap(.42*velocity,.28);
        break;
      case 'proud':
        this.bell(['C5','G5','C6'],.43*velocity,.09,0,.28);
        break;
      case 'celebrate':
        this.rhythm(.72*velocity,0,1);
        this.bell(['G5','C6','E6'],.42*velocity,.055,.16,.22);
        break;
      case 'party':
        this.rhythm(.78*velocity,0,2);
        this.bell(['C6','E6'],.28*velocity,.06,.30,.22);
        break;
      case 'clap':
        this.clap(.66*velocity,0);
        this.clap(.72*velocity,.24);
        this.clap(.66*velocity,.48);
        break;
      case 'high_five':
        this.clap(.92*velocity,.18);
        this.bell(['C6'],.28*velocity,.05,.24,.16);
        break;

      case 'idea':
        this.click(.32*velocity,0);
        this.bell(['A5','C6','E6'],.48*velocity,.055,.05,.32);
        break;
      case 'lightbulb_pop':
        this.thump('E4',.24*velocity,0);
        this.bell(['B5','E6'],.52*velocity,.06,.04,.32);
        break;
      case 'brainstorm':
        this.bell(['E5','G5'],.27*velocity,.09,0,.22);
        this.bell(['A5','C6'],.29*velocity,.09,.24,.22);
        this.bell(['B5','E6'],.31*velocity,.08,.48,.24);
        break;
      case 'thought_orbit':
        this.bell(['D5','A5','E6'],.28*velocity,.17,0,.45);
        break;
      case 'thinking_deep':
        this.tone('D4',.20*velocity,.34,0);
        this.tone('A4',.15*velocity,.28,.28);
        break;
      case 'question':
        this.tone('E5',.28*velocity,.09,0);
        this.tone('B5',.35*velocity,.12,.15);
        break;
      case 'curious':
      case 'peek':
      case 'window_peek':
      case 'look_around':
      case 'scout':
        this.pluck(['E5','B5'],.31*velocity,.13,0);
        break;

      case 'stretch':
      case 'side_stretch':
        this.noise(.16*velocity,.34,900,0,'pink','lowpass');
        this.sweep(240,360,.18*velocity,.32,.02);
        break;
      case 'relax':
      case 'cozy_sway':
        this.breathe(.82*velocity,0,true);
        break;
      case 'sleep':
        this.breathe(.66*velocity,0,true);
        this.tone('C5',.15*velocity,.34,.58);
        break;
      case 'yawn':
        this.noise(.15*velocity,.62,720,0,'pink','lowpass');
        this.sweep(260,150,.16*velocity,.52,.04);
        break;
      case 'dream':
        this.bell(['C5','G5','D6'],.22*velocity,.18,0,.55);
        break;
      case 'meditate':
      case 'breathe':
        this.breathe(.72*velocity,0,true);
        this.bell(['D5'],.12*velocity,.08,.48,.45);
        break;
      case 'recharge':
        this.sweep(160,520,.24*velocity,.48,0);
        this.bell(['A5'],.18*velocity,.06,.48,.28);
        break;
      case 'wake_up':
        this.sweep(220,720,.36*velocity,.28,0);
        this.bell(['E5','A5'],.34*velocity,.07,.19,.18);
        break;

      case 'dance':
      case 'music_groove':
      case 'music_nod':
        this.rhythm(.74*velocity,0,2);
        break;
      case 'spin':
        this.sweep(260,1050,.34*velocity,.42,0);
        this.noise(.15*velocity,.28,2500,.04,'white','highpass');
        break;
      case 'bounce':
      case 'hop_left':
      case 'hop_right':
        this.boing(.72*velocity,0);
        this.footstep(.55*velocity,.24);
        break;
      case 'roam_walk':
        this.footstep(.42*velocity,0);
        this.footstep(.38*velocity,.24);
        this.footstep(.42*velocity,.48);
        break;
      case 'tip_toe':
      case 'sneak':
        this.footstep(.32*velocity,0,true);
        this.footstep(.28*velocity,.27,true);
        this.footstep(.30*velocity,.54,true);
        break;
      case 'sway':
        this.noise(.10*velocity,.25,900,0,'pink','lowpass');
        this.noise(.09*velocity,.25,900,.33,'pink','lowpass');
        break;

      case 'fishing':
        this.fishing(velocity,durationMs);
        break;

      case 'read':
        this.noise(.10*velocity,.08,1300,.05,'pink','highpass');
        this.noise(.10*velocity,.08,1300,.55,'pink','highpass');
        break;
      case 'write':
        this.typing(.70*velocity,0,4,false);
        break;
      case 'type_fast':
        this.typing(.72*velocity,0,10,true);
        break;
      case 'code_focus':
        this.typing(.56*velocity,0,7,true);
        this.tone('C6',.17*velocity,.05,.40,'square');
        break;
      case 'working':
        this.typing(.34*velocity,0,4,false);
        break;
      case 'loading':
        this.click(.20*velocity,0);
        this.click(.23*velocity,.18);
        this.click(.26*velocity,.36);
        break;
      case 'wait_patient':
        this.tone('A4',.13*velocity,.06,0);
        this.tone('A4',.11*velocity,.06,.48);
        break;
      case 'impatient':
        this.click(.40*velocity,0);
        this.click(.42*velocity,.12);
        this.click(.46*velocity,.24);
        break;

      case 'camera_pose':
        this.shutter(.82*velocity,.35);
        this.bell(['E6'],.18*velocity,.05,.48,.18);
        break;
      case 'pose_star':
        this.bell(['C6','E6','G6'],.44*velocity,.055,0,.32);
        break;
      case 'victory':
        this.bell(['C5','G5','C6','E6'],.48*velocity,.06,0,.24);
        break;
      case 'peace':
        this.bell(['E5','A5'],.28*velocity,.11,0,.27);
        break;
      case 'approve':
      case 'nod_yes':
      case 'success':
      case 'response_ready':
        this.bell(['E5','G5','C6'],.42*velocity,.06,0,.22);
        break;

      case 'wow':
        this.sweep(340,980,.43*velocity,.20,0);
        this.bell(['C6'],.26*velocity,.05,.17,.18);
        break;
      case 'surprise_soft':
        this.sweep(420,790,.27*velocity,.16,0);
        break;
      case 'startled':
        this.thump('C3',.45*velocity,0);
        this.sweep(280,920,.32*velocity,.15,.03);
        break;
      case 'alert':
        this.tone('A5',.44*velocity,.08,0);
        this.tone('A5',.36*velocity,.08,.13);
        break;
      case 'error':
        this.tone('F4',.40*velocity,.10,0);
        this.tone('D4',.34*velocity,.13,.11);
        break;
      case 'shake_no':
        this.tone('E4',.26*velocity,.08,0);
        this.tone('C4',.30*velocity,.10,.13);
        break;
      case 'confused':
        this.tone('E5',.22*velocity,.08,0);
        this.tone('D5',.20*velocity,.08,.13);
        this.tone('F5',.19*velocity,.10,.26);
        break;

      // Voice/talk/focus loops deliberately stay almost silent to avoid fighting speech.
      case 'talk':
      case 'focus':
      case 'voicewait':
      case 'idle':
        break;

      default:
        this.bell(['E5'],.18*velocity,.05,0,.16);
        break;
    }
  }

  playMotion(state:string,options:PlayOptions={}){
    if(!this.ready||!this.enabled||this.mode==='silent')return false;
    const now=performance.now();
    if(state===this.lastMotion&&now-this.lastAt<220)return false;
    this.lastMotion=state;
    this.lastAt=now;
    const velocity=this.level(Boolean(options.ducked));
    if(velocity<=0)return false;
    this.motionProfile(state,velocity,options.durationMs||2200);
    return true;
  }

  preview(){
    if(!this.ready)return false;
    this.motionProfile('fishing',this.level(false),5200);
    return true;
  }
}

export const daiSfx=new DaiSfxEngine();
