import { Howl, Howler } from 'howler';
import { gsap } from 'gsap';

import scifiScanningUrl from 'uisfx/sounds/scifi/scanning.ogg?url';
import scifiCheckpointUrl from 'uisfx/sounds/scifi/checkpoint.ogg?url';
import scifiInfoUrl from 'uisfx/sounds/scifi/info.ogg?url';
import scifiWarningUrl from 'uisfx/sounds/scifi/warning.ogg?url';
import glassSuccessUrl from 'uisfx/sounds/glass/success.ogg?url';
import glassCompleteUrl from 'uisfx/sounds/glass/complete.ogg?url';
import glassBonusUrl from 'uisfx/sounds/glass/bonus.ogg?url';
import glassReceiveUrl from 'uisfx/sounds/glass/receive.ogg?url';
import glassSnapUrl from 'uisfx/sounds/glass/snap.ogg?url';
import softReactionUrl from 'uisfx/sounds/soft/reaction.ogg?url';
import softReceiveUrl from 'uisfx/sounds/soft/receive.ogg?url';
import softBlockedUrl from 'uisfx/sounds/soft/blocked.ogg?url';
import organicSwipeUrl from 'uisfx/sounds/organic/swipe.ogg?url';
import organicDropUrl from 'uisfx/sounds/organic/drop.ogg?url';
import rubberDragUrl from 'uisfx/sounds/rubber/drag-start.ogg?url';
import rubberDropUrl from 'uisfx/sounds/rubber/drop.ogg?url';
import mechanicalTypingUrl from 'uisfx/sounds/mechanical/typing.ogg?url';
import mechanicalPressUrl from 'uisfx/sounds/mechanical/press.ogg?url';
import studioSnapUrl from 'uisfx/sounds/studio/snap.ogg?url';
import zenSleepUrl from 'uisfx/sounds/zen/sleep.ogg?url';
import zenWakeUrl from 'uisfx/sounds/zen/wake.ogg?url';
import dreamyRewardUrl from 'uisfx/sounds/dreamy/reward.ogg?url';
import dreamyInfoUrl from 'uisfx/sounds/dreamy/info.ogg?url';
import cinematicAchievementUrl from 'uisfx/sounds/cinematic/achievement.ogg?url';
import cinematicWarningUrl from 'uisfx/sounds/cinematic/warning.ogg?url';
import cinematicErrorUrl from 'uisfx/sounds/cinematic/error.ogg?url';
import arcadePlayUrl from 'uisfx/sounds/arcade/play.ogg?url';
import arcadeStepUrl from 'uisfx/sounds/arcade/progress-step.ogg?url';
import arcadeRewardUrl from 'uisfx/sounds/arcade/reward.ogg?url';

const foleyAsset=(name:string)=>new URL('./sfx/foley/'+name,document.baseURI).href;
const foleySwishUrl=foleyAsset('gentle-swish.wav');
const foleyFabricUrl=foleyAsset('fabric-soft.wav');
const foleyStep1Url=foleyAsset('footstep-1.ogg');
const foleyStep2Url=foleyAsset('footstep-2.ogg');
const foleyKey1Url=foleyAsset('key-1.wav');
const foleyKey2Url=foleyAsset('key-2.wav');
const foleyPageUrl=foleyAsset('page-turn.wav');
const foleyWaterUrl=foleyAsset('water-plop.ogg');
const foleyMechClickUrl=foleyAsset('mech-click.wav');
const foleyRatchetUrl=foleyAsset('ratchet.wav');
const foleyBreathUrl=foleyAsset('breath.ogg');
const foleyClapUrl=foleyAsset('clap.wav');

export type DaiSfxMode = 'soft' | 'normal' | 'silent';

type PlayOptions = {
  ducked?: boolean;
  durationMs?: number;
};

type Cue =
  | 'scan'
  | 'checkpoint'
  | 'info'
  | 'warning'
  | 'success'
  | 'complete'
  | 'bonus'
  | 'receive'
  | 'snap'
  | 'reaction'
  | 'softReceive'
  | 'blocked'
  | 'swipe'
  | 'drop'
  | 'rubberLift'
  | 'rubberDrop'
  | 'typing'
  | 'press'
  | 'camera'
  | 'sleep'
  | 'wake'
  | 'dreamReward'
  | 'dreamInfo'
  | 'achievement'
  | 'cinWarning'
  | 'error'
  | 'play'
  | 'beat'
  | 'reward'
  | 'foleySwish'
  | 'foleyFabric'
  | 'foleyStep1'
  | 'foleyStep2'
  | 'foleyKey1'
  | 'foleyKey2'
  | 'foleyPage'
  | 'foleyWater'
  | 'foleyMechClick'
  | 'foleyRatchet'
  | 'foleyBreath'
  | 'foleyClap';

type Marker = {
  at:number;
  cue:Cue;
  volume?:number;
  rate?:number;
  pan?:number;
  seek?:number;
};

const CUE_URLS:Record<Cue,string>={
  scan:scifiScanningUrl,
  checkpoint:scifiCheckpointUrl,
  info:scifiInfoUrl,
  warning:scifiWarningUrl,
  success:glassSuccessUrl,
  complete:glassCompleteUrl,
  bonus:glassBonusUrl,
  receive:glassReceiveUrl,
  snap:glassSnapUrl,
  reaction:softReactionUrl,
  softReceive:softReceiveUrl,
  blocked:softBlockedUrl,
  swipe:organicSwipeUrl,
  drop:organicDropUrl,
  rubberLift:rubberDragUrl,
  rubberDrop:rubberDropUrl,
  typing:mechanicalTypingUrl,
  press:mechanicalPressUrl,
  camera:studioSnapUrl,
  sleep:zenSleepUrl,
  wake:zenWakeUrl,
  dreamReward:dreamyRewardUrl,
  dreamInfo:dreamyInfoUrl,
  achievement:cinematicAchievementUrl,
  cinWarning:cinematicWarningUrl,
  error:cinematicErrorUrl,
  play:arcadePlayUrl,
  beat:arcadeStepUrl,
  reward:arcadeRewardUrl,
  foleySwish:foleySwishUrl,
  foleyFabric:foleyFabricUrl,
  foleyStep1:foleyStep1Url,
  foleyStep2:foleyStep2Url,
  foleyKey1:foleyKey1Url,
  foleyKey2:foleyKey2Url,
  foleyPage:foleyPageUrl,
  foleyWater:foleyWaterUrl,
  foleyMechClick:foleyMechClickUrl,
  foleyRatchet:foleyRatchetUrl,
  foleyBreath:foleyBreathUrl,
  foleyClap:foleyClapUrl
};

function marker(at:number,cue:Cue,volume=1,rate=1,pan=0):Marker{
  return {at,cue,volume,rate,pan};
}

function repeatCue(cue:Cue,count:number,start:number,end:number,volume=.62,rate=1){
  const out:Marker[]=[];
  const span=Math.max(.001,end-start);
  for(let i=0;i<count;i++){
    const p=count===1?start:start+(span*i/(count-1));
    out.push(marker(p,cue,volume,rate,(i%2===0?-.12:.12)));
  }
  return out;
}

const BASE_PROFILES:Record<string,Marker[]>={
  wave:[
    marker(.08,'foleySwish',.72,1.00,-.18),
    marker(.24,'foleyFabric',.34,.98,.12)
  ],
  double_wave:[
    marker(.06,'foleySwish',.60,1.03,-.26),
    marker(.22,'foleySwish',.56,.96,.26),
    marker(.34,'foleyFabric',.30,1.00,0)
  ],
  welcome_back:[
    marker(.04,'receive',.55,1.01,0),
    marker(.23,'dreamReward',.44,1.04,.10)
  ],
  hello_shy:[
    marker(.08,'foleySwish',.38,.92,-.16),
    marker(.28,'foleyFabric',.26,.96,.12)
  ],
  goodbye:[
    marker(.07,'foleySwish',.52,.96,.20),
    marker(.34,'foleyFabric',.24,.94,-.08)
  ],
  bow:[
    marker(.10,'foleyFabric',.48,.92,0),
    marker(.40,'foleySwish',.28,.90,0)
  ],
  salute:[
    marker(.10,'snap',.46,1.04,0),
    marker(.24,'success',.26,1.06,0)
  ],

  listen:[
    marker(.08,'info',.44,1.03,0),
    marker(.24,'checkpoint',.26,1.04,0)
  ],
  found:[
    marker(.05,'complete',.64,1.04,0),
    marker(.20,'dreamReward',.36,1.08,.08)
  ],
  detect:[
    marker(.08,'checkpoint',.44,1.06,-.05),
    marker(.38,'complete',.48,1.03,.05)
  ],

  heart:[
    marker(.08,'reaction',.48,.90,-.08),
    marker(.25,'reaction',.42,.96,.08),
    marker(.46,'dreamReward',.35,1.08,0)
  ],
  blush:[
    marker(.08,'reaction',.28,.90,-.08),
    marker(.33,'dreamInfo',.26,.96,.10)
  ],
  shy:[
    marker(.08,'reaction',.26,.88,-.10),
    marker(.30,'dreamInfo',.24,.94,.10)
  ],
  happy:[
    marker(.06,'success',.48,1.07,0),
    marker(.26,'reaction',.34,1.04,.08)
  ],
  giggle:[
    marker(.08,'reaction',.38,1.10,-.12),
    marker(.26,'reaction',.34,1.15,.12)
  ],
  laugh:[
    marker(.07,'reaction',.42,1.08,-.15),
    marker(.21,'reaction',.38,1.14,.15),
    marker(.43,'success',.28,1.08,0)
  ],
  excited:[
    marker(.05,'reward',.48,1.08,0),
    marker(.24,'beat',.42,1.04,-.12),
    marker(.44,'success',.32,1.08,.12)
  ],
  cheer:[
    marker(.05,'reward',.46,1.08,0),
    marker(.24,'beat',.40,1.04,-.10),
    marker(.45,'success',.32,1.08,.10)
  ],
  proud:[
    marker(.12,'achievement',.52,1.02,0)
  ],
  celebrate:[
    marker(.04,'achievement',.54,1.02,0),
    marker(.25,'reward',.46,1.06,-.10),
    marker(.48,'beat',.38,1.02,.10),
    marker(.72,'complete',.38,1.06,0)
  ],
  clap:[
    marker(.18,'foleyClap',.78,1.00,-.08),
    marker(.47,'foleyClap',.82,.97,.08),
    marker(.74,'foleyClap',.76,1.03,-.04)
  ],
  high_five:[
    marker(.38,'rubberDrop',.78,1.02,0),
    marker(.51,'success',.34,1.08,0)
  ],

  idea:[
    marker(.08,'bonus',.54,1.08,-.04),
    marker(.24,'dreamReward',.42,1.12,.06)
  ],
  lightbulb_pop:[
    marker(.10,'snap',.42,1.08,0),
    marker(.19,'bonus',.58,1.14,0)
  ],
  brainstorm:[
    marker(.07,'checkpoint',.30,1.04,-.15),
    marker(.31,'checkpoint',.32,1.08,.15),
    marker(.61,'dreamReward',.34,1.10,0)
  ],
  thought_orbit:[
    marker(.08,'dreamInfo',.32,.96,-.15),
    marker(.35,'dreamInfo',.30,1.04,.15),
    marker(.66,'checkpoint',.26,1.06,0)
  ],
  thinking_deep:[
    marker(.10,'info',.28,.90,0),
    marker(.58,'checkpoint',.24,.96,0)
  ],
  question:[
    marker(.12,'info',.36,1.02,-.06),
    marker(.42,'receive',.34,1.10,.06)
  ],
  curious:[
    marker(.12,'info',.30,1.07,0)
  ],
  peek:[
    marker(.10,'info',.28,1.08,-.20)
  ],
  window_peek:[
    marker(.11,'info',.28,1.06,.20)
  ],
  look_around:[
    marker(.10,'info',.24,1.02,-.20),
    marker(.54,'info',.22,1.06,.20)
  ],
  scout:[
    marker(.08,'scan',.30,1.05,-.10),
    marker(.62,'checkpoint',.25,1.08,.10)
  ],

  stretch:[
    marker(.08,'foleyFabric',.58,.92,0),
    marker(.46,'foleySwish',.30,.90,0)
  ],
  side_stretch:[
    marker(.08,'foleyFabric',.56,.93,-.10),
    marker(.46,'foleySwish',.28,.91,.10)
  ],
  relax:[
    marker(.08,'foleyBreath',.28,.94,0),
    marker(.46,'foleyFabric',.18,.92,0)
  ],
  cozy_sway:[
    marker(.10,'foleyFabric',.22,.94,-.10),
    marker(.55,'foleyFabric',.20,.97,.10)
  ],
  sleep:[
    marker(.10,'foleyBreath',.44,.96,0),
    marker(.56,'foleyBreath',.34,.92,0)
  ],
  yawn:[
    marker(.10,'foleyBreath',.42,.86,0),
    marker(.48,'foleyFabric',.18,.92,0)
  ],
  dream:[
    marker(.08,'dreamInfo',.30,.90,-.08),
    marker(.43,'dreamReward',.22,.94,.08)
  ],
  meditate:[
    marker(.08,'foleyBreath',.28,.92,0),
    marker(.61,'foleyBreath',.24,.88,0)
  ],
  breathe:[
    marker(.08,'foleyBreath',.30,.94,0),
    marker(.55,'foleyBreath',.26,.90,0)
  ],
  recharge:[
    marker(.06,'scan',.26,.88,0),
    marker(.70,'complete',.34,1.03,0)
  ],
  wake_up:[
    marker(.08,'wake',.48,1.03,0),
    marker(.26,'receive',.30,1.08,0)
  ],

  dance:[
    marker(.04,'play',.46,1.00,0),
    marker(.24,'beat',.42,1.04,-.14),
    marker(.48,'beat',.42,.98,.14),
    marker(.72,'reward',.36,1.06,0)
  ],
  music_groove:[
    marker(.04,'play',.44,1.00,0),
    marker(.28,'beat',.38,1.03,-.12),
    marker(.56,'beat',.38,.98,.12),
    marker(.80,'reward',.32,1.04,0)
  ],
  music_nod:[
    marker(.05,'play',.34,1.00,0),
    marker(.34,'beat',.30,1.02,-.10),
    marker(.67,'beat',.30,.98,.10)
  ],
  spin:[
    marker(.08,'foleySwish',.68,1.08,-.28),
    marker(.42,'foleySwish',.52,1.02,.24),
    marker(.76,'foleyFabric',.28,.96,0)
  ],
  bounce:[
    marker(.12,'foleySwish',.34,1.04,0),
    marker(.58,'foleyStep1',.62,1.00,0)
  ],
  hop_left:[
    marker(.10,'foleySwish',.30,1.02,-.18),
    marker(.60,'foleyStep1',.58,1.00,-.12)
  ],
  hop_right:[
    marker(.10,'foleySwish',.30,1.02,.18),
    marker(.60,'foleyStep2',.58,1.00,.12)
  ],
  roam_walk:[
    marker(.10,'foleyStep1',.44,1.00,-.12),
    marker(.32,'foleyStep2',.42,.98,.12),
    marker(.56,'foleyStep1',.43,1.02,-.12),
    marker(.80,'foleyStep2',.41,1.00,.12)
  ],
  tip_toe:[
    marker(.14,'foleyStep1',.24,.90,-.10),
    marker(.44,'foleyStep2',.22,.88,.10),
    marker(.74,'foleyStep1',.23,.92,-.08)
  ],
  sneak:[
    marker(.14,'foleyStep1',.22,.88,-.10),
    marker(.44,'foleyStep2',.20,.87,.10),
    marker(.74,'foleyStep1',.21,.90,-.08)
  ],
  sway:[
    marker(.12,'foleyFabric',.22,.92,-.18),
    marker(.56,'foleyFabric',.20,.96,.18)
  ],

  fishing:[
    marker(.05,'foleySwish',.70,1.02,-.22),
    marker(.15,'foleyWater',.58,1.00,.18),
    marker(.34,'foleyRatchet',.36,1.02,-.08),
    marker(.40,'foleyRatchet',.32,.98,.08),
    marker(.46,'foleyRatchet',.30,1.04,-.05),
    marker(.70,'foleyWater',.52,.96,.16),
    marker(.80,'complete',.28,1.04,0)
  ],

  read:[
    marker(.14,'foleyPage',.46,.98,0)
  ],
  camera_pose:[
    marker(.48,'foleyMechClick',.72,1.00,0)
  ],
  pose_star:[
    marker(.12,'bonus',.48,1.12,0),
    marker(.34,'achievement',.30,1.03,0)
  ],
  victory:[
    marker(.08,'achievement',.56,1.03,0),
    marker(.30,'complete',.38,1.08,0)
  ],
  peace:[
    marker(.10,'reaction',.28,1.02,0),
    marker(.34,'dreamInfo',.22,1.04,0)
  ],
  approve:[
    marker(.28,'success',.50,1.04,0)
  ],
  nod_yes:[
    marker(.24,'success',.42,1.04,0)
  ],
  success:[
    marker(.10,'success',.56,1.05,0),
    marker(.34,'complete',.32,1.08,0)
  ],
  response_ready:[
    marker(.08,'receive',.38,1.03,0),
    marker(.24,'success',.46,1.06,0)
  ],

  wow:[
    marker(.08,'achievement',.34,1.08,0),
    marker(.26,'bonus',.34,1.14,0)
  ],
  surprise_soft:[
    marker(.12,'receive',.30,1.12,0)
  ],
  startled:[
    marker(.08,'cinWarning',.46,1.08,0),
    marker(.24,'rubberDrop',.32,1.08,0)
  ],
  alert:[
    marker(.10,'warning',.46,1.08,0)
  ],
  error:[
    marker(.10,'error',.58,1.00,0)
  ],
  shake_no:[
    marker(.14,'blocked',.42,.96,0),
    marker(.42,'blocked',.32,1.02,0)
  ],
  confused:[
    marker(.10,'info',.28,.96,-.08),
    marker(.36,'warning',.26,.92,.08)
  ]
};

function dynamicProfile(state:string,durationMs:number):Marker[]{
  if(state==='search'||state==='scan'){
    const count=Math.max(2,Math.min(6,Math.round(durationMs/520)));
    return [
      ...repeatCue('scan',count,.05,.74,.28,1.02),
      marker(.86,'checkpoint',.34,1.08,0)
    ];
  }

  if(state==='write'||state==='working'){
    const count=state==='write'?6:4;
    const out:Marker[]=[];
    for(let i=0;i<count;i++){
      const at=.08+(.64*i/Math.max(1,count-1));
      out.push(marker(at,i%2===0?'foleyKey1':'foleyKey2',.42,state==='write'?1.02:.98,i%2===0?-.10:.10));
    }
    return out;
  }

  if(state==='type_fast'||state==='code_focus'){
    const count=state==='type_fast'?12:9;
    const out:Marker[]=[];
    for(let i=0;i<count;i++){
      const at=.05+(.71*i/Math.max(1,count-1));
      out.push(marker(at,i%2===0?'foleyKey1':'foleyKey2',.36,state==='type_fast'?1.08:1.02,i%2===0?-.10:.10));
    }
    if(state==='code_focus')out.push(marker(.86,'checkpoint',.22,1.04,0));
    return out;
  }

  if(state==='loading'){
    return [
      ...repeatCue('scan',4,.08,.72,.22,.96),
      marker(.86,'checkpoint',.26,1.04,0)
    ];
  }

  if(state==='wait_patient'){
    return [
      marker(.18,'press',.18,.92,0),
      marker(.66,'press',.16,.94,0)
    ];
  }

  if(state==='impatient'){
    return repeatCue('press',3,.10,.46,.34,1.08);
  }

  if(state==='party'){
    return [
      marker(.03,'play',.48,1.00,0),
      ...repeatCue('beat',5,.16,.70,.38,1.03),
      marker(.84,'achievement',.38,1.04,0)
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

  private bank:Record<Cue,Howl>=Object.fromEntries(
    (Object.entries(CUE_URLS) as Array<[Cue,string]>).map(([cue,url])=>[
      cue,
      new Howl({
        src:[url],
        preload:true,
        html5:false,
        volume:1
      })
    ])
  ) as Record<Cue,Howl>;

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
    return Math.max(0,Math.min(1,this.volume*modeGain*(ducked?.24:1)));
  }

  private playCue(m:Marker,ducked:boolean){
    if(!this.unlocked||!this.enabled||this.mode==='silent')return;
    const howl=this.bank[m.cue];
    if(!howl)return;
    try{
      const id=howl.play();
      const volume=Math.max(0,Math.min(1.15,this.baseGain(ducked)*(m.volume??1)));
      howl.volume(volume,id);
      howl.rate(Math.max(.75,Math.min(1.25,m.rate??1)),id);
      if(typeof howl.stereo==='function')howl.stereo(Math.max(-1,Math.min(1,m.pan??0)),id);
      if(typeof m.seek==='number')howl.seek(Math.max(0,m.seek),id);
      this.active.push({howl,id});
    }catch(error){
      console.debug('DAI SFX cue skipped',m.cue,error);
    }
  }

  playMotion(state:string,options:PlayOptions={}){
    if(!this.unlocked||!this.enabled||this.mode==='silent')return false;
    this.stopAll();

    const durationMs=Math.max(450,options.durationMs||2200);
    const durationSec=durationMs/1000;
    const markers=dynamicProfile(state,durationMs);
    if(!markers.length)return false;

    const tl=gsap.timeline({
      paused:true,
      defaults:{overwrite:true}
    });

    for(const m of markers){
      const at=Math.max(0,Math.min(.98,m.at))*durationSec;
      tl.call(()=>this.playCue(m,Boolean(options.ducked)),[],at);
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
