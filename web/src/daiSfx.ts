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
  | 'reward';

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
  reward:arcadeRewardUrl
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
    marker(.06,'swipe',.62,1.04,-.22),
    marker(.22,'softReceive',.48,1.03,.16)
  ],
  double_wave:[
    marker(.05,'swipe',.56,1.06,-.28),
    marker(.18,'swipe',.54,.98,.28),
    marker(.34,'receive',.40,1.04,0)
  ],
  welcome_back:[
    marker(.04,'receive',.55,1.01,0),
    marker(.23,'dreamReward',.44,1.04,.10)
  ],
  hello_shy:[
    marker(.07,'swipe',.36,.94,-.18),
    marker(.26,'dreamInfo',.32,1.02,.15)
  ],
  goodbye:[
    marker(.06,'swipe',.48,.98,.22),
    marker(.34,'softReceive',.32,.94,-.08)
  ],
  bow:[
    marker(.09,'swipe',.56,.90,0),
    marker(.42,'reaction',.28,.98,0)
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
    marker(.18,'drop',.62,1.04,-.12),
    marker(.47,'drop',.66,.98,.12),
    marker(.74,'drop',.60,1.06,-.06)
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
    marker(.08,'swipe',.50,.88,0),
    marker(.46,'softReceive',.24,.94,0)
  ],
  side_stretch:[
    marker(.08,'swipe',.48,.90,-.12),
    marker(.46,'softReceive',.22,.94,.12)
  ],
  relax:[
    marker(.08,'sleep',.30,.92,0),
    marker(.46,'dreamInfo',.18,.90,0)
  ],
  cozy_sway:[
    marker(.10,'sleep',.24,.94,-.10),
    marker(.55,'dreamInfo',.18,.96,.10)
  ],
  sleep:[
    marker(.08,'sleep',.42,.88,0),
    marker(.52,'dreamInfo',.18,.90,0)
  ],
  yawn:[
    marker(.10,'sleep',.34,.82,0),
    marker(.46,'softReceive',.18,.88,0)
  ],
  dream:[
    marker(.08,'dreamInfo',.30,.90,-.08),
    marker(.43,'dreamReward',.22,.94,.08)
  ],
  meditate:[
    marker(.08,'sleep',.22,.88,0),
    marker(.61,'dreamInfo',.16,.90,0)
  ],
  breathe:[
    marker(.08,'sleep',.20,.86,0),
    marker(.55,'softReceive',.16,.90,0)
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
    marker(.08,'swipe',.52,1.10,-.26),
    marker(.48,'scan',.30,1.12,.22),
    marker(.76,'snap',.36,1.08,0)
  ],
  bounce:[
    marker(.12,'rubberLift',.48,.98,0),
    marker(.58,'rubberDrop',.62,1.04,0)
  ],
  hop_left:[
    marker(.10,'rubberLift',.46,.98,-.18),
    marker(.60,'rubberDrop',.58,1.05,-.12)
  ],
  hop_right:[
    marker(.10,'rubberLift',.46,.98,.18),
    marker(.60,'rubberDrop',.58,1.05,.12)
  ],
  roam_walk:[
    ...repeatCue('drop',4,.08,.82,.28,1.02)
  ],
  tip_toe:[
    ...repeatCue('drop',3,.12,.76,.20,.92)
  ],
  sneak:[
    ...repeatCue('drop',3,.12,.76,.18,.90)
  ],
  sway:[
    marker(.12,'swipe',.24,.92,-.18),
    marker(.56,'swipe',.22,.96,.18)
  ],

  fishing:[
    marker(.05,'swipe',.56,1.04,-.22),
    marker(.15,'drop',.36,.94,.22),
    marker(.34,'press',.28,1.03,-.08),
    marker(.40,'press',.26,.98,.08),
    marker(.46,'press',.25,1.06,-.05),
    marker(.70,'drop',.46,.96,.18),
    marker(.78,'complete',.48,1.06,0)
  ],

  read:[
    marker(.10,'softReceive',.28,.94,-.10),
    marker(.58,'softReceive',.26,.98,.10)
  ],
  camera_pose:[
    marker(.48,'camera',.72,.98,0),
    marker(.62,'bonus',.28,1.10,0)
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
    return repeatCue('typing',count,.08,.72,.28,1+(state==='write'?.03:0));
  }

  if(state==='type_fast'||state==='code_focus'){
    const count=state==='type_fast'?12:9;
    const markers=repeatCue('typing',count,.05,.76,.25,state==='type_fast'?1.08:1.02);
    if(state==='code_focus')markers.push(marker(.86,'checkpoint',.28,1.06,0));
    return markers;
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
