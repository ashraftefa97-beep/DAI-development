import { Howl, Howler } from 'howler';

export type DaiSfxMode = 'soft' | 'normal' | 'silent';

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

class DaiSfxEngine {
  private enabled=true;
  private volume=.84;
  private mode:DaiSfxMode='normal';
  private unlocked=false;
  private ducked=false;
  private active:Array<{howl:Howl;id:number}>=[];
  private lastVariant=new Map<Cue,number>();
  private previewTimers:number[]=[];

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
    if(!this.enabled||this.mode==='silent')this.stopAll();
  }

  setDucked(value:boolean){
    this.ducked=value;
  }

  async unlock(){
    try{
      if(Howler.ctx?.state==='suspended')await Howler.ctx.resume();
      this.unlocked=true;
      return true;
    }catch{
      this.unlocked=false;
      return false;
    }
  }

  private baseGain(){
    if(!this.enabled||this.mode==='silent')return 0;
    const modeGain=this.mode==='soft'?.68:1;
    return Math.max(0,Math.min(1,this.volume*modeGain*(this.ducked?.22:1)));
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

  playEvent(event:DaiMotionAudioEvent){
    if(!this.unlocked||!this.enabled||this.mode==='silent')return false;
    if(!(event.cue in this.bank))return false;

    const cue=event.cue as Cue;
    const howl=this.choose(cue);
    if(!howl)return false;

    try{
      const id=howl.play();
      const volume=Math.max(0,Math.min(1,this.baseGain()*(event.volume??1)));
      howl.volume(volume,id);
      howl.rate(Math.max(.76,Math.min(1.20,event.rate??1)),id);
      if(typeof howl.stereo==='function')howl.stereo(Math.max(-1,Math.min(1,event.pan??0)),id);
      this.active.push({howl,id});
      howl.once('end',()=>{
        this.active=this.active.filter(item=>!(item.howl===howl&&item.id===id));
      },id);
      return true;
    }catch(error){
      console.debug('DAI Foley cue skipped',cue,error);
      return false;
    }
  }

  stopAll(){
    for(const timer of this.previewTimers)window.clearTimeout(timer);
    this.previewTimers=[];
    for(const item of this.active){
      try{item.howl.stop(item.id);}catch{}
    }
    this.active=[];
  }

  preview(){
    if(!this.unlocked)return false;
    this.stopAll();
    const sequence:Array<[number,DaiMotionAudioEvent]>=[
      [0,{cue:'swish',volume:.58,pan:-.12}],
      [420,{cue:'water',volume:.40,pan:.08}],
      [900,{cue:'ratchet',volume:.25}],
      [1080,{cue:'ratchet',volume:.23,rate:1.03}],
      [1280,{cue:'water',volume:.30,rate:.98}]
    ];
    for(const [delay,event] of sequence){
      this.previewTimers.push(window.setTimeout(()=>this.playEvent(event),delay));
    }
    return true;
  }
}

export const daiSfx=new DaiSfxEngine();
