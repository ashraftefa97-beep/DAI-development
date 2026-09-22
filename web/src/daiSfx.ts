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
  private ctx:AudioContext|null=null;
  private enabled=true;
  private volume=.34;
  private mode:DaiSfxMode='soft';
  private lastKey='';
  private lastAt=0;

  configure(config:{enabled:boolean;volume:number;mode:DaiSfxMode}){
    this.enabled=config.enabled;
    this.volume=Math.max(0,Math.min(1,config.volume));
    this.mode=config.mode;
  }

  private ensure(){
    if(this.ctx)return this.ctx;
    const Ctor=window.AudioContext||(window as any).webkitAudioContext;
    if(!Ctor)return null;
    this.ctx=new Ctor() as AudioContext;
    return this.ctx;
  }

  async unlock(){
    const ctx=this.ensure();
    if(!ctx)return false;
    try{
      if(ctx.state==='suspended')await ctx.resume();
      if(ctx.state==='running'){
        const osc=ctx.createOscillator();
        const gain=ctx.createGain();
        gain.gain.value=0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime+.01);
      }
      return ctx.state==='running';
    }catch{
      return false;
    }
  }

  private level(ducked=false){
    if(!this.enabled||this.mode==='silent')return 0;
    const modeGain=this.mode==='soft'?.55:1;
    return this.volume*modeGain*(ducked?.22:1);
  }

  private tone(freq:number,start:number,duration:number,gainValue:number,type:OscillatorType='sine',endFreq?:number){
    const ctx=this.ensure();
    if(!ctx||gainValue<=0)return;
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(freq,start);
    if(endFreq)osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),start+duration);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,gainValue),start+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start+duration+.02);
  }

  private noise(start:number,duration:number,gainValue:number,cutoffA=1400,cutoffB=520){
    const ctx=this.ensure();
    if(!ctx||gainValue<=0)return;
    const length=Math.max(1,Math.floor(ctx.sampleRate*duration));
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const source=ctx.createBufferSource();
    const filter=ctx.createBiquadFilter();
    const gain=ctx.createGain();
    source.buffer=buffer;
    filter.type='lowpass';
    filter.frequency.setValueAtTime(cutoffA,start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80,cutoffB),start+duration);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,gainValue),start+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
  }

  play(key:SfxKey,options:PlayOptions={}){
    const ctx=this.ensure();
    if(!ctx||ctx.state!=='running')return false;
    const now=ctx.currentTime+.006;
    const amp=this.level(Boolean(options.ducked));
    if(amp<=0)return false;

    const stamp=performance.now();
    if(key===this.lastKey&&stamp-this.lastAt<180)return false;
    this.lastKey=key;
    this.lastAt=stamp;

    switch(key){
      case 'hello':
        this.tone(520,now,.13,amp*.13,'sine',690);
        this.tone(780,now+.10,.16,amp*.10,'sine',920);
        break;
      case 'sparkle':
        this.tone(900,now,.09,amp*.09,'sine',1160);
        this.tone(1280,now+.07,.10,amp*.075,'sine',1540);
        this.tone(1760,now+.14,.13,amp*.055,'sine',2050);
        break;
      case 'search':
        this.tone(330,now,.28,amp*.07,'triangle',790);
        this.tone(870,now+.19,.10,amp*.055,'sine',1120);
        break;
      case 'celebrate':
        this.tone(590,now,.09,amp*.10,'sine',760);
        this.tone(820,now+.075,.11,amp*.09,'sine',1060);
        this.tone(1180,now+.16,.14,amp*.075,'sine',1460);
        break;
      case 'heart':
        this.tone(440,now,.16,amp*.07,'sine',510);
        this.tone(660,now+.055,.22,amp*.06,'sine',760);
        break;
      case 'sleepy':
        this.noise(now,.36,amp*.045,1000,230);
        this.tone(310,now,.34,amp*.035,'sine',190);
        break;
      case 'error':
        this.tone(410,now,.12,amp*.065,'sine',350);
        this.tone(300,now+.10,.16,amp*.055,'sine',260);
        break;
      case 'listen':
        this.tone(470,now,.10,amp*.07,'sine',620);
        this.tone(710,now+.08,.11,amp*.055,'sine',760);
        break;
      case 'success':
        this.tone(523,now,.10,amp*.085,'sine',560);
        this.tone(659,now+.07,.12,amp*.075,'sine',700);
        this.tone(784,now+.14,.16,amp*.065,'sine',840);
        break;
      case 'movement':
        this.noise(now,.18,amp*.035,1500,520);
        this.tone(240,now,.16,amp*.035,'triangle',340);
        break;
      case 'curious':
        this.tone(560,now,.08,amp*.06,'sine',690);
        this.tone(810,now+.11,.10,amp*.052,'sine',760);
        break;
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
