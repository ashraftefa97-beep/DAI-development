const sin=Math.sin, cos=Math.cos;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export const AVATAR_CHOREOGRAPHY_DNA=Object.freeze({
  classic:{motif:'balanced-sway',speech:'balanced'},
  minimal:{motif:'micro-still',speech:'micro'},
  cute:{motif:'double-pop',speech:'bouncy'},
  cyber:{motif:'servo-snap',speech:'servo'},
  soft:{motif:'floating-breath',speech:'breath'},
  pro:{motif:'formal-present',speech:'formal'},
  hologram:{motif:'phase-shift',speech:'phase'},
  sakura:{motif:'petal-arc',speech:'petal'},
  ocean:{motif:'wave-flow',speech:'wave'},
  solar:{motif:'radial-rise',speech:'radiant'},
  midnight:{motif:'moon-drift',speech:'moon'},
  mint:{motif:'sprout-bounce',speech:'sprout'},
  aurora:{motif:'ribbon-cross',speech:'ribbon'},
  ember:{motif:'ember-punch',speech:'ember'},
  rose:{motif:'wrist-bloom',speech:'bloom'},
  ice:{motif:'crystal-lock',speech:'crystal'},
  lime:{motif:'zigzag-snap',speech:'zigzag'},
  violet:{motif:'orbital-hands',speech:'orbit'},
  pearl:{motif:'poised-glide',speech:'poise'},
  crimson:{motif:'heartbeat-hit',speech:'heartbeat'},
  galaxy:{motif:'counter-orbit',speech:'cosmic'},
  desert:{motif:'dune-sway',speech:'dune'},
  lavender:{motif:'butterfly-flutter',speech:'flutter'},
  matrix:{motif:'quantized-code',speech:'code'}
});

function variantIndex(m){
  const match=String(m?.avatarVariantId||'').match(/-(\d+)$/);
  return Math.max(1,Number(match?.[1]||1));
}
function slot(m){
  return String(m?.avatarVariantSlot||'idle');
}
function strengthForSlot(name){
  if(name==='success')return 1;
  if(name==='error')return .82;
  if(name==='searching')return .78;
  if(name==='thinking')return .72;
  if(name==='listening')return .62;
  if(name==='speaking')return .28;
  return .52;
}
function showLeft(p,a,x,y,r){p.la=Math.max(p.la||0,a);p.lx=x;p.ly=y;p.lr=r;}
function showRight(p,a,x,y,r){p.ra=Math.max(p.ra||0,a);p.rx=x;p.ry=y;p.rr=r;}
function faceOnly(p,tilt,gx,gy,bob=0){
  p.tilt=(p.tilt||0)+tilt;p.gaze_x=(p.gaze_x||0)+gx;p.gaze_y=(p.gaze_y||0)+gy;p.bob=(p.bob||0)+bob;
}
function subtleSpeaking(p,id,t,phase){
  const a=.35+.08*(id%3);
  faceOnly(p,sin(t*.8+phase)*a,cos(t*.55+phase)*.8,sin(t*.7+phase)*.18,sin(t*1.1+phase)*.08);
}
function applySpeakingChoreography(p,avatar,v,t,phase){
  const style=AVATAR_CHOREOGRAPHY_DNA[avatar]?.speech||'balanced';
  const a=sin(t*(.72+(v%5)*.08)+phase);
  const b=cos(t*(.54+(v%7)*.05)+phase*.73);
  const c=sin(t*(1.18+(v%3)*.11)+phase*1.17);

  switch(style){
    case 'micro':
      faceOnly(p,a*.20,b*.32,-.08,c*.02);p.brow=(p.brow||0)+.02;break;
    case 'bouncy':
      faceOnly(p,a*.72,b*1.05,-.28,Math.max(0,c)*.22);p.cheek=clamp((p.cheek||0)+.07,0,1.2);break;
    case 'servo':{
      const q=Math.round(a*4)/4;faceOnly(p,q*.82,q*1.15,-.18,0);p.brow=clamp((p.brow||0)+.08,0,1.2);break;
    }
    case 'breath':
      faceOnly(p,a*.38,b*.58,.18,sin(t*.66+phase)*.32);p.sy+=(sin(t*.66+phase)*.0018);break;
    case 'formal':
      faceOnly(p,a*.18,b*.42,-.16,0);p.brow=clamp((p.brow||0)+.04,0,1.2);break;
    case 'phase':
      faceOnly(p,a*.58,cos(t*1.34+phase)*.92,-.20,sin(t*1.62+phase)*.10);break;
    case 'petal':
      faceOnly(p,a*.50,b*.72,-.30,sin(t*.82+phase)*.14);p.cheek=clamp((p.cheek||0)+.04,0,1.2);break;
    case 'wave':
      faceOnly(p,sin(t*.92+phase)*.54,cos(t*.72+phase)*.88,.16,sin(t*.92+phase)*.18);break;
    case 'radiant':
      faceOnly(p,a*.64,b*.64,-.34,Math.max(0,c)*.26);p.smile=clamp((p.smile||0)+.05,0,1.2);break;
    case 'moon':
      faceOnly(p,a*.30,b*.76,.24,sin(t*.52+phase)*.20);p.left=clamp((p.left||1)-.025,.05,1.35);break;
    case 'sprout':
      faceOnly(p,a*.44,b*.58,-.18,Math.max(0,sin(t*.88+phase))*.18);break;
    case 'ribbon':
      faceOnly(p,a*.70,b*.82,-.22,sin(t*.76+phase)*.17);p.gaze_x+=(sin(t*.48+phase)*.35);break;
    case 'ember':
      faceOnly(p,c*.72,b*.48,-.30,Math.max(0,sin(t*1.55+phase))*.25);p.brow=clamp((p.brow||0)+.07,0,1.2);break;
    case 'bloom':
      faceOnly(p,a*.34,b*.46,-.20,sin(t*.64+phase)*.10);p.cheek=clamp((p.cheek||0)+.035,0,1.2);break;
    case 'crystal':{
      const q=Math.round(a*3)/3;faceOnly(p,q*.42,q*.50,-.20,0);break;
    }
    case 'zigzag':{
      const q=sin(t*2.2+phase)>0?1:-1;faceOnly(p,q*.48,q*.72,-.20,0);break;
    }
    case 'orbit':
      faceOnly(p,sin(t*.78+phase)*.58,cos(t*.78+phase)*.82,-.20,0);p.gaze_y+=sin(t*.54+phase)*.16;break;
    case 'poise':
      faceOnly(p,a*.12,b*.20,.26,sin(t*.38+phase)*.07);
      p.smile=clamp((p.smile||0)+.032,-.35,1.2);
      p.cheek=clamp((p.cheek||0)+.018,0,1.2);
      p.left=clamp((p.left||1)-.018,.05,1.35);
      p.right=clamp((p.right||1)-.010,.05,1.35);
      break;
    case 'heartbeat':{
      const beat=Math.max(0,sin(t*1.78+phase));faceOnly(p,(beat-.35)*.58,b*.40,-.22,-beat*.16);p.brow=clamp((p.brow||0)+.055,0,1.2);break;
    }
    case 'cosmic':
      faceOnly(p,sin(t*.62+phase)*.48,cos(t*.62+phase)*.76,-.18,sin(t*.43+phase)*.16);p.gaze_x+=cos(t*.31+phase)*.28;break;
    case 'dune':
      faceOnly(p,sin(t*.58+phase)*.46,cos(t*.44+phase)*.44,.16,sin(t*.58+phase)*.10);break;
    case 'flutter':
      faceOnly(p,sin(t*1.08+phase)*.50,b*.58,-.24,-Math.abs(sin(t*1.08+phase))*.10);break;
    case 'code':{
      const q=Math.round(sin(t*2.45+phase)*5)/5;faceOnly(p,q*.50,q*.80,-.18,0);p.gaze_y=Math.round((p.gaze_y||0)*4)/4;break;
    }
    default:
      subtleSpeaking(p,v,t,phase);
  }
}

export function applyAvatarChoreography(p,m){
  if(!p||!m)return p;
  const avatar=String(m.avatarStyle||'classic');
  const s=slot(m);
  const v=variantIndex(m);
  const reduced=Boolean(m.reduced);
  const t=reduced?0:Number(m.gestureTime||0);
  const phase=(v%11)*.47;
  const k=strengthForSlot(s);
  const a=sin(t*(.9+(v%5)*.11)+phase);
  const b=cos(t*(1.15+(v%7)*.09)+phase*.6);
  const c=sin(t*(1.8+(v%3)*.23)+phase*1.4);

  if(s==='speaking'){
    applySpeakingChoreography(p,avatar,v,t,phase);
    return p;
  }

  switch(avatar){
    case 'minimal':{
      // Minimal is intentionally still, but visibly different from Classic:
      // low-amplitude motion, focused downward gaze, narrower expression and
      // almost no breathing/bob.
      faceOnly(p,a*.30*k,b*.36*k,1.8*k,0);
      p.bob=(p.bob||0)*.10;
      p.smile=clamp((p.smile||0)-.16*k,-.35,1.2);
      p.cheek=clamp((p.cheek||0)-.08*k,0,1.2);
      p.brow=clamp((p.brow||0)+.16*k,0,1.2);
      p.sx=1-.010*k;
      p.sy=1+.007*k;
      if(s==='thinking'||s==='searching'){
        showRight(p,.34,120,56+b*3,-3+a*2);
      }else if(s==='listening'){
        showRight(p,.22,122,64,-4);
      }
      break;
    }
    case 'cute':{
      const pop=Math.max(0,sin(t*3.4+phase));
      faceOnly(p,a*3.2*k,b*2.2*k,-2*k,-pop*2.2*k);
      showLeft(p,.72*k,-104-a*10,38-pop*32,-28-a*12);
      showRight(p,.72*k,104+a*10,38-(1-pop)*28,28+a*12);
      p.smile=clamp((p.smile||0)+.18*k,0,1.2);
      p.cheek=clamp((p.cheek||0)+.22*k,0,1.2);
      break;
    }
    case 'cyber':{
      const q=Math.round(sin(t*4.2+phase)*3)/3;
      faceOnly(p,q*2.8*k,q*4*k,-3*k,0);
      showLeft(p,.82*k,-112-q*13,42-q*18,-18+q*24);
      showRight(p,.34*k,118,66,18);
      p.brow=clamp((p.brow||0)+.22*k,0,1.2);
      break;
    }
    case 'soft':{
      faceOnly(p,a*2*k,b*1.8*k,1.5*k,sin(t*.9+phase)*1.6*k);
      showLeft(p,.42*k,-116-a*8,70+b*8,-14+a*6);
      showRight(p,.42*k,116+a*8,70-b*8,14+a*6);
      p.sy+=sin(t*.8+phase)*.006*k;
      break;
    }
    case 'pro':{
      faceOnly(p,a*.8*k,b*1.2*k,-1*k,0);
      if(s==='listening'||s==='thinking'||s==='searching')showRight(p,.72*k,116,24+b*9,-12+a*5);
      if(s==='success')showLeft(p,.48,-112,34,-18);
      p.brow=clamp((p.brow||0)+.12*k,0,1.2);
      break;
    }
    case 'hologram':{
      const q=sin(t*2.7+phase);
      faceOnly(p,q*2.4*k,cos(t*1.9+phase)*3*k,-2*k,q*.7*k);
      showLeft(p,.58*k,-108-q*12,48+cos(t*2.1+phase)*16,-24+q*18);
      showRight(p,.58*k,108+q*12,48-cos(t*2.1+phase)*16,24-q*18);
      break;
    }
    case 'sakura':{
      faceOnly(p,a*2.6*k,b*2*k,-2.2*k,sin(t*1.1+phase)*.8*k);
      showLeft(p,.58*k,-102-a*14,44+b*14,-36+a*18);
      showRight(p,.32*k,120,70,14);
      if((v%2)===0)showRight(p,.58*k,102+a*14,44-b*14,36-a*18);
      p.cheek=clamp((p.cheek||0)+.12*k,0,1.2);
      break;
    }
    case 'ocean':{
      const wave=sin(t*1.35+phase);
      faceOnly(p,wave*2.2*k,cos(t*.9+phase)*2.4*k,1.2*k,wave*1.2*k);
      showLeft(p,.64*k,-118,58+wave*22,-18+wave*20);
      showRight(p,.64*k,118,58-wave*22,18+wave*20);
      break;
    }
    case 'solar':{
      const rise=Math.max(0,sin(t*2.4+phase));
      faceOnly(p,a*2.4*k,b*1.6*k,-3*k,-rise*2.8*k);
      showLeft(p,.72*k,-126,52-rise*72,-28+rise*12);
      showRight(p,.72*k,126,52-rise*72,28-rise*12);
      p.smile=clamp((p.smile||0)+.16*k,0,1.2);
      break;
    }
    case 'midnight':{
      faceOnly(p,a*1.8*k,b*2.8*k,2*k,sin(t*.7+phase)*1.4*k);
      showRight(p,.48*k,98+b*8,34+a*16,-34+a*7);
      p.left=clamp((p.left||1)-.08*k,.05,1.35);
      p.right=clamp((p.right||1)-.05*k,.05,1.35);
      break;
    }
    case 'mint':{
      const sprout=Math.max(0,sin(t*2+phase));
      faceOnly(p,a*2*k,b*1.7*k,-1.4*k,-sprout*1.6*k);
      showLeft(p,.55*k,-110,62-sprout*38,-22);
      showRight(p,.55*k,110,62-sprout*38,22);
      break;
    }
    case 'aurora':{
      faceOnly(p,a*3*k,b*2.2*k,-1.6*k,a*1.1*k);
      showLeft(p,.60*k,-122+a*22,54+b*20,-30+a*24);
      showRight(p,.60*k,122-a*22,54-b*20,30-a*24);
      break;
    }
    case 'ember':{
      const hit=Math.max(0,sin(t*3.2+phase));
      faceOnly(p,c*2.8*k,b*1.6*k,-2.5*k,-hit*3*k);
      showLeft(p,.44*k,-118,62,-22);
      showRight(p,.82*k,108+hit*18,58-hit*72,-12+hit*38);
      p.brow=clamp((p.brow||0)+.20*k,0,1.2);
      break;
    }
    case 'rose':{
      faceOnly(p,a*1.8*k,b*1.5*k,-1.2*k,.4*a*k);
      showLeft(p,.52*k,-104-a*10,52+b*12,-42+a*20);
      showRight(p,.38*k,116,66,18+b*7);
      p.cheek=clamp((p.cheek||0)+.10*k,0,1.2);
      break;
    }
    case 'ice':{
      const q=Math.round(a*2)/2;
      faceOnly(p,q*1.8*k,q*1.5*k,-3*k,0);
      showLeft(p,.58*k,-120-q*8,46-q*16,-34+q*14);
      showRight(p,.58*k,120+q*8,46+q*16,34-q*14);
      p.sx=1;p.sy=1;
      break;
    }
    case 'lime':{
      const q=sin(t*4.8+phase)>0?1:-1;
      faceOnly(p,q*3.2*k,q*3.8*k,-2*k,0);
      showLeft(p,.70*k,-112-q*12,q>0?20:64,-38*q);
      showRight(p,.44*k,118,q>0?64:20,30*q);
      break;
    }
    case 'violet':{
      const orb=t*1.3+phase;
      faceOnly(p,sin(orb)*2.5*k,cos(orb)*3*k,-1.5*k,0);
      showLeft(p,.62*k,-108+cos(orb)*18,50+sin(orb)*22,-24+sin(orb)*18);
      showRight(p,.62*k,108+cos(orb+Math.PI)*18,50+sin(orb+Math.PI)*22,24+sin(orb+Math.PI)*18);
      break;
    }
    case 'pearl':{
      faceOnly(p,a*.7*k,b*.9*k,-.8*k,0);
      showRight(p,.30*k,114,56+b*6,-10+a*4);
      p.smile=clamp((p.smile||0)+.04*k,-.35,1.2);
      break;
    }
    case 'crimson':{
      const beat=Math.max(0,sin(t*3.7+phase));
      faceOnly(p,(beat-.5)*3*k,b*1.4*k,-2*k,-beat*2*k);
      showLeft(p,.34*k,-120,66,-18);
      showRight(p,.78*k,112,56-beat*54,-10+beat*22);
      p.brow=clamp((p.brow||0)+.18*k,0,1.2);
      break;
    }
    case 'galaxy':{
      const orb=t*.92+phase;
      faceOnly(p,sin(orb)*2.2*k,cos(orb)*2.8*k,-1.4*k,sin(orb*.7)*1.2*k);
      showLeft(p,.58*k,-112+cos(orb)*20,52+sin(orb)*18,-24+sin(orb)*16);
      showRight(p,.58*k,112+cos(orb+Math.PI)*20,52+sin(orb+Math.PI)*18,24+sin(orb+Math.PI)*16);
      p.sx+=sin(orb*.6)*.008*k;p.sy-=sin(orb*.6)*.006*k;
      break;
    }
    case 'desert':{
      const dune=sin(t*.95+phase);
      faceOnly(p,dune*2.6*k,cos(t*.7+phase)*1.6*k,1.8*k,dune*.8*k);
      showLeft(p,.46*k,-118-dune*10,72+dune*8,-12+dune*8);
      showRight(p,.46*k,118-dune*10,72-dune*8,12+dune*8);
      break;
    }
    case 'lavender':{
      const flap=sin(t*2.2+phase);
      faceOnly(p,flap*2.1*k,b*1.8*k,-1.8*k,-Math.abs(flap)*1.2*k);
      showLeft(p,.58*k,-106,46-flap*24,-38+flap*18);
      showRight(p,.58*k,106,46+flap*24,38+flap*18);
      break;
    }
    case 'matrix':{
      const q=Math.round(sin(t*5.2+phase)*4)/4;
      faceOnly(p,q*2.8*k,q*4*k,-3*k,0);
      showLeft(p,.62*k,-116-q*18,50+(v%2?18:-10),-30+q*26);
      showRight(p,.62*k,116+q*18,50+(v%2?-10:18),30-q*26);
      p.gaze_y=Math.round((p.gaze_y||0)*2)/2;
      break;
    }
    default:{
      faceOnly(p,a*1.6*k,b*1.2*k,-1*k,a*.6*k);
      if(s==='success')showRight(p,.62,124,-8,-6);
      break;
    }
  }

  // Give every idle recipe a visibly distinct stance without changing the
  // avatar's core motif. This prevents a library from having many IDs that
  // collapse into the same pose after quantization/smoothing.
  if(s==='idle'){
    const idleStep=((v-1)%8)-3.5;
    const secondary=((v*3)%7)-3;
    p.gaze_x=(p.gaze_x||0)+idleStep*.58*k;
    p.tilt=(p.tilt||0)+secondary*.46*k;
    if((p.la||0)>.08){
      p.ly=(p.ly||72)+(((v%4)-1.5)*2.8*k);
      p.lr=(p.lr||-10)+idleStep*.8*k;
    }
    if((p.ra||0)>.08){
      p.ry=(p.ry||72)+((((v+2)%4)-1.5)*2.8*k);
      p.rr=(p.rr||10)-idleStep*.8*k;
    }
  }

  return p;
}

export function validateAvatarChoreography(ids=[]){
  const errors=[];
  const motifs=new Set();
  for(const id of ids){
    const dna=AVATAR_CHOREOGRAPHY_DNA[id];
    if(!dna?.motif)errors.push(`${id}: missing choreography motif`);
    else if(motifs.has(dna.motif))errors.push(`${id}: duplicate choreography motif`);
    else motifs.add(dna.motif);
  }
  return errors;
}
