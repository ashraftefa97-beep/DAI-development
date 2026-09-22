import * as Tone from 'tone';

export type DaiSfxMode = 'soft' | 'normal' | 'silent';

type SfxKey =
  | 'hello'
  | 'sparkle'
  | 'search'
  | 'celebrate'
  | 'heart'
  | 'sleepy'
  | 'error'
  | 'listen'
  | 'success'
  | 'movement'
  | 'curious';

type PlayOptions = { ducked?: boolean };

const MOTION_SFX:Record<string,SfxKey>={
  wave:'hello',double_wave:'hello',welcome_back:'hello',hello_shy:'hello',goodbye:'hello',bow:'hello',salute:'hello',
  idea:'sparkle',lightbulb_pop:'sparkle',brainstorm:'sparkle',thought_orbit:'sparkle',
  search:'search',scan:'search',detect:'search',scout:'search',
  celebrate:'celebrate',party:'celebrate',cheer:'celebrate',clap:'celebrate',excited:'celebrate',happy:'celebrate',laugh:'celebrate',giggle:'celebrate',proud:'celebrate',camera_pose:'celebrate',pose_star:'celebrate',
  heart:'heart',blush:'heart',shy:'heart',peace:'heart',
  sleep:'sleepy',yawn:'sleepy',dream:'sleepy',relax:'sleepy',meditate:'sleepy',breathe:'sleepy',recharge:'sleepy',
  error:'error',alert:'error',shake_no:'error',startled:'error',confused:'error',
  listen:'listen',
  found:'success',approve:'success',success:'success',victory:'success',high_five:'success',nod_yes:'success',
  stretch:'movement',side_stretch:'movement',roam_walk:'movement',bounce:'movement',hop_left:'movement',hop_right:'movement',spin:'movement',sway:'movement',cozy_sway:'movement',dance:'movement',music_groove:'movement',music_nod:'movement',fishing:'movement',tip_toe:'movement',sneak:'movement',
  curious:'curious',question:'curious',look_around:'curious',peek:'curious',window_peek:'curious',surprise_soft:'curious',wow:'curious'
};

class DaiSfxEngine {
  private enabled=true;
  private volume=.72;
  private mode:DaiSfxMode='normal';
  private ready=false;
  private lastKey='';
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
    this.compressor=new Tone.Compressor({
      threshold:-18,
      ratio:3.5,
      attack:.008,
      release:.16
    });
    this.limiter=new Tone.Limiter(-1.2);
    this.reverb=new Tone.Reverb({decay:1.25,preDelay:.015,wet:.26});
    this.delay=new Tone.FeedbackDelay({delayTime:.11,feedback:.12,wet:.12});
    this.bright=new Tone.Filter({frequency:5200,type:'lowpass',rolloff:-12});

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
    const base=this.mode==='silent'||!this.enabled?0:this.mode==='soft'?.72:1;
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

  private gain(ducked=false){
    if(!this.enabled||this.mode==='silent')return 0;
    const modeGain=this.mode==='soft'?.78:1;
    return Math.max(.01,modeGain*(ducked?.26:1));
  }

  private connect<T extends Tone.ToneAudioNode>(node:T,gain:number){
    this.ensureGraph();
    const local=new Tone.Gain(gain);
    node.connect(local);
    local.connect(this.master!);
    return local;
  }

  private cleanup(nodes:Array<{dispose:()=>unknown}>,delay=1600){
    window.setTimeout(()=>{
      for(const node of nodes){
        try{node.dispose();}catch{}
      }
    },delay);
  }

  private bell(notes:string[],velocity:number,spacing=.085,release=.22){
    const synth=new Tone.PolySynth(Tone.Synth,{
      oscillator:{type:'sine'},
      envelope:{attack:.006,decay:.10,sustain:.06,release}
    });
    const gain=this.connect(synth,1);
    const now=Tone.now()+.015;
    notes.forEach((note,index)=>{
      synth.triggerAttackRelease(note,.12,now+index*spacing,velocity);
    });
    this.cleanup([synth,gain],1200);
  }

  private pluck(notes:string[],velocity:number,spacing=.075){
    const synth=new Tone.PluckSynth({
      attackNoise:.7,
      dampening:3600,
      resonance:.88
    });
    const gain=this.connect(synth,.9*Math.max(.12,Math.min(1,velocity)));
    const now=Tone.now()+.015;
    notes.forEach((note,index)=>synth.triggerAttack(note,now+index*spacing));
    this.cleanup([synth,gain],1100);
  }

  private softNoise(velocity:number,duration=.18,filterFreq=1700){
    const filter=new Tone.Filter(filterFreq,'lowpass');
    const noise=new Tone.NoiseSynth({
      noise:{type:'pink'},
      envelope:{attack:.008,decay:duration*.55,sustain:.02,release:duration*.45}
    });
    const gain=this.connect(filter,.72);
    noise.connect(filter);
    noise.triggerAttackRelease(duration,Tone.now()+.01,velocity);
    this.cleanup([noise,filter,gain],1000);
  }

  play(key:SfxKey,options:PlayOptions={}){
    if(!this.ready||!this.enabled||this.mode==='silent')return false;

    const stamp=performance.now();
    if(key===this.lastKey&&stamp-this.lastAt<220)return false;
    this.lastKey=key;
    this.lastAt=stamp;

    const v=this.gain(Boolean(options.ducked));
    if(v<=0)return false;

    switch(key){
      case 'hello': {
        this.bell(['E5','A5'],.72*v,.105,.24);
        break;
      }
      case 'sparkle': {
        this.bell(['A5','C6','E6'],.74*v,.06,.34);
        this.softNoise(.10*v,.13,4200);
        break;
      }
      case 'search': {
        const synth=new Tone.Synth({
          oscillator:{type:'triangle'},
          envelope:{attack:.008,decay:.08,sustain:.04,release:.18}
        });
        const gain=this.connect(synth,.92);
        const now=Tone.now()+.01;
        synth.frequency.setValueAtTime(280,now);
        synth.frequency.exponentialRampToValueAtTime(820,now+.24);
        synth.triggerAttackRelease(.28,now,.60*v);
        this.bell(['B5'],.48*v,.08,.20);
        this.cleanup([synth,gain],1000);
        break;
      }
      case 'celebrate': {
        this.pluck(['C5','E5','G5','C6'],.72*v,.055);
        this.bell(['G5','C6'],.54*v,.065,.22);
        break;
      }
      case 'heart': {
        const synth=new Tone.MembraneSynth({
          pitchDecay:.025,
          octaves:2,
          envelope:{attack:.003,decay:.09,sustain:0,release:.12}
        });
        const gain=this.connect(synth,.78);
        const now=Tone.now()+.01;
        synth.triggerAttackRelease('C3','.09',now,.42*v);
        synth.triggerAttackRelease('E3','.10',now+.12,.34*v);
        this.bell(['A5'],.34*v,.06,.28);
        this.cleanup([synth,gain],900);
        break;
      }
      case 'sleepy': {
        this.softNoise(.18*v,.48,760);
        const synth=new Tone.Synth({
          oscillator:{type:'sine'},
          envelope:{attack:.06,decay:.20,sustain:.02,release:.34}
        });
        const gain=this.connect(synth,.65);
        synth.triggerAttackRelease('D4','.42',Tone.now()+.01,.28*v);
        this.cleanup([synth,gain],1200);
        break;
      }
      case 'error': {
        const synth=new Tone.DuoSynth({
          harmonicity:1.45,
          vibratoAmount:.08,
          voice0:{oscillator:{type:'sine'},envelope:{attack:.006,decay:.08,sustain:0,release:.12}},
          voice1:{oscillator:{type:'triangle'},envelope:{attack:.006,decay:.08,sustain:0,release:.12}}
        });
        const gain=this.connect(synth,.62);
        const now=Tone.now()+.01;
        synth.triggerAttackRelease('F4','.10',now,.46*v);
        synth.triggerAttackRelease('D4','.12',now+.11,.40*v);
        this.cleanup([synth,gain],900);
        break;
      }
      case 'listen': {
        this.bell(['D5','A5'],.50*v,.065,.18);
        this.softNoise(.07*v,.10,3200);
        break;
      }
      case 'success': {
        this.pluck(['C5','G5','C6'],.68*v,.07);
        this.bell(['E5','G5','C6'],.54*v,.055,.24);
        break;
      }
      case 'movement': {
        this.softNoise(.13*v,.18,2100);
        const synth=new Tone.Synth({
          oscillator:{type:'sine'},
          envelope:{attack:.004,decay:.07,sustain:0,release:.11}
        });
        const gain=this.connect(synth,.52);
        synth.triggerAttackRelease('G4','.11',Tone.now()+.015,.32*v);
        this.cleanup([synth,gain],800);
        break;
      }
      case 'curious': {
        this.pluck(['E5','B5'],.48*v,.14);
        break;
      }
    }
    return true;
  }

  playMotion(state:string,options:PlayOptions={}){
    const key=MOTION_SFX[state];
    if(!key)return false;
    return this.play(key,options);
  }

  preview(){
    return this.play('success');
  }
}

export const daiSfx=new DaiSfxEngine();
