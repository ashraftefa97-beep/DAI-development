import { Howl, Howler } from 'howler';

export type DaiSfxMode = 'soft' | 'normal' | 'silent';
export type DaiSonicState =
  | 'idle'
  | 'wake'
  | 'attention'
  | 'listening'
  | 'thinking'
  | 'searching'
  | 'working'
  | 'preparing'
  | 'action'
  | 'responding'
  | 'complete'
  | 'error'
  | 'speaking';

export type DaiMotionAudioEvent = {
  cue:string;
  volume?:number;
  rate?:number;
  pan?:number;
};

type Cue =
  | 'swish'
  | 'fabric'
  | 'step'
  | 'key'
  | 'page'
  | 'water'
  | 'mech'
  | 'ratchet'
  | 'breath'
  | 'clap'
  | 'click'
  | 'bell'
  | 'glass'
  | 'computer';

const asset=(name:string)=>new URL('./sfx/foley/'+name,document.baseURI).href;

const CUE_FILES:Record<Cue,string[]>={
  swish:[
    asset('gentle-swish.wav'),
    asset('swish-classic.wav'),
    asset('swish-short.wav')
  ],
  fabric:[
    asset('fabric-soft.wav'),
    asset('fabric-2.wav')
  ],
  step:[
    asset('footstep-1.ogg'),
    asset('footstep-2.ogg')
  ],
  key:[
    asset('key-1.wav'),
    asset('key-2.wav')
  ],
  page:[asset('page-turn.wav')],
  water:[asset('water-plop.ogg')],
  mech:[asset('mech-click.wav')],
  ratchet:[asset('ratchet.wav')],
  breath:[asset('breath.ogg')],
  clap:[asset('clap.wav')],
  click:[
    asset('gentle-click.wav'),
    asset('mech-click.wav')
  ],
  bell:[asset('bell-soft.ogg')],
  glass:[asset('glass-tap.ogg')],
  computer:[asset('computer-texture.ogg')]
};

const BED_PROFILE:Partial<Record<DaiSonicState,{gain:number;rate:number}>>={
  thinking:{gain:.040,rate:.93},
  searching:{gain:.052,rate:1.00},
  working:{gain:.047,rate:1.05},
  preparing:{gain:.026,rate:.96},
  responding:{gain:.018,rate:1.00}
};

class DaiSfxEngine {
  private enabled=true;
  private volume=.84;
  private mode:DaiSfxMode='normal';
  private unlocked=false;
  private ducked=false;
  private active:Array<{howl:Howl;id:number}>=[];
  private lastVariant=new Map<Cue,number>();
  private previewTimers:number[]=[];
  private stateTimers:number[]=[];
  private lastMotionAt=new Map<Cue,number>();
  private lastSonicState:DaiSonicState='idle';
  private lastSonicAt=0;

  private ambience=new Howl({
    src:[asset('computer-texture.ogg')],
    preload:true,
    html5:false,
    loop:true,
    volume:0
  });
  private ambienceId:number|null=null;
  private ambienceState:DaiSonicState='idle';

  private bank:Record<Cue,Howl[]>=Object.fromEntries(
    (Object.entries(CUE_FILES) as Array<[Cue,string[]]>).map(([cue,urls])=>[
      cue,
      urls.map(url=>new Howl({
        src:[url],
        preload:true,
        html5:false,
        volume:1
      }))
    ])
  ) as Record<Cue,Howl[]>;

  configure(config:{enabled:boolean;volume:number;mode:DaiSfxMode}){
    this.enabled=config.enabled;
    this.volume=Math.max(0,Math.min(1,config.volume));
    this.mode=config.mode;
    if(!this.enabled||this.mode==='silent'){
      this.stopAll();
      return;
    }
    this.refreshAmbience(160);
  }

  setDucked(value:boolean){
    if(this.ducked===value)return;
    this.ducked=value;
    this.refreshAmbience(value?90:180);
  }

  async unlock(){
    try{
      if(Howler.ctx?.state==='suspended')await Howler.ctx.resume();
      this.unlocked=true;
      this.refreshAmbience(120);
      return true;
    }catch{
      this.unlocked=false;
      return false;
    }
  }

  private modeGain(){
    if(!this.enabled||this.mode==='silent')return 0;
    return this.mode==='soft'?.68:1;
  }

  private baseGain(){
    return Math.max(0,Math.min(1,this.volume*this.modeGain()*(this.ducked?.20:1)));
  }

  private ambienceGain(state=this.ambienceState){
    const profile=BED_PROFILE[state];
    if(!profile||!this.enabled||this.mode==='silent'||!this.unlocked)return 0;
    const duck=this.ducked?.08:1;
    return Math.max(0,Math.min(.11,this.volume*this.modeGain()*profile.gain*duck));
  }

  private refreshAmbience(fadeMs=220){
    const profile=BED_PROFILE[this.ambienceState];
    const target=this.ambienceGain();

    if(!profile||target<=.0005){
      if(this.ambienceId!==null){
        const id=this.ambienceId;
        try{
          const current=Number(this.ambience.volume(id))||0;
          this.ambience.fade(current,0,fadeMs,id);
          window.setTimeout(()=>{
            if(this.ambienceId===id&&this.ambienceGain()<=.0005){
              try{this.ambience.stop(id);}catch{}
              if(this.ambienceId===id)this.ambienceId=null;
            }
          },fadeMs+25);
        }catch{
          try{this.ambience.stop(id);}catch{}
          this.ambienceId=null;
        }
      }
      return;
    }

    try{
      if(this.ambienceId===null||!this.ambience.playing(this.ambienceId)){
        const id=this.ambience.play();
        this.ambienceId=id;
        this.ambience.volume(0,id);
      }
      const id=this.ambienceId;
      if(id===null)return;
      this.ambience.rate(profile.rate,id);
      const current=Number(this.ambience.volume(id))||0;
      this.ambience.fade(current,target,fadeMs,id);
    }catch(error){
      console.debug('DAI ambience skipped',error);
    }
  }

  setScene(next:DaiSonicState,options:{cue?:boolean}={}){
    this.ambienceState=next;
    this.refreshAmbience(next==='speaking'?80:next==='idle'?260:180);
    if(options.cue===false){
      this.lastSonicState=next;
      this.lastSonicAt=performance.now();
      return false;
    }
    return this.playState(next);
  }

  private choose(cue:Cue){
    const variants=this.bank[cue];
    if(!variants?.length)return null;
    if(variants.length===1)return variants[0];

    const previous=this.lastVariant.get(cue)??-1;
    let index=Math.floor(Math.random()*variants.length);
    if(index===previous)index=(index+1)%variants.length;
    this.lastVariant.set(cue,index);
    return variants[index];
  }

  private motionEventGain(cue:Cue){
    if(this.lastSonicState==='speaking')return 0;
    if(['thinking','searching','working','preparing'].includes(this.lastSonicState)){
      if(['computer','click','glass','mech'].includes(cue))return .58;
      return .76;
    }
    if(this.lastSonicState==='responding')return .68;
    return 1;
  }

  private startEvent(event:DaiMotionAudioEvent,source:'motion'|'semantic'='motion'){
    if(!this.unlocked||!this.enabled||this.mode==='silent')return null;
    if(!(event.cue in this.bank))return null;

    const cue=event.cue as Cue;
    if(source==='motion'){
      const now=performance.now();
      const previous=this.lastMotionAt.get(cue)||0;
      if(now-previous<145)return null;
      this.lastMotionAt.set(cue,now);
    }

    const howl=this.choose(cue);
    if(!howl)return null;

    try{
      const id=howl.play();
      const sourceGain=source==='semantic'?1:this.motionEventGain(cue);
      const volume=Math.max(0,Math.min(1,this.baseGain()*(event.volume??1)*sourceGain));
      if(volume<=.001){
        howl.stop(id);
        return null;
      }
      howl.volume(volume,id);
      howl.rate(Math.max(.76,Math.min(1.20,event.rate??1)),id);
      if(typeof howl.stereo==='function')howl.stereo(Math.max(-1,Math.min(1,event.pan??0)),id);
      this.active.push({howl,id});
      howl.once('end',()=>{
        this.active=this.active.filter(item=>!(item.howl===howl&&item.id===id));
      },id);
      return {howl,id};
    }catch(error){
      console.debug('DAI Foley cue skipped',cue,error);
      return null;
    }
  }

  playEvent(event:DaiMotionAudioEvent){
    return Boolean(this.startEvent(event,'motion'));
  }

  private transient(event:DaiMotionAudioEvent,maxMs=0){
    const started=this.startEvent(event,'semantic');
    if(!started||maxMs<=0)return Boolean(started);
    const timer=window.setTimeout(()=>{
      this.stateTimers=this.stateTimers.filter(value=>value!==timer);
      try{
        started.howl.fade(started.howl.volume(started.id) as number,0,70,started.id);
        window.setTimeout(()=>{ try{started.howl.stop(started.id);}catch{} },75);
      }catch{
        try{started.howl.stop(started.id);}catch{}
      }
    },maxMs);
    this.stateTimers.push(timer);
    return true;
  }

  playState(next:DaiSonicState){
    if(!this.unlocked||!this.enabled||this.mode==='silent'){
      this.lastSonicState=next;
      return false;
    }
    const now=performance.now();
    if(next===this.lastSonicState&&now-this.lastSonicAt<520)return false;
    this.lastSonicState=next;
    this.lastSonicAt=now;

    switch(next){
      case 'wake':
        this.transient({cue:'swish',volume:.18,rate:.98,pan:-.06},210);
        this.stateTimers.push(window.setTimeout(()=>this.transient({cue:'glass',volume:.16,rate:1.04},240),90));
        return true;
      case 'attention':
        return this.transient({cue:'click',volume:.18,rate:1.03},170);
      case 'listening':
        this.transient({cue:'click',volume:.20,rate:.98,pan:-.04},170);
        this.stateTimers.push(window.setTimeout(()=>this.transient({cue:'glass',volume:.10,rate:1.02,pan:.04},190),85));
        return true;
      case 'thinking':
        return this.transient({cue:'computer',volume:.075,rate:.95},220);
      case 'searching':
        this.transient({cue:'swish',volume:.11,rate:1.05,pan:-.05},180);
        this.stateTimers.push(window.setTimeout(()=>this.transient({cue:'computer',volume:.07,rate:1.02},230),105));
        return true;
      case 'working':
        return this.transient({cue:'click',volume:.15,rate:1.06},150);
      case 'preparing':
        return this.transient({cue:'glass',volume:.11,rate:.98},180);
      case 'action':
        return this.transient({cue:'click',volume:.16,rate:1.06},150);
      case 'responding':
        return this.transient({cue:'glass',volume:.13,rate:1.00},190);
      case 'complete':
        return this.transient({cue:'bell',volume:.22,rate:1.03},360);
      case 'error':
        this.transient({cue:'mech',volume:.16,rate:.82},190);
        this.stateTimers.push(window.setTimeout(()=>this.transient({cue:'click',volume:.08,rate:.78},150),115));
        return true;
      case 'speaking':
      case 'idle':
      default:
        return false;
    }
  }

  stopAll(){
    for(const timer of this.previewTimers)window.clearTimeout(timer);
    for(const timer of this.stateTimers)window.clearTimeout(timer);
    this.previewTimers=[];
    this.stateTimers=[];
    for(const item of this.active){
      try{item.howl.stop(item.id);}catch{}
    }
    this.active=[];
    if(this.ambienceId!==null){
      try{this.ambience.stop(this.ambienceId);}catch{}
      this.ambienceId=null;
    }
  }

  preview(){
    if(!this.unlocked)return false;
    this.stopAll();
    const sequence:Array<[number,DaiMotionAudioEvent]>=[
      [0,{cue:'swish',volume:.40,pan:-.12}],
      [360,{cue:'water',volume:.25,pan:.08}],
      [760,{cue:'ratchet',volume:.16}],
      [930,{cue:'ratchet',volume:.14,rate:1.03}],
      [1120,{cue:'glass',volume:.18,rate:.99}]
    ];
    for(const [delay,event] of sequence){
      this.previewTimers.push(window.setTimeout(()=>this.playEvent(event),delay));
    }
    return true;
  }
}

export const daiSfx=new DaiSfxEngine();
