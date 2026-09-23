// Canvas equivalents of DaiFace's QPainter paths. No head, body, or ears.
import { clamp } from './motion.mjs';
const rad = a => a * Math.PI / 180;
function lightTheme(c) {
  return c.canvas?.ownerDocument?.documentElement?.dataset?.daiTheme === 'light';
}
export const DAI_AVATAR_STYLES=['classic','minimal','cute','cyber','soft','pro','hologram','sakura','ocean','solar','midnight','mint'];

function avatarTheme(c,avatar='classic') {
  const isLight=lightTheme(c);
  if(avatar==='minimal')return {
    eyeA:isLight?'#D7C7DE':'#F8F3FA',
    eyeB:isLight?'#AA94B8':'#DED4E9',
    eyeC:isLight?'#87739A':'#B9A7CB',
    eyeStroke:isLight?'rgba(92,72,107,.10)':'rgba(255,255,255,.035)',
    happy:isLight?'#7D678D':'#E7DDF0',
    brow:isLight?'rgba(82,66,96,.52)':'rgba(211,198,223,.46)',
    cheek:isLight?'174,123,160':'221,174,205',
    mouth:isLight?'#765E80':'#E4D3E9',
    tongue:isLight?'#B58AA7':'#CBA9C4',
    dots:'198,185,211',
    particles:['#D9CDE1','#F1EBF3','#BFB1CB'],
    eyeW:.84,eyeH:.82,spacing:46,stroke:5,cheekBoost:.42
  };
  if(avatar==='cute')return {
    eyeA:isLight?'#FFD5E4':'#FFF8EE',
    eyeB:isLight?'#E8A6C2':'#FFD5E5',
    eyeC:isLight?'#A994D9':'#D5C2FF',
    eyeStroke:isLight?'rgba(157,87,123,.15)':'rgba(255,205,226,.07)',
    happy:isLight?'#B16086':'#FFF0F5',
    brow:isLight?'rgba(128,78,119,.55)':'rgba(239,202,230,.56)',
    cheek:isLight?'232,104,160':'255,151,194',
    mouth:isLight?'#B1567F':'#FFE1EB',
    tongue:isLight?'#E181AA':'#F2A0BD',
    dots:'234,187,225',
    particles:['#FFD0E2','#FFE9A8','#D8C5FF'],
    eyeW:1.12,eyeH:1.08,spacing:48,stroke:12,cheekBoost:1.34
  };
  if(avatar==='sakura')return {
    eyeA:isLight?'#F6AFC8':'#FFF4F8',
    eyeB:isLight?'#DE7FA8':'#FFC7DB',
    eyeC:isLight?'#9A78C2':'#CFB8F5',
    eyeStroke:isLight?'rgba(149,72,112,.17)':'rgba(255,180,211,.08)',
    happy:isLight?'#A54F79':'#FFE1EC',
    brow:isLight?'rgba(127,66,105,.62)':'rgba(244,188,218,.62)',
    cheek:isLight?'229,92,146':'255,133,183',
    mouth:isLight?'#A44C72':'#FFD1E1',
    tongue:isLight?'#D66F99':'#EF8EB0',
    dots:'241,169,202',
    particles:['#FFB7D1','#FFDCE9','#E4C8FF'],
    eyeW:1.05,eyeH:1.03,spacing:48,stroke:10,cheekBoost:1.08
  };
  if(avatar==='ocean')return {
    eyeA:isLight?'#89DCEB':'#D4FBFF',
    eyeB:isLight?'#4FBACD':'#8DE7F2',
    eyeC:isLight?'#547CC8':'#8EAFFF',
    eyeStroke:isLight?'rgba(50,126,154,.18)':'rgba(128,232,247,.10)',
    happy:isLight?'#3C8296':'#C8F7FF',
    brow:isLight?'rgba(44,105,132,.64)':'rgba(135,222,241,.64)',
    cheek:isLight?'71,164,188':'92,209,226',
    mouth:isLight?'#3F7E92':'#B7EAF2',
    tongue:isLight?'#68AFC0':'#7CCAD5',
    dots:'101,211,228',
    particles:['#83E3EF','#A7D9FF','#A3F0D7'],
    eyeW:1.01,eyeH:.96,spacing:50,stroke:8,cheekBoost:.5
  };
  if(avatar==='solar')return {
    eyeA:isLight?'#F4C66E':'#FFF0B9',
    eyeB:isLight?'#D99A40':'#F3C36F',
    eyeC:isLight?'#B6654F':'#E68A6E',
    eyeStroke:isLight?'rgba(137,88,42,.18)':'rgba(255,211,126,.09)',
    happy:isLight?'#9A6836':'#FFE2A6',
    brow:isLight?'rgba(118,77,42,.64)':'rgba(240,196,115,.62)',
    cheek:isLight?'219,123,74':'241,151,83',
    mouth:isLight?'#985C3D':'#F4C18C',
    tongue:isLight?'#C9785D':'#E89A79',
    dots:'231,183,101',
    particles:['#FFD56F','#FFAA67','#FFF0B4'],
    eyeW:.98,eyeH:1.01,spacing:49,stroke:9,cheekBoost:.68
  };
  if(avatar==='midnight')return {
    eyeA:isLight?'#B3A5EA':'#E9E3FF',
    eyeB:isLight?'#8876CD':'#B7A8F5',
    eyeC:isLight?'#4F65A8':'#7188D7',
    eyeStroke:isLight?'rgba(86,72,140,.18)':'rgba(184,170,255,.09)',
    happy:isLight?'#695B9C':'#DDD4FF',
    brow:isLight?'rgba(82,71,132,.64)':'rgba(195,181,252,.62)',
    cheek:isLight?'126,103,178':'161,139,219',
    mouth:isLight?'#66568F':'#CFC3F2',
    tongue:isLight?'#927DB4':'#B39BCD',
    dots:'168,151,229',
    particles:['#A9A0F4','#788DDF','#D5C5FF'],
    eyeW:1,eyeH:.94,spacing:50,stroke:8,cheekBoost:.42
  };
  if(avatar==='mint')return {
    eyeA:isLight?'#9EE3C2':'#DBFFF0',
    eyeB:isLight?'#69C9A1':'#9AEACB',
    eyeC:isLight?'#59A9B3':'#7DC6CF',
    eyeStroke:isLight?'rgba(63,126,105,.17)':'rgba(153,239,205,.09)',
    happy:isLight?'#4D8B73':'#CFF8E6',
    brow:isLight?'rgba(61,111,93,.62)':'rgba(161,229,204,.62)',
    cheek:isLight?'84,172,132':'105,205,160',
    mouth:isLight?'#50816F':'#BEE9D6',
    tongue:isLight?'#76AA92':'#91C7AE',
    dots:'130,214,178',
    particles:['#A5E8C8','#C7F4DF','#9AD9E0'],
    eyeW:1.02,eyeH:.98,spacing:48,stroke:8,cheekBoost:.48
  };
  if(avatar==='soft')return {
    eyeA:isLight?'#F1C9D9':'#FFF8FB',
    eyeB:isLight?'#D8AEC6':'#F7DCE8',
    eyeC:isLight?'#A58BCB':'#D9C9F3',
    eyeStroke:isLight?'rgba(138,91,120,.12)':'rgba(255,214,232,.055)',
    happy:isLight?'#9B6682':'#FFEAF2',
    brow:isLight?'rgba(121,82,113,.52)':'rgba(231,204,224,.52)',
    cheek:isLight?'222,130,170':'245,168,199',
    mouth:isLight?'#9E6680':'#F7D9E6',
    tongue:isLight?'#D893AF':'#EAA9C0',
    dots:'225,195,224',
    particles:['#FFD9E6','#F3E1C5','#DCCFFD'],
    eyeW:1.03,eyeH:.98,spacing:48,stroke:9,cheekBoost:.88
  };
  if(avatar==='pro')return {
    eyeA:isLight?'#DCC8A7':'#FFF3D6',
    eyeB:isLight?'#B9A37D':'#E8D0A0',
    eyeC:isLight?'#7D718D':'#BAAACB',
    eyeStroke:isLight?'rgba(97,79,68,.14)':'rgba(255,230,178,.07)',
    happy:isLight?'#756558':'#F5E5C8',
    brow:isLight?'rgba(93,79,76,.62)':'rgba(226,208,180,.58)',
    cheek:isLight?'183,132,124':'216,171,153',
    mouth:isLight?'#79645F':'#EAD9C2',
    tongue:isLight?'#B8867E':'#D7A69B',
    dots:'211,192,158',
    particles:['#EBD4A4','#F8EBCF','#CFC4E5'],
    eyeW:.94,eyeH:1,spacing:50,stroke:8,cheekBoost:.52
  };
  if(avatar==='hologram')return {
    eyeA:isLight?'#91DDE8':'#D8FFFF',
    eyeB:isLight?'#6BBAC7':'#A6EEF7',
    eyeC:isLight?'#8E86D9':'#C9C1FF',
    eyeStroke:isLight?'rgba(59,137,151,.20)':'rgba(152,247,255,.13)',
    happy:isLight?'#4A8794':'#C9FAFF',
    brow:isLight?'rgba(65,129,146,.66)':'rgba(164,239,248,.66)',
    cheek:isLight?'102,184,196':'118,224,231',
    mouth:isLight?'#4D8794':'#BDECF2',
    tongue:isLight?'#78AFBA':'#8BD3DC',
    dots:'120,224,236',
    particles:['#A8F0F7','#C8C0FF','#BAF3DD'],
    eyeW:1.06,eyeH:.88,spacing:51,stroke:6,cheekBoost:.38
  };
  if(avatar==='cyber')return {
    eyeA:isLight?'#8BE1E7':'#B9FFFF',
    eyeB:isLight?'#6FB4D0':'#88DDF0',
    eyeC:isLight?'#8377D5':'#B59BFF',
    eyeStroke:isLight?'rgba(49,123,145,.20)':'rgba(118,235,255,.13)',
    happy:isLight?'#3A8097':'#B7F6FF',
    brow:isLight?'rgba(49,107,131,.70)':'rgba(137,231,255,.70)',
    cheek:isLight?'90,178,196':'105,223,235',
    mouth:isLight?'#4A879D':'#BCECF5',
    tongue:isLight?'#76AEC0':'#78C7D7',
    dots:'112,220,239',
    particles:['#8CE7F4','#B6F3D7','#B8A7FF'],
    eyeW:1.02,eyeH:.92,spacing:50,stroke:7,cheekBoost:.58
  };
  return {
    eyeA:isLight?'#E5B6C6':'#FFF7EC',
    eyeB:isLight?'#D49BBD':'#FFE4ED',
    eyeC:isLight?'#9380C9':'#CEBDF7',
    eyeStroke:isLight?'rgba(111,73,126,.18)':'rgba(255,195,220,.059)',
    happy:isLight?'#9B5278':'#FFE9F0',
    brow:isLight?'rgba(111,77,132,.62)':'rgba(222,193,238,.62)',
    cheek:isLight?'213,91,143':'247,142,183',
    mouth:isLight?'#A45278':'#FFDAE5',
    tongue:isLight?'#D27B9C':'#E798B4',
    dots:'214,191,239',
    particles:['#F7C4D5','#FFE2A1','#BAAEF3'],
    eyeW:1,eyeH:1,spacing:49,stroke:11,cheekBoost:1
  };
}

function avatarAccent(c,m,avatar,isLight) {
  if(avatar==='sakura'){
    c.save();c.globalAlpha=m.reduced?.38:.34+.08*Math.sin(m.elapsed*1.8);
    star(c,-108,-4,3.1,isLight?'#DD7FA9':'#FFB8D2',-14);
    star(c,106,6,2.6,isLight?'#B894D8':'#E0C7FF',10);
    ellipse(c,0,-96,2.2,2.2,isLight?'#D66F9C':'#FFC1D7');
    c.restore();
  }else if(avatar==='ocean'){
    c.save();c.globalAlpha=m.reduced?.30:.27+.08*Math.sin(m.elapsed*1.7);
    const aqua=isLight?'rgba(54,154,178,.58)':'rgba(115,225,239,.58)';
    path(c,'M-112 68 Q-91 59 -71 68 T-30 68',null,aqua,1.3);
    path(c,'M30 68 Q51 59 71 68 T112 68',null,aqua,1.3);
    c.restore();
  }else if(avatar==='solar'){
    c.save();c.globalAlpha=m.reduced?.34:.30+.08*Math.sin(m.elapsed*1.5);
    const gold=isLight?'rgba(180,119,50,.60)':'rgba(255,206,105,.60)';
    ellipse(c,0,-97,3.2,3.2,isLight?'#D99A40':'#FFD36E');
    for(const a of [-40,0,40,140,180,220]){
      const r=110,rr=116;line(c,Math.cos(rad(a))*r,Math.sin(rad(a))*r-1,Math.cos(rad(a))*rr,Math.sin(rad(a))*rr-1,gold,1);
    }
    c.restore();
  }else if(avatar==='midnight'){
    c.save();c.globalAlpha=m.reduced?.34:.30+.09*Math.sin(m.elapsed*1.35);
    star(c,-104,-22,2.6,isLight?'#8876CD':'#C1B4FF',-8);
    star(c,104,16,2.2,isLight?'#667AB9':'#91A4F0',12);
    star(c,82,-76,1.8,isLight?'#A28FDB':'#DFD5FF',0);
    c.restore();
  }else if(avatar==='mint'){
    c.save();c.globalAlpha=m.reduced?.32:.28+.07*Math.sin(m.elapsed*1.55);
    const mint=isLight?'rgba(70,152,118,.55)':'rgba(145,232,198,.55)';
    ellipse(c,-107,2,3,6,null,mint,1.2);ellipse(c,107,2,3,6,null,mint,1.2);
    line(c,-107,8,-107,14,mint,1);line(c,107,8,107,14,mint,1);
    c.restore();
  }else if(avatar==='soft'){
    const pulse=m.reduced?.34:.28+.08*Math.sin(m.elapsed*1.45);
    c.save();c.globalAlpha=pulse;
    star(c,-104,-2,2.7,isLight?'#D9A9C1':'#FFD9E7',-10);
    star(c,105,3,2.3,isLight?'#B8A4DA':'#DDD0FF',12);
    ellipse(c,0,91,42,2,null,isLight?'rgba(179,127,156,.18)':'rgba(255,218,233,.12)',1);
    c.restore();
  }else if(avatar==='pro'){
    c.save();c.globalAlpha=m.reduced?.38:.34+.06*Math.sin(m.elapsed*1.25);
    const gold=isLight?'rgba(154,126,82,.55)':'rgba(244,214,157,.52)';
    line(c,-106,-46,-94,-46,gold,1.3);
    line(c,-106,-46,-106,-34,gold,1.3);
    line(c,106,-46,94,-46,gold,1.3);
    line(c,106,-46,106,-34,gold,1.3);
    ellipse(c,0,-96,2.5,2.5,isLight?'#B99762':'#F0D39B');
    c.restore();
  }else if(avatar==='hologram'){
    const pulse=m.reduced?.28:.24+.09*Math.sin(m.elapsed*2.6);
    const scanY=-56+((m.elapsed*34)%112);
    c.save();c.globalAlpha=pulse;
    const holo=isLight?'rgba(73,158,176,.72)':'rgba(136,240,250,.72)';
    ellipse(c,0,-2,118,92,null,holo,1.1);
    line(c,-100,scanY,100,scanY,holo,1);
    line(c,-116,-20,-105,-20,holo,1.3);
    line(c,105,20,116,20,holo,1.3);
    c.restore();
  }else if(avatar==='cyber'){
    const pulse=m.reduced?.55:.46+.16*Math.sin(m.elapsed*2.2);
    c.save();c.globalAlpha=pulse;
    const color=isLight?'rgba(70,154,177,.72)':'rgba(118,235,255,.68)';
    line(c,-111,-8,-94,-8,color,2);
    line(c,94,-8,111,-8,color,2);
    line(c,-104,2,-96,7,color,1.4);
    line(c,104,2,96,7,color,1.4);
    ellipse(c,0,-93,3,3,isLight?'#6EB8CF':'#8DF2FF');
    c.restore();
  }else if(avatar==='cute'){
    c.save();c.globalAlpha=.55;
    star(c,-108,4,3.5,isLight?'#E8A4C2':'#FFD0E0',-8);
    star(c,108,4,3.5,isLight?'#B8A6DF':'#D8C9FF',12);
    c.restore();
  }else if(avatar==='minimal'){
    c.save();c.globalAlpha=.28;
    line(c,-88,84,88,84,isLight?'rgba(116,94,128,.20)':'rgba(230,221,236,.13)',1);
    c.restore();
  }
}
function path(c, d, fill, stroke, width=1) {
  const p = new Path2D(d);
  if(fill) { c.fillStyle=fill; c.fill(p); }
  if(stroke) { c.strokeStyle=stroke; c.lineWidth=width; c.stroke(p); }
  return p;
}
function ellipse(c,x,y,rx,ry,fill,stroke,width=1) {
  c.beginPath(); c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);
  if(fill) {c.fillStyle=fill;c.fill();}
  if(stroke) {c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function line(c,x,y,x2,y2,color,width) {
  c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function star(c,x,y,size,color,angle=0) {
  c.save();c.translate(x,y);c.rotate(rad(angle));c.scale(size,size);
  path(c,'M0 -1 Q.2 -.2 1 0 Q.2 .2 0 1 Q-.2 .2 -1 0 Q-.2 -.2 0 -1',color);c.restore();
}
function light(c,x,y,r,color,rx=r,ry=r) {
  const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');
  ellipse(c,x,y,rx,ry,g);
}
function handTheme(c,avatar='classic') {
  const isLight=lightTheme(c);
  const palettes={
    classic:isLight?['#44384B','rgba(126,91,139,.24)','#B65F84','#775D91','rgba(182,95,132,.18)']:['#171221','rgba(220,188,242,.098)','#FFE1EB','#C9ACE2','rgba(255,190,218,.20)'],
    minimal:isLight?['#4A4650','rgba(105,100,112,.18)','#B7AFBF','#817A89','rgba(170,163,181,.10)']:['#17191E','rgba(207,203,214,.075)','#E3DFE8','#A7A1AD','rgba(225,221,232,.11)'],
    cute:isLight?['#71394F','rgba(207,103,150,.25)','#E484AE','#B45D86','rgba(232,125,170,.20)']:['#281522','rgba(255,173,207,.13)','#FFB8D2','#E48DAF','rgba(255,160,199,.23)'],
    cyber:isLight?['#183D4B','rgba(58,165,186,.24)','#52C9DC','#4996B5','rgba(85,221,238,.24)']:['#081923','rgba(95,230,245,.14)','#7AEBF6','#5EC4DA','rgba(91,230,245,.26)'],
    soft:isLight?['#59414E','rgba(194,130,160,.22)','#D79AAF','#9E758C','rgba(232,171,197,.18)']:['#221821','rgba(245,187,211,.11)','#F6C2D5','#C99AB1','rgba(246,190,215,.19)'],
    pro:isLight?['#51493E','rgba(176,144,91,.22)','#C7A86F','#90784F','rgba(223,191,127,.17)']:['#1D1A16','rgba(231,205,158,.11)','#E5C68B','#B99B68','rgba(237,204,141,.19)'],
    hologram:isLight?['rgba(35,99,113,.70)','rgba(67,177,196,.22)','#65CFE0','#4AA7BB','rgba(91,225,238,.24)']:['rgba(8,35,43,.72)','rgba(110,236,247,.15)','#9AF3FA','#6FD4E1','rgba(103,237,247,.28)'],
    sakura:isLight?['#653448','rgba(213,101,149,.24)','#E278A4','#AD527B','rgba(239,128,175,.22)']:['#27131E','rgba(255,153,193,.13)','#FF9FC1','#D76E98','rgba(255,141,184,.25)'],
    ocean:isLight?['#173E4D','rgba(55,151,176,.23)','#55C4D8','#428DA8','rgba(88,210,229,.22)']:['#081922','rgba(97,214,232,.13)','#7ADCE9','#54B6C8','rgba(100,222,238,.24)'],
    solar:isLight?['#5B402A','rgba(196,132,63,.24)','#D99B4B','#A87138','rgba(236,167,83,.22)']:['#23170E','rgba(244,180,92,.13)','#F3B55D','#C7833F','rgba(255,184,89,.24)'],
    midnight:isLight?['#3B3359','rgba(112,95,169,.24)','#8E7BD0','#675AA4','rgba(153,133,224,.22)']:['#121022','rgba(172,158,237,.13)','#B2A2EE','#8375C8','rgba(174,158,244,.24)'],
    mint:isLight?['#29483D','rgba(76,154,121,.23)','#76CDA8','#55967D','rgba(116,216,174,.20)']:['#0E1D18','rgba(135,224,189,.12)','#9AE7C5','#6CC7A1','rgba(139,231,194,.23)']
  };
  const p=palettes[avatar]||palettes.classic;
  return {fill:p[0],outer:p[1],edge:p[2],palm:p[3],glow:p[4]};
}
function hand(c,x,y,rotation,opacity,mirror,grip,avatar='classic') {
  if(opacity<.01)return;
  c.save();c.translate(x,y);c.rotate(rad(rotation));c.scale(mirror?-1:1,1);c.globalAlpha=opacity;
  const d=grip?'M-13 11 C-21 0 -11 -16 -4 -11 C4 -23 18 -11 15 -1 C23 8 7 22 -5 18 Q-12 18 -13 11 Z':
    'M-14 13 C-23 6 -24 -3 -19 -5 Q-16 -7 -11 1 L-15 -17 C-17 -24 -10 -27 -7 -19 L-3 -5 L-5 -24 C-5 -31 3 -31 4 -24 L6 -7 L8 -22 C9 -29 16 -26 15 -19 L14 -3 Q21 -18 24 -11 C27 -8 16 17 10 20 C1 24 -9 22 -14 13 Z';
  const style=handTheme(c,avatar);
  c.save();c.shadowColor=style.glow;c.shadowBlur=avatar==='hologram'||avatar==='cyber'?10:6;
  path(c,d,style.fill,style.outer,8);c.restore();
  path(c,d,null,style.edge,2.4);
  path(c,'M-10 3 Q1 -2 5 8',null,style.palm,1.5);c.restore();
}
function eye(c,m,x,openness,width,happy,tilt,avatar='classic') {
  const q=m.pose,theme=avatarTheme(c,avatar);
  c.save();c.translate(x+q.gaze_x,-17+q.gaze_y);c.rotate(rad(tilt));
  const blink=m.blinkTime<.19?1-.97*Math.sin(Math.PI*m.blinkTime/.19):1;
  const w=35*width*theme.eyeW,h=Math.max(4,75*openness*blink*theme.eyeH);
  const r=avatar==='cyber'?Math.min(10,h/2):Math.min(w*.47,h/2);
  const g=c.createLinearGradient(-w/2,-h/2,w/2,h/2);
  g.addColorStop(0,theme.eyeA);g.addColorStop(.55,theme.eyeB);g.addColorStop(1,theme.eyeC);
  c.globalAlpha=1-happy*.94;c.beginPath();c.roundRect(-w/2,-h/2,w,h,r);
  c.fillStyle=g;c.fill();c.strokeStyle=theme.eyeStroke;c.lineWidth=theme.stroke;c.stroke();

  if(avatar==='cute'&&happy<.72){
    c.globalAlpha=(1-happy)*.55;
    ellipse(c,-w*.18,-h*.20,Math.max(1.5,w*.07),Math.max(2,h*.08),'rgba(255,255,255,.85)');
  }
  if(avatar==='cyber'&&happy<.78){
    c.globalAlpha=(1-happy)*.46;
    line(c,-w*.32,0,w*.32,0,'rgba(255,255,255,.62)',1.1);
  }

  c.globalAlpha=happy;
  path(c,'M-22 5 C-16 -19 16 -19 22 5',null,theme.happy,avatar==='minimal'?5.5:7);
  c.restore();
}

function hat(c,m) {
  const amount=m.pose.hat;if(amount<.01)return;
  c.save();c.globalAlpha=amount;c.translate(-4,-78-(1-amount)*45);
  c.rotate(rad(-9+(m.reduced?0:Math.sin(m.elapsed*2)*2)));c.scale(amount,amount);
  const g=c.createLinearGradient(-40,-80,42,0);g.addColorStop(0,'#8B93F2');g.addColorStop(1,'#594E9E');
  path(c,'M-43 -4 C-25 -30 -8 -62 -15 -99 C23 -94 17 -43 46 -8 Q0 8 -43 -4',g,'#B3ABFF',1.5);
  ellipse(c,1,-3,51,9,'#ACA0F0','#B3ABFF',1.5);
  path(c,'M-33 -19 Q0 -8 34 -19 L42 -8 Q0 5 -42 -8 Z','#E8BCD9');
  star(c,1,-50,7,'#FFF0BF',12);star(c,-9,-76,3,'#EEE3FF');star(c,17,-28,3,'#EEE3FF');c.restore();
}
function wand(c,m) {
  const q=m.pose;if(q.wand<.01)return;
  c.save();c.globalAlpha=q.wand;
  const x=q.lx,y=q.ly,tx=x-39,ty=y-77;
  line(c,x,y+5,tx,ty,'#C9B5EC',5);line(c,tx,ty,x-31,y-62,'#FFE3B6',6);
  light(c,tx,ty,38,'rgba(255,215,148,.176)');
  star(c,tx,ty,11,'#FFE7AF',m.reduced?0:m.elapsed*28);
  for(let i=0;i<5;i++) {
    const a=i*1.256+(m.reduced?0:m.elapsed*.65),r=26+(i%2)*12;
    star(c,tx+Math.cos(a)*r,ty+Math.sin(a)*r,2.8+i%2,'rgba(255,222,161,.647)',m.reduced?0:-m.elapsed*20);
  }
  c.restore();
}
function listen(c,m) {
  const q=m.pose;if(q.listen<.01)return;
  c.save();c.globalAlpha=q.listen;
  const level=m.audio;
  for(let i=0;i<3;i++) {
    const a=(i-1)*.5,x=q.rx+34,y=q.ry-6,inner=12+level*3,outer=27+level*12;
    line(c,x+Math.cos(a)*inner,y+Math.sin(a)*inner,x+Math.cos(a)*outer,y+Math.sin(a)*outer,'#F7D799',4);
  }
  for(let i=0;i<11;i++) {
    const h=3+level*(7+12*Math.sin(i*.9+(m.reduced?0:m.elapsed*5))**2);
    line(c,(i-5)*8,124-h/2,(i-5)*8,124+h/2,'rgba(245,177,207,.706)',3);
  }
  c.restore();
}
function fishing(c,m) {
  const q=m.pose;if(q.rod<.01)return;
  c.save();c.globalAlpha=clamp(q.rod,0,1);
  const fish=q.fish,ty=-36-40*fish,bx=168+(m.reduced?0:Math.sin(m.elapsed*3)*3),by=113-106*fish;
  path(c,`M${q.rx-5} ${q.ry-3} Q150 ${-65-50*fish} 175 ${ty}`,null,'#F7E5DC',4);
  path(c,`M175 ${ty} Q195 ${by-22} ${bx} ${by}`,null,'#CBBEE6',1.4);
  if(fish<.1) {
    ellipse(c,bx,by,4,6,'#F5ACBD');
    for(let i=0;i<2;i++) {
      const r=8+(((m.reduced?0:m.elapsed)*.6+i*.5)%1)*15;
      ellipse(c,bx,by+3,r,r*.18,null,`rgba(179,204,234,${(65-i*18)/255})`);
    }
  } else {
    c.translate(bx,by+11);c.rotate(rad(m.reduced?0:Math.sin(m.elapsed*9)*12));c.scale(.65+.35*fish,.65+.35*fish);
    path(c,'M0 17 L-11 31 Q0 26 11 31 Z','#80D7E5','#D8FBFA',1.8);
    ellipse(c,0,3,13,18,'#80D7E5','#D8FBFA',1.8);
    c.beginPath();c.ellipse(-2,3,5,10,0,rad(70),rad(-75),true);c.strokeStyle='#E2FFFF';c.lineWidth=1.3;c.stroke();
    ellipse(c,5,-5,2,2,'#172637');
  }
  c.restore();
}
function personality(c,m) {
  const q=m.pose,t=m.reduced?0:m.gestureTime;
  if(q.heart>.01) for(let i=0;i<3;i++) {
    const progress=m.reduced?.4+i*.16:clamp((t-.65-i*.28)/2.2,0,1),opacity=q.heart*(1-progress);
    if(progress<=0||opacity<.02)continue;
    c.save();c.globalAlpha=opacity;c.translate(62+progress*106+i*9,34-progress*106-i*9);
    c.rotate(rad(progress*15-7));c.scale(.65+progress*.6,.65+progress*.6);
    path(c,'M0 16 C-31 -3 -12 -23 0 -9 C12 -23 31 -3 0 16','#EC9CBD','#FFD8E4',1.2);c.restore();
  }
  if(q.notes>.01) {
    c.save();c.globalAlpha=q.notes;
    [-1,1].forEach((side,i)=>{
      const x=side*169,y=-51+Math.sin(t*3+i)*12;
      line(c,x,y,x,y-26,'#B7B5EF',3.5);line(c,x,y-26,x+13,y-30,'#B7B5EF',3.5);
      ellipse(c,x-5,y,7,5,'#E2B9DC');star(c,x-side*12,y-51,4,'#F6D995',t*20);
    });c.restore();
  }
  if(q.bulb>.01) {
    c.save();c.globalAlpha=q.bulb;c.translate(-12,-127-(1-q.bulb)*20);
    light(c,0,0,47,'rgba(255,220,134,.235)');
    path(c,'M-8 20 C-7 12 -21 6 -18 -8 C-15 -29 16 -29 19 -8 C23 6 9 12 9 20 Z','#FFE0A0','#FFF1C5',2);
    line(c,-6,25,7,25,'#9F85BC',3);line(c,-4,30,5,30,'#9F85BC',3);
    line(c,-5,2,0,10,'#C18F5D',1.6);line(c,5,2,0,10,'#C18F5D',1.6);
    for(let i=0;i<5;i++) {
      const a=-Math.PI+i*Math.PI/4;
      line(c,Math.cos(a)*29,Math.sin(a)*29-5,Math.cos(a)*37,Math.sin(a)*37-5,'#FCE5AD',2.5);
    }c.restore();
  }
  if(q.sleep>.01) {
    c.save();
    for(let i=0;i<3;i++) {
      const phase=m.reduced?i*.25:(t*.35+i*.33)%1,size=7+phase*8,x=92+phase*42,y=-59-phase*60;
      c.globalAlpha=q.sleep*(1-phase);
      path(c,`M${x} ${y} h${size} l${-size} ${size} h${size}`,null,'#CABDEB',2);
    }c.restore();
  }
}
export function stageScale(w,h) { return Math.max(.35,Math.min(w/600,h/420,1.12)); }
export function drawDai(c,m,w,h,avatar='classic') {
  c.clearRect(0,0,w,h);c.save();c.lineCap='round';c.lineJoin='round';
  const isLight=lightTheme(c),theme=avatarTheme(c,avatar);
  c.filter=isLight?'brightness(.88) saturate(1.18) contrast(1.10)':'none';
  const scale=stageScale(w,h),q=m.pose;
  c.translate(w/2+m.offset.x*scale,h/2+7+m.offset.y*scale);c.scale(scale,scale);
  c.save();c.translate(0,q.bob);c.rotate(rad(q.tilt));c.scale(q.sx,q.sy);
  avatarAccent(c,m,avatar,isLight);
  hat(c,m);wand(c,m);fishing(c,m);
  hand(c,q.lx,q.ly,q.lr,q.la,true,q.wand>.3,avatar);hand(c,q.rx,q.ry,q.rr,q.ra,false,q.rod>.3,avatar);
  listen(c,m);personality(c,m);

  const spacing=theme.spacing;
  eye(c,m,-spacing,q.left,q.lw,q.happy,-2,avatar);
  eye(c,m,spacing,q.right,q.rw,q.happy,2,avatar);

  const alpha=clamp(Math.abs(q.tilt)/10+q.brow*.5,.08,.72)*(isLight?220:160)/255;
  if(avatar!=='minimal'){
    for(const [x,dy] of [[-spacing,3],[spacing,-3]]) {
      path(c,`M${x-13} ${-73+dy} Q${x} ${-79+dy} ${x+13} ${-73+dy}`,null,theme.brow,avatar==='cyber'?2.2:2.8);
    }
  }

  const cheekAlpha=(isLight?112:78)*q.cheek*theme.cheekBoost/255;
  ellipse(c,-82,40,avatar==='cute'?15:13,avatar==='cute'?6:5,`rgba(${theme.cheek},${cheekAlpha})`);
  ellipse(c,82,40,avatar==='cute'?15:13,avatar==='cute'?6:5,`rgba(${theme.cheek},${cheekAlpha})`);

  if(q.mouth>.055) {
    const speechWide=clamp(q.mouthWide||0,0,1);
    const mw=(avatar==='cute'?20:22)+q.smile*6+speechWide*13;
    const mh=4+q.mouth*29;
    const upperCurve=53+speechWide*2.2;
    const shape=path(c,`M${-mw/2} 52 Q0 ${upperCurve} ${mw/2} 52 C${mw*.53} ${54+mh} ${-mw*.53} ${54+mh} ${-mw/2} 52`,theme.mouth);
    c.save();c.clip(shape);
    ellipse(c,1.5,53.5+mh,mw*.39,mh*.27,theme.tongue);
    c.restore();
  } else {
    const mouthWidth=avatar==='minimal'?16:avatar==='cute'?18:20;
    path(c,`M${-mouthWidth} 55 C-8 ${55+q.smile*22} 8 ${55+q.smile*22} ${mouthWidth} 55`,null,theme.mouth,avatar==='minimal'?2.6:3.5);
  }

  if(m.state==='thinking'&&!['search','found'].includes(m.gesture)) for(let i=0;i<3;i++) {
    const a=m.reduced?110:90+100*(.5+.5*Math.sin(m.elapsed*4-i));
    ellipse(c,(i-1)*12,118,3,3,`rgba(${theme.dots},${a/255})`);
  }
  c.restore();

  for(const [x,y,,,age,life,kind] of m.particles) {
    c.globalAlpha=clamp(1-age/life,0,1);
    star(c,x,y,3.5*(1-age/life)+1,theme.particles[kind]||theme.particles[0],age*100);
  }
  c.restore();
}
