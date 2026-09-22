import * as Tone from 'tone';

export type DaiSfxMode = 'soft' | 'normal' | 'silent';

type PlayOptions = {
  ducked?: boolean;
  durationMs?: number;
};

type SampleAlias =
  | 'confirm'
  | 'question'
  | 'error'
  | 'pluck'
  | 'glass'
  | 'select'
  | 'scroll'
  | 'switch'
  | 'click'
  | 'open'
  | 'close'
  | 'glitch'
  | 'softImpact'
  | 'lightImpact'
  | 'bellImpact'
  | 'footstepSoft'
  | 'cloth'
  | 'page'
  | 'metalClick'
  | 'computer'
  | 'field'
  | 'engine'
  | 'splashish';

const SAMPLE_BANK:Record<SampleAlias,string[]>={
  confirm:[
    'sfx/kenney/interface/Audio/confirmation_001.ogg',
    'sfx/kenney/interface/Audio/confirmation_002.ogg',
    'sfx/kenney/interface/Audio/confirmation_003.ogg',
    'sfx/kenney/interface/Audio/confirmation_004.ogg'
  ],
  question:[
    'sfx/kenney/interface/Audio/question_001.ogg',
    'sfx/kenney/interface/Audio/question_002.ogg',
    'sfx/kenney/interface/Audio/question_003.ogg',
    'sfx/kenney/interface/Audio/question_004.ogg'
  ],
  error:[
    'sfx/kenney/interface/Audio/error_001.ogg',
    'sfx/kenney/interface/Audio/error_003.ogg',
    'sfx/kenney/interface/Audio/error_005.ogg',
    'sfx/kenney/interface/Audio/error_007.ogg'
  ],
  pluck:[
    'sfx/kenney/interface/Audio/pluck_001.ogg',
    'sfx/kenney/interface/Audio/pluck_002.ogg'
  ],
  glass:[
    'sfx/kenney/interface/Audio/glass_001.ogg',
    'sfx/kenney/interface/Audio/glass_003.ogg',
    'sfx/kenney/interface/Audio/glass_005.ogg'
  ],
  select:[
    'sfx/kenney/interface/Audio/select_001.ogg',
    'sfx/kenney/interface/Audio/select_003.ogg',
    'sfx/kenney/interface/Audio/select_006.ogg'
  ],
  scroll:[
    'sfx/kenney/interface/Audio/scroll_001.ogg',
    'sfx/kenney/interface/Audio/scroll_003.ogg',
    'sfx/kenney/interface/Audio/scroll_005.ogg'
  ],
  switch:[
    'sfx/kenney/interface/Audio/switch_001.ogg',
    'sfx/kenney/interface/Audio/switch_004.ogg',
    'sfx/kenney/interface/Audio/switch_007.ogg'
  ],
  click:[
    'sfx/kenney/interface/Audio/click_001.ogg',
    'sfx/kenney/interface/Audio/click_003.ogg',
    'sfx/kenney/interface/Audio/click_005.ogg'
  ],
  open:[
    'sfx/kenney/interface/Audio/open_001.ogg',
    'sfx/kenney/interface/Audio/open_003.ogg'
  ],
  close:[
    'sfx/kenney/interface/Audio/close_001.ogg',
    'sfx/kenney/interface/Audio/close_003.ogg'
  ],
  glitch:[
    'sfx/kenney/interface/Audio/glitch_001.ogg',
    'sfx/kenney/interface/Audio/glitch_003.ogg'
  ],
  softImpact:[
    'sfx/kenney/impact/Audio/impactSoft_medium_000.ogg',
    'sfx/kenney/impact/Audio/impactSoft_medium_002.ogg',
    'sfx/kenney/impact/Audio/impactSoft_medium_004.ogg'
  ],
  lightImpact:[
    'sfx/kenney/impact/Audio/impactGeneric_light_000.ogg',
    'sfx/kenney/impact/Audio/impactGeneric_light_002.ogg',
    'sfx/kenney/impact/Audio/impactGeneric_light_004.ogg'
  ],
  bellImpact:[
    'sfx/kenney/impact/Audio/impactBell_heavy_000.ogg',
    'sfx/kenney/impact/Audio/impactBell_heavy_002.ogg'
  ],
  footstepSoft:[
    'sfx/kenney/impact/Audio/footstep_carpet_000.ogg',
    'sfx/kenney/impact/Audio/footstep_carpet_001.ogg',
    'sfx/kenney/impact/Audio/footstep_carpet_002.ogg',
    'sfx/kenney/impact/Audio/footstep_carpet_003.ogg',
    'sfx/kenney/impact/Audio/footstep_carpet_004.ogg'
  ],
  cloth:[
    'sfx/kenney/rpg/Audio/cloth1.ogg',
    'sfx/kenney/rpg/Audio/cloth2.ogg',
    'sfx/kenney/rpg/Audio/cloth3.ogg',
    'sfx/kenney/rpg/Audio/cloth4.ogg'
  ],
  page:[
    'sfx/kenney/rpg/Audio/bookFlip1.ogg',
    'sfx/kenney/rpg/Audio/bookFlip2.ogg',
    'sfx/kenney/rpg/Audio/bookFlip3.ogg'
  ],
  metalClick:[
    'sfx/kenney/rpg/Audio/metalClick.ogg',
    'sfx/kenney/rpg/Audio/metalLatch.ogg'
  ],
  computer:[
    'sfx/kenney/scifi/Audio/computerNoise_000.ogg',
    'sfx/kenney/scifi/Audio/computerNoise_001.ogg',
    'sfx/kenney/scifi/Audio/computerNoise_002.ogg'
  ],
  field:[
    'sfx/kenney/scifi/Audio/forceField_000.ogg',
    'sfx/kenney/scifi/Audio/forceField_002.ogg',
    'sfx/kenney/scifi/Audio/forceField_004.ogg'
  ],
  engine:[
    'sfx/kenney/scifi/Audio/engineCircular_000.ogg',
    'sfx/kenney/scifi/Audio/engineCircular_002.ogg'
  ],
  splashish:[
    'sfx/kenney/scifi/Audio/slime_000.ogg',
    'sfx/kenney/scifi/Audio/slime_001.ogg'
  ]
};

class DaiSfxEngine {
  private enabled=true;
  private volume=.72;
  private mode:DaiSfxMode='normal';
  private ready=false;
  private samplesReady=false;
  private lastMotion='';
  private lastAt=0;

  private master:Tone.Gain|null=null;
  private compressor:Tone.Compressor|null=null;
  private limiter:Tone.Limiter|null=null;
  private reverb:Tone.Reverb|null=null;
  private delay:Tone.FeedbackDelay|null=null;
  private eq:Tone.EQ3|null=null;
  private players=new Map<string,Tone.Player>();

  configure(config:{enabled:boolean;volume:number;mode:DaiSfxMode}){
    this.enabled=config.enabled;
    this.volume=Math.max(0,Math.min(1,config.volume));
    this.mode=config.mode;
    this.refreshMaster();
  }

  private asset(path:string){
    return new URL(path,document.baseURI).href;
  }

  private ensureGraph(){
    if(this.master)return;
    this.master=new Tone.Gain(1);
    this.eq=new Tone.EQ3({low:-1.5,mid:.8,high:1.6});
    this.delay=new Tone.FeedbackDelay({delayTime:.095,feedback:.08,wet:.06});
    this.reverb=new Tone.Reverb({decay:.92,preDelay:.010,wet:.14});
    this.compressor=new Tone.Compressor({threshold:-20,ratio:3.2,attack:.006,release:.14});
    this.limiter=new Tone.Limiter(-1.0);
    this.master.chain(
      this.eq,
      this.delay,
      this.reverb,
      this.compressor,
      this.limiter,
      Tone.getDestination()
    );
    this.refreshMaster();
  }

  private ensureSamples(){
    if(this.players.size)return;
    this.ensureGraph();
    const urls=[...new Set(Object.values(SAMPLE_BANK).flat())];
    for(const relative of urls){
      const player=new Tone.Player({
        url:this.asset(relative),
        fadeIn:.003,
        fadeOut:.025,
        autostart:false
      });
      player.connect(this.master!);
      this.players.set(relative,player);
    }
  }

  private refreshMaster(){
    if(!this.master)return;
    const base=this.mode==='silent'||!this.enabled?0:this.mode==='soft'?.72:1;
    this.master.gain.rampTo(base*this.volume,.04);
  }

  async unlock(){
    try{
      this.ensureGraph();
      this.ensureSamples();
      await Tone.start();
      if(!this.samplesReady){
        await Tone.loaded();
        this.samplesReady=true;
      }
      this.ready=Tone.getContext().state==='running';
      return this.ready;
    }catch(error){
      console.warn('DAI SFX sample preload skipped',error);
      this.ready=Tone.getContext().state==='running';
      return this.ready;
    }
  }

  private level(ducked=false){
    if(!this.enabled||this.mode==='silent')return 0;
    const modeGain=this.mode==='soft'?.78:1;
    return Math.max(.01,modeGain*(ducked?.22:1));
  }

  private pick(alias:SampleAlias){
    const files=SAMPLE_BANK[alias];
    return files[Math.floor(Math.random()*files.length)]||files[0];
  }

  private sample(
    alias:SampleAlias,
    velocity:number,
    offset=0,
    options:{rate?:number;pan?:number;wet?:boolean}={}
  ){
    if(!this.samplesReady)return false;
    const relative=this.pick(alias);
    const player=this.players.get(relative);
    if(!player||!player.loaded)return false;

    const rate=Math.max(.82,Math.min(1.18,options.rate??(0.98+Math.random()*.04)));
    const panValue=Math.max(-1,Math.min(1,options.pan??0));
    const gain=new Tone.Gain(Math.max(.015,Math.min(1.15,velocity)));
    const panner=new Tone.Panner(panValue);
    player.playbackRate=rate;
    player.disconnect();
    player.chain(gain,panner,this.master!);

    const at=Tone.now()+.012+Math.max(0,offset);
    player.start(at);

    window.setTimeout(()=>{
      try{player.disconnect();player.connect(this.master!);}catch{}
      try{gain.dispose();}catch{}
      try{panner.dispose();}catch{}
    },Math.round((offset+2.2)*1000));
    return true;
  }

  private tone(note:string,velocity:number,duration=.12,offset=0){
    const synth=new Tone.Synth({
      oscillator:{type:'sine'},
      envelope:{attack:.004,decay:duration*.5,sustain:.02,release:duration*.5}
    });
    const gain=new Tone.Gain(.6);
    synth.chain(gain,this.master!);
    synth.triggerAttackRelease(note,duration,Tone.now()+.012+offset,velocity);
    window.setTimeout(()=>{try{synth.dispose();gain.dispose();}catch{}},Math.round((offset+1)*1000));
  }

  private sweep(fromHz:number,toHz:number,velocity:number,duration=.24,offset=0){
    const synth=new Tone.Synth({
      oscillator:{type:'triangle'},
      envelope:{attack:.004,decay:duration*.55,sustain:.02,release:duration*.35}
    });
    const gain=new Tone.Gain(.55);
    synth.chain(gain,this.master!);
    const at=Tone.now()+.012+offset;
    synth.frequency.setValueAtTime(fromHz,at);
    synth.frequency.exponentialRampToValueAtTime(Math.max(35,toHz),at+duration);
    synth.triggerAttackRelease(duration,at,velocity);
    window.setTimeout(()=>{try{synth.dispose();gain.dispose();}catch{}},Math.round((offset+1)*1000));
  }

  private twoHands(alias:SampleAlias,v:number,spacing=.20,start=0){
    this.sample(alias,.72*v,start,{pan:-.28,rate:.98});
    this.sample(alias,.72*v,start+spacing,{pan:.28,rate:1.02});
  }

  private footsteps(v:number,count=3,spacing=.26,start=0,soft=false){
    for(let i=0;i<count;i++){
      this.sample('footstepSoft',(soft?.42:.62)*v,start+i*spacing,{
        pan:i%2===0?-.18:.18,
        rate:soft?.92+Math.random()*.05:.98+Math.random()*.06
      });
    }
  }

  private typing(v:number,count=7,spacing=.055,start=0){
    for(let i=0;i<count;i++){
      this.sample(i%3===0?'switch':'click',(.24+(i%4)*.035)*v,start+i*spacing,{
        pan:(i%5-2)*.08,
        rate:.96+Math.random()*.08
      });
    }
  }

  private dance(v:number,start=0){
    this.sample('softImpact',.42*v,start,{pan:-.2,rate:.95});
    this.sample('pluck',.30*v,start+.10,{pan:.2,rate:1.04});
    this.sample('softImpact',.38*v,start+.32,{pan:.2,rate:1.02});
    this.sample('pluck',.28*v,start+.44,{pan:-.2,rate:.98});
    this.sample('softImpact',.40*v,start+.64,{pan:-.1,rate:.97});
    this.sample('confirm',.26*v,start+.78,{pan:.1,rate:1.03});
  }

  private fishing(v:number,durationMs=7400){
    const scale=Math.max(.78,Math.min(1.12,durationMs/7400));
    this.sample('cloth',.42*v,0,{pan:-.35,rate:1.02});
    this.sweep(520,210,.18*v,.28,.03);
    this.sample('splashish',.44*v,.82*scale,{pan:.3,rate:1.05});
    this.sample('metalClick',.30*v,2.00*scale,{pan:-.15,rate:1.04});
    this.sample('metalClick',.27*v,2.22*scale,{pan:.15,rate:.98});
    this.sample('metalClick',.24*v,2.44*scale,{pan:-.12,rate:1.07});
    this.sample('splashish',.50*v,4.36*scale,{pan:.25,rate:.96});
    this.sample('confirm',.46*v,4.58*scale,{pan:0,rate:1.05});
  }

  private motionProfile(state:string,v:number,durationMs=2200){
    switch(state){
      case 'wave':
        this.sample('cloth',.40*v,0,{pan:-.25,rate:1.04});
        this.sample('pluck',.30*v,.08,{pan:.2,rate:1.04});
        break;
      case 'double_wave':
        this.twoHands('cloth',v,.14,0);
        this.sample('confirm',.28*v,.20,{rate:1.06});
        break;
      case 'welcome_back':
        this.sample('open',.34*v,0,{rate:1.03});
        this.sample('confirm',.42*v,.10,{rate:1.05});
        break;
      case 'hello_shy':
        this.sample('cloth',.24*v,0,{pan:-.18,rate:.94});
        this.sample('pluck',.23*v,.12,{pan:.12,rate:.96});
        break;
      case 'goodbye':
        this.sample('cloth',.34*v,0,{pan:.25,rate:.98});
        this.sample('close',.25*v,.16,{rate:1.02});
        break;
      case 'bow':
        this.sample('cloth',.38*v,0,{rate:.92});
        this.sample('pluck',.20*v,.24,{rate:.96});
        break;
      case 'salute':
        this.sample('select',.35*v,0,{rate:1.06});
        break;

      case 'listen':
        this.sample('switch',.28*v,0,{rate:1.04});
        this.sample('question',.23*v,.07,{rate:1.03});
        break;
      case 'search':
        this.sample('computer',.22*v,0,{rate:1.05});
        this.sweep(280,900,.18*v,.28,.02);
        this.sample('select',.18*v,.28,{rate:1.08});
        break;
      case 'scan':
        this.sample('field',.28*v,0,{rate:1.04});
        this.sweep(320,1180,.16*v,.34,.01);
        break;
      case 'detect':
        this.sample('computer',.24*v,0,{rate:1.08});
        this.sample('confirm',.35*v,.22,{rate:1.06});
        break;
      case 'found':
        this.sample('confirm',.50*v,0,{rate:1.05});
        this.sample('glass',.16*v,.07,{rate:1.08});
        break;

      case 'heart':
        this.sample('softImpact',.28*v,0,{rate:.88});
        this.sample('softImpact',.24*v,.14,{rate:.94});
        this.sample('glass',.20*v,.24,{rate:1.09});
        break;
      case 'blush':
      case 'shy':
        this.sample('cloth',.20*v,0,{rate:.92});
        this.sample('pluck',.20*v,.12,{rate:.94});
        break;
      case 'happy':
        this.sample('pluck',.36*v,0,{rate:1.06});
        this.sample('confirm',.28*v,.10,{rate:1.04});
        break;
      case 'giggle':
        this.sample('pluck',.30*v,0,{rate:1.10});
        this.sample('pluck',.25*v,.13,{rate:1.15});
        break;
      case 'laugh':
        this.sample('pluck',.36*v,0,{rate:1.08});
        this.sample('pluck',.31*v,.12,{rate:1.13});
        this.sample('confirm',.22*v,.25,{rate:1.10});
        break;
      case 'excited':
      case 'cheer':
        this.sample('confirm',.40*v,0,{rate:1.10});
        this.sample('softImpact',.26*v,.13,{rate:1.04});
        this.sample('glass',.18*v,.21,{rate:1.12});
        break;
      case 'proud':
        this.sample('bellImpact',.25*v,0,{rate:1.10});
        this.sample('confirm',.28*v,.12,{rate:.98});
        break;
      case 'celebrate':
        this.dance(v,0);
        this.sample('glass',.18*v,.22,{rate:1.12});
        break;
      case 'party':
        this.dance(v,0);
        this.dance(.82*v,.72);
        break;
      case 'clap':
        this.sample('softImpact',.54*v,0,{pan:-.12,rate:1.04});
        this.sample('softImpact',.58*v,.24,{pan:.12,rate:.98});
        this.sample('softImpact',.52*v,.48,{pan:-.08,rate:1.06});
        break;
      case 'high_five':
        this.sample('softImpact',.72*v,.16,{rate:1.05});
        this.sample('confirm',.24*v,.23,{rate:1.08});
        break;

      case 'idea':
        this.sample('select',.24*v,0,{rate:1.08});
        this.sample('glass',.34*v,.06,{rate:1.13});
        this.sample('confirm',.24*v,.14,{rate:1.10});
        break;
      case 'lightbulb_pop':
        this.sample('lightImpact',.28*v,0,{rate:1.08});
        this.sample('glass',.38*v,.045,{rate:1.14});
        break;
      case 'brainstorm':
        this.sample('computer',.18*v,0,{rate:1.07});
        this.sample('select',.18*v,.22,{rate:1.04});
        this.sample('glass',.17*v,.44,{rate:1.10});
        break;
      case 'thought_orbit':
        this.sample('field',.20*v,0,{rate:.96});
        this.sample('pluck',.18*v,.18,{rate:1.05});
        break;
      case 'thinking_deep':
        this.sample('computer',.16*v,0,{rate:.90});
        this.tone('D4',.09*v,.30,.10);
        break;
      case 'question':
        this.sample('question',.38*v,0,{rate:1.04});
        break;
      case 'curious':
      case 'peek':
      case 'window_peek':
      case 'look_around':
      case 'scout':
        this.sample('question',.22*v,0,{rate:1.08});
        this.sample('cloth',.12*v,.08,{rate:.98});
        break;

      case 'stretch':
      case 'side_stretch':
        this.sample('cloth',.42*v,0,{rate:.88});
        this.sample('cloth',.25*v,.23,{rate:.94});
        break;
      case 'relax':
      case 'cozy_sway':
        this.sample('cloth',.18*v,0,{rate:.84});
        this.tone('D4',.08*v,.38,.05);
        break;
      case 'sleep':
        this.sample('cloth',.15*v,0,{rate:.82});
        this.tone('C5',.07*v,.42,.12);
        break;
      case 'yawn':
        this.sample('cloth',.16*v,0,{rate:.80});
        this.sweep(270,150,.08*v,.52,.03);
        break;
      case 'dream':
        this.sample('glass',.12*v,0,{rate:.88});
        this.sample('pluck',.13*v,.28,{rate:.92});
        break;
      case 'meditate':
      case 'breathe':
        this.sample('cloth',.10*v,0,{rate:.82});
        this.tone('D4',.06*v,.44,.10);
        break;
      case 'recharge':
        this.sample('field',.20*v,0,{rate:.88});
        this.sample('confirm',.19*v,.38,{rate:1.02});
        break;
      case 'wake_up':
        this.sample('open',.31*v,0,{rate:1.08});
        this.sample('confirm',.29*v,.18,{rate:1.09});
        break;

      case 'dance':
      case 'music_groove':
      case 'music_nod':
        this.dance(v,0);
        this.sample('cloth',.14*v,.18,{rate:1.02});
        break;
      case 'spin':
        this.sample('cloth',.38*v,0,{pan:-.35,rate:1.10});
        this.sample('field',.15*v,.08,{pan:.35,rate:1.16});
        break;
      case 'bounce':
      case 'hop_left':
      case 'hop_right':
        this.sample('softImpact',.40*v,0,{rate:.92});
        this.sample('footstepSoft',.42*v,.22,{rate:1.06});
        break;
      case 'roam_walk':
        this.footsteps(v,4,.24,0,false);
        break;
      case 'tip_toe':
      case 'sneak':
        this.footsteps(v,3,.28,0,true);
        this.sample('cloth',.11*v,.10,{rate:.90});
        break;
      case 'sway':
        this.sample('cloth',.15*v,0,{pan:-.25,rate:.92});
        this.sample('cloth',.14*v,.34,{pan:.25,rate:.95});
        break;

      case 'fishing':
        this.fishing(v,durationMs);
        break;

      case 'read':
        this.sample('page',.40*v,.04,{pan:-.15,rate:.98});
        this.sample('page',.32*v,.62,{pan:.12,rate:1.02});
        break;
      case 'write':
        this.typing(.78*v,5,.085,0);
        break;
      case 'type_fast':
        this.typing(.82*v,11,.043,0);
        break;
      case 'code_focus':
        this.typing(.68*v,8,.050,0);
        this.sample('computer',.10*v,.12,{rate:1.04});
        break;
      case 'working':
        this.typing(.35*v,4,.10,0);
        break;
      case 'loading':
        this.sample('tick',.0*v,0);
        this.sample('switch',.18*v,0,{rate:.98});
        this.sample('switch',.16*v,.18,{rate:1.02});
        this.sample('switch',.15*v,.36,{rate:1.05});
        break;
      case 'wait_patient':
        this.sample('tick',.0*v,0);
        this.sample('click',.14*v,0,{rate:.94});
        this.sample('click',.12*v,.48,{rate:.96});
        break;
      case 'impatient':
        this.sample('click',.28*v,0,{rate:1.08});
        this.sample('click',.31*v,.12,{rate:1.12});
        this.sample('click',.34*v,.24,{rate:1.15});
        break;

      case 'camera_pose':
        this.sample('click',.42*v,.30,{rate:.92});
        this.sample('metalClick',.28*v,.34,{rate:1.06});
        this.sample('confirm',.16*v,.42,{rate:1.10});
        break;
      case 'pose_star':
        this.sample('glass',.34*v,0,{rate:1.12});
        this.sample('confirm',.26*v,.10,{rate:1.06});
        break;
      case 'victory':
        this.sample('bellImpact',.28*v,0,{rate:1.06});
        this.sample('confirm',.40*v,.10,{rate:1.08});
        break;
      case 'peace':
        this.sample('pluck',.25*v,0,{rate:1.04});
        break;
      case 'approve':
      case 'nod_yes':
      case 'success':
      case 'response_ready':
        this.sample('confirm',.42*v,0,{rate:1.04});
        break;

      case 'wow':
        this.sample('open',.30*v,0,{rate:1.12});
        this.sample('glass',.22*v,.12,{rate:1.14});
        break;
      case 'surprise_soft':
        this.sample('question',.20*v,0,{rate:1.12});
        this.sample('lightImpact',.16*v,.08,{rate:1.10});
        break;
      case 'startled':
        this.sample('lightImpact',.44*v,0,{rate:1.10});
        this.sample('glitch',.18*v,.03,{rate:1.08});
        break;
      case 'alert':
        this.sample('switch',.30*v,0,{rate:1.12});
        this.sample('switch',.28*v,.14,{rate:1.16});
        break;
      case 'error':
        this.sample('error',.46*v,0,{rate:.98});
        break;
      case 'shake_no':
        this.sample('close',.30*v,0,{rate:.96});
        this.sample('error',.18*v,.10,{rate:1.02});
        break;
      case 'confused':
        this.sample('question',.24*v,0,{rate:.95});
        this.sample('glitch',.12*v,.16,{rate:.92});
        break;

      // Keep speech-related loops almost silent so SFX never fight the voice.
      case 'talk':
      case 'focus':
      case 'voicewait':
      case 'idle':
        break;

      default:
        this.sample('select',.14*v,0,{rate:1.02});
        break;
    }
  }

  playMotion(state:string,options:PlayOptions={}){
    if(!this.ready||!this.enabled||this.mode==='silent')return false;
    const now=performance.now();
    if(state===this.lastMotion&&now-this.lastAt<220)return false;
    this.lastMotion=state;
    this.lastAt=now;
    const v=this.level(Boolean(options.ducked));
    if(v<=0)return false;
    this.motionProfile(state,v,options.durationMs||2200);
    return true;
  }

  preview(){
    if(!this.ready)return false;
    this.motionProfile('fishing',this.level(false),5200);
    return true;
  }
}

export const daiSfx=new DaiSfxEngine();
