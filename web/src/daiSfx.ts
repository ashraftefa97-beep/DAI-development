import { Howl, Howler } from 'howler';
import { gsap } from 'gsap';

export type DaiSfxMode = 'soft' | 'normal' | 'silent';

type PlayOptions = {
  ducked?: boolean;
  durationMs?: number;
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

type Marker = {
  at:number;
  cue:Cue;
  volume?:number;
  rate?:number;
  pan?:number;
};

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

function m(at:number,cue:Cue,volume=1,rate=1,pan=0):Marker{
  return {at,cue,volume,rate,pan};
}

function alternating(cue:Cue,count:number,start:number,end:number,volume=.4,rate=1):Marker[]{
  const out:Marker[]=[];
  const span=Math.max(.001,end-start);
  for(let i=0;i<count;i++){
    const at=count===1?start:start+(span*i/(count-1));
    out.push(m(at,cue,volume,rate,i%2===0?-.10:.10));
  }
  return out;
}

/*
 * DAI sound rule:
 * - Physical motion gets real Foley.
 * - Digital state changes get one restrained cue.
 * - Facial/emotional expressions stay silent unless the animation contains a physical action.
 */
const BASE_PROFILES:Record<string,Marker[]>={
  wave:[
    m(.08,'swish',.62,1.00,-.18),
    m(.24,'fabric',.22,.98,.10)
  ],
  double_wave:[
    m(.06,'swish',.54,1.03,-.24),
    m(.23,'swish',.52,.97,.24),
    m(.37,'fabric',.20,.98,0)
  ],
  welcome_back:[
    m(.07,'swish',.48,1.00,-.10),
    m(.29,'bell',.18,1.02,0)
  ],
  hello_shy:[
    m(.10,'fabric',.26,.94,-.08)
  ],
  goodbye:[
    m(.08,'swish',.48,.97,.18),
    m(.34,'fabric',.18,.95,-.06)
  ],
  bow:[
    m(.10,'fabric',.42,.93,0),
    m(.43,'swish',.22,.91,0)
  ],
  salute:[
    m(.14,'mech',.28,1.01,0)
  ],

  listen:[
    m(.10,'click',.16,1.02,0)
  ],
  found:[
    m(.16,'bell',.28,1.04,0)
  ],
  detect:[
    m(.16,'click',.14,1.04,-.04),
    m(.42,'bell',.20,1.04,.04)
  ],

  heart:[
    m(.15,'fabric',.14,.94,0)
  ],
  excited:[
    m(.08,'swish',.34,1.04,-.10),
    m(.44,'clap',.28,1.02,.08)
  ],
  cheer:[
    m(.08,'swish',.30,1.03,-.08),
    m(.40,'clap',.30,1.00,.08)
  ],
  proud:[
    m(.18,'bell',.16,.96,0)
  ],
  celebrate:[
    m(.12,'clap',.34,1.01,-.08),
    m(.38,'clap',.36,.98,.08),
    m(.66,'clap',.32,1.03,-.05),
    m(.82,'bell',.18,1.04,0)
  ],
  party:[
    m(.07,'swish',.30,1.03,-.14),
    m(.26,'step',.28,1.00,-.10),
    m(.46,'step',.28,.98,.10),
    m(.66,'clap',.30,1.00,0),
    m(.82,'swish',.24,1.02,.12)
  ],
  clap:[
    m(.18,'clap',.48,1.00,-.08),
    m(.47,'clap',.52,.97,.08),
    m(.74,'clap',.48,1.03,-.04)
  ],
  high_five:[
    m(.42,'clap',.58,1.02,0)
  ],

  idea:[
    m(.14,'glass',.24,1.02,0),
    m(.30,'bell',.14,1.06,.04)
  ],
  lightbulb_pop:[
    m(.16,'glass',.28,1.08,0)
  ],
  brainstorm:[
    m(.14,'glass',.15,.98,-.08),
    m(.46,'glass',.16,1.04,.08)
  ],

  stretch:[
    m(.09,'fabric',.48,.94,0),
    m(.48,'swish',.24,.91,0)
  ],
  side_stretch:[
    m(.09,'fabric',.46,.95,-.08),
    m(.48,'swish',.22,.92,.08)
  ],
  relax:[
    m(.14,'breath',.22,.96,0),
    m(.55,'fabric',.12,.94,0)
  ],
  cozy_sway:[
    m(.12,'fabric',.18,.95,-.08),
    m(.58,'fabric',.16,.98,.08)
  ],
  sleep:[
    m(.12,'breath',.30,.96,0),
    m(.58,'breath',.24,.92,0)
  ],
  yawn:[
    m(.14,'breath',.32,.88,0),
    m(.52,'fabric',.14,.93,0)
  ],
  dream:[
    m(.18,'breath',.16,.92,0)
  ],
  meditate:[
    m(.12,'breath',.22,.92,0),
    m(.62,'breath',.20,.89,0)
  ],
  breathe:[
    m(.10,'breath',.24,.94,0),
    m(.58,'breath',.22,.90,0)
  ],
  recharge:[
    m(.10,'computer',.10,.96,0),
    m(.80,'bell',.14,1.00,0)
  ],
  wake_up:[
    m(.12,'breath',.18,1.02,0),
    m(.30,'fabric',.22,1.00,0)
  ],

  dance:[
    m(.08,'step',.30,1.00,-.12),
    m(.30,'step',.30,.98,.12),
    m(.52,'swish',.26,1.02,-.10),
    m(.76,'step',.28,1.01,.10)
  ],
  music_groove:[
    m(.10,'step',.25,1.00,-.10),
    m(.38,'fabric',.18,.98,.10),
    m(.68,'step',.24,1.01,.10)
  ],
  music_nod:[
    m(.18,'fabric',.12,.98,0),
    m(.60,'fabric',.11,1.00,0)
  ],
  spin:[
    m(.08,'swish',.62,1.07,-.24),
    m(.43,'swish',.44,1.01,.22),
    m(.76,'fabric',.18,.96,0)
  ],
  bounce:[
    m(.14,'swish',.24,1.03,0),
    m(.59,'step',.44,1.00,0)
  ],
  hop_left:[
    m(.13,'swish',.22,1.02,-.14),
    m(.61,'step',.42,1.00,-.10)
  ],
  hop_right:[
    m(.13,'swish',.22,1.02,.14),
    m(.61,'step',.42,1.00,.10)
  ],
  roam_walk:[
    ...alternating('step',4,.10,.82,.34,1.00)
  ],
  tip_toe:[
    ...alternating('step',3,.15,.76,.18,.90)
  ],
  sneak:[
    ...alternating('step',3,.15,.76,.16,.88)
  ],
  sway:[
    m(.13,'fabric',.16,.93,-.16),
    m(.57,'fabric',.15,.97,.16)
  ],

  fishing:[
    m(.05,'swish',.62,1.02,-.18),
    m(.15,'water',.46,1.00,.14),
    m(.34,'ratchet',.30,1.02,-.06),
    m(.40,'ratchet',.27,.98,.06),
    m(.46,'ratchet',.25,1.04,-.04),
    m(.70,'water',.42,.96,.12)
  ],

  read:[
    m(.16,'page',.38,.98,0)
  ],
  camera_pose:[
    m(.48,'mech',.50,1.00,0)
  ],
  pose_star:[
    m(.18,'glass',.18,1.05,0)
  ],
  victory:[
    m(.16,'bell',.30,1.04,0)
  ],
  peace:[
    m(.14,'fabric',.10,.98,0)
  ],
  approve:[
    m(.28,'bell',.20,1.03,0)
  ],
  nod_yes:[
    m(.26,'click',.12,1.00,0)
  ],
  success:[
    m(.18,'bell',.28,1.04,0)
  ],
  response_ready:[
    m(.14,'bell',.18,1.02,0)
  ],

  wow:[
    m(.14,'swish',.16,1.04,0)
  ],
  surprise_soft:[
    m(.16,'fabric',.14,1.02,0)
  ],
  startled:[
    m(.10,'swish',.28,1.08,0),
    m(.34,'step',.22,1.02,0)
  ],
  alert:[
    m(.14,'click',.18,1.04,0),
    m(.34,'click',.15,.96,0)
  ],
  error:[
    m(.16,'mech',.18,.82,0),
    m(.34,'click',.12,.76,0)
  ],
  shake_no:[
    m(.16,'fabric',.12,.94,-.08),
    m(.42,'fabric',.11,.97,.08)
  ]
};

function dynamicProfile(state:string,_durationMs:number):Marker[]{
  if(state==='search'||state==='scan'){
    return [
      m(.04,'computer',.12,state==='scan'?1.03:.98,0),
      m(.84,'click',.12,1.04,0)
    ];
  }

  if(state==='write'||state==='working'){
    const count=state==='write'?6:4;
    return alternating('key',count,.08,.72,.30,state==='write'?1.02:.98);
  }

  if(state==='type_fast'||state==='code_focus'){
    const count=state==='type_fast'?11:8;
    const out=alternating('key',count,.05,.76,.26,state==='type_fast'?1.06:1.01);
    if(state==='code_focus')out.push(m(.86,'click',.11,1.02,0));
    return out;
  }

  if(state==='loading'){
    return [
      m(.06,'computer',.08,.94,0),
      m(.84,'click',.10,1.00,0)
    ];
  }

  if(state==='wait_patient'){
    return [
      m(.20,'click',.08,.92,0),
      m(.68,'click',.07,.94,0)
    ];
  }

  if(state==='impatient'){
    return [
      m(.12,'click',.16,1.04,-.06),
      m(.28,'click',.16,1.00,.06),
      m(.45,'click',.15,.96,0)
    ];
  }

  return BASE_PROFILES[state]||[];
}

class DaiSfxEngine {
  private enabled=true;
  private volume=.84;
  private mode:DaiSfxMode='normal';
  private unlocked=false;
  private timeline:gsap.core.Timeline|null=null;
  private active:Array<{howl:Howl;id:number}>=[];
  private lastVariant=new Map<Cue,number>();

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

  private baseGain(ducked:boolean){
    if(!this.enabled||this.mode==='silent')return 0;
    const modeGain=this.mode==='soft'?.68:1;
    return Math.max(0,Math.min(1,this.volume*modeGain*(ducked?.22:1)));
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

  private playCue(marker:Marker,ducked:boolean){
    if(!this.unlocked||!this.enabled||this.mode==='silent')return;
    const howl=this.choose(marker.cue);
    if(!howl)return;

    try{
      const id=howl.play();
      const volume=Math.max(0,Math.min(1,this.baseGain(ducked)*(marker.volume??1)));
      howl.volume(volume,id);
      howl.rate(Math.max(.76,Math.min(1.20,marker.rate??1)),id);
      if(typeof howl.stereo==='function')howl.stereo(Math.max(-1,Math.min(1,marker.pan??0)),id);
      this.active.push({howl,id});
    }catch(error){
      console.debug('DAI Foley cue skipped',marker.cue,error);
    }
  }

  playMotion(state:string,options:PlayOptions={}){
    if(!this.unlocked||!this.enabled||this.mode==='silent')return false;
    this.stopAll();

    const durationMs=Math.max(450,options.durationMs||2200);
    const durationSec=durationMs/1000;
    const markers=dynamicProfile(state,durationMs);
    if(!markers.length)return false;

    const tl=gsap.timeline({paused:true});
    for(const marker of markers){
      const at=Math.max(0,Math.min(.98,marker.at))*durationSec;
      tl.call(()=>this.playCue(marker,Boolean(options.ducked)),[],at);
    }

    tl.call(()=>{},[],durationSec);
    this.timeline=tl;
    tl.play(0);
    return true;
  }

  stopAll(){
    if(this.timeline){
      try{this.timeline.kill();}catch{}
      this.timeline=null;
    }
    for(const item of this.active){
      try{item.howl.stop(item.id);}catch{}
    }
    this.active=[];
  }

  preview(){
    return this.playMotion('fishing',{durationMs:5200,ducked:false});
  }
}

export const daiSfx=new DaiSfxEngine();
