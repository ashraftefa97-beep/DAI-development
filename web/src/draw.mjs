// Canvas equivalents of DaiFace's QPainter paths. No head, body, or ears.
import { clamp } from './motion.mjs';
import { getAvatarVisualDNA } from './avatarVisualDNA.mjs';
import { createAnimationPlan } from './animationDirector.mjs';
import { stabilizeRenderedHands, avatarSwapEnvelope, sanitizePoseForRender } from './renderStabilizer.mjs';
import { avatarAllowsLegacyAccessory, avatarAllowsHandGesture } from './avatarBehaviorRegistry.mjs';
import { renderAvatarStateFx } from './avatarStateFx.mjs';
import { handIntentScale } from './poseGuard.mjs';
const rad = a => a * Math.PI / 180;
function lightTheme(c) {
  return c.canvas?.ownerDocument?.documentElement?.dataset?.daiTheme === 'light';
}
export const DAI_AVATAR_STYLES=['classic','minimal','cute','cyber','soft','pro','hologram','sakura','ocean','solar','midnight','mint','aurora','ember','rose','ice','lime','violet','pearl','crimson','galaxy','desert','lavender','matrix'];

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
  if(avatar==='aurora')return {
    eyeA:isLight?'#8FE4D7':'#D9FFF7', eyeB:isLight?'#5CC8C1':'#8DE8DE', eyeC:isLight?'#967AD7':'#C6B0FF',
    eyeStroke:isLight?'rgba(67,139,137,.18)':'rgba(135,239,224,.10)', happy:isLight?'#4E8C87':'#CDF9F0',
    brow:isLight?'rgba(64,119,122,.62)':'rgba(156,230,224,.62)', cheek:isLight?'79,176,166':'106,218,204',
    mouth:isLight?'#50827F':'#BCEDE4', tongue:isLight?'#78AAA5':'#91CFC5', dots:'137,219,207',
    particles:['#8FF0DC','#BDA8FF','#A8DFFF'], eyeW:1.02,eyeH:.98,spacing:49,stroke:8,cheekBoost:.48
  };
  if(avatar==='ember')return {
    eyeA:isLight?'#F7A26D':'#FFD4B6', eyeB:isLight?'#D96B4E':'#F28B66', eyeC:isLight?'#9F3E54':'#D65B72',
    eyeStroke:isLight?'rgba(146,70,47,.19)':'rgba(255,150,105,.10)', happy:isLight?'#9B573E':'#FFD0AE',
    brow:isLight?'rgba(126,63,47,.65)':'rgba(244,139,98,.64)', cheek:isLight?'221,91,62':'246,115,74',
    mouth:isLight?'#99503E':'#F3B08C', tongue:isLight?'#C86D5E':'#E68570', dots:'231,139,97',
    particles:['#FF9A5E','#FFCA70','#E66770'], eyeW:1.00,eyeH:1.02,spacing:49,stroke:9,cheekBoost:.72
  };
  if(avatar==='rose')return {
    eyeA:isLight?'#F3B7C6':'#FFF1F5', eyeB:isLight?'#D58AA4':'#F4BACE', eyeC:isLight?'#B58B74':'#E1C09D',
    eyeStroke:isLight?'rgba(147,88,109,.16)':'rgba(255,190,211,.08)', happy:isLight?'#9A6173':'#FFE4EC',
    brow:isLight?'rgba(126,76,101,.58)':'rgba(235,192,207,.58)', cheek:isLight?'220,117,151':'242,151,180',
    mouth:isLight?'#9B5D70':'#F3CEDA', tongue:isLight?'#CA8295':'#DFA0AF', dots:'226,182,194',
    particles:['#F5BECF','#E8CAA2','#E0C9EA'], eyeW:1.04,eyeH:1.00,spacing:48,stroke:9,cheekBoost:.82
  };
  if(avatar==='ice')return {
    eyeA:isLight?'#B5E8F4':'#EEFCFF', eyeB:isLight?'#81CADF':'#BCEAF4', eyeC:isLight?'#799BD9':'#A8C0F4',
    eyeStroke:isLight?'rgba(80,137,159,.17)':'rgba(194,240,250,.10)', happy:isLight?'#5B8C9D':'#E1F8FC',
    brow:isLight?'rgba(73,118,140,.60)':'rgba(188,230,241,.60)', cheek:isLight?'106,175,197':'137,210,226',
    mouth:isLight?'#5D8997':'#CDEAF0', tongue:isLight?'#84ADB8':'#9FC9D2', dots:'164,221,235',
    particles:['#D4F7FF','#AFCBFF','#F3FBFF'], eyeW:.98,eyeH:1.00,spacing:50,stroke:7,cheekBoost:.34
  };
  if(avatar==='lime')return {
    eyeA:isLight?'#B7E873':'#E8FFB9', eyeB:isLight?'#84C858':'#B9EA82', eyeC:isLight?'#4CA7A0':'#75CEC6',
    eyeStroke:isLight?'rgba(86,135,62,.18)':'rgba(191,244,126,.10)', happy:isLight?'#638B4D':'#DCF6B7',
    brow:isLight?'rgba(79,118,62,.62)':'rgba(190,230,139,.62)', cheek:isLight?'120,184,84':'151,220,105',
    mouth:isLight?'#62824E':'#CFE7AE', tongue:isLight?'#86A96C':'#A4C88A', dots:'166,222,113',
    particles:['#C4F47B','#7CE2C4','#E6FFA6'], eyeW:1.01,eyeH:.96,spacing:49,stroke:8,cheekBoost:.45
  };
  if(avatar==='violet')return {
    eyeA:isLight?'#D5A7F0':'#F4E0FF', eyeB:isLight?'#A66AD2':'#CEA0EF', eyeC:isLight?'#D15B9A':'#F18CBD',
    eyeStroke:isLight?'rgba(111,64,145,.18)':'rgba(220,171,255,.10)', happy:isLight?'#7C4F96':'#EED7FF',
    brow:isLight?'rgba(96,58,124,.64)':'rgba(216,174,242,.62)', cheek:isLight?'167,91,188':'205,124,222',
    mouth:isLight?'#774A8D':'#DFBFEA', tongue:isLight?'#A472B2':'#C391CD', dots:'201,151,225',
    particles:['#D7A6F4','#FF91C6','#BCA4FF'], eyeW:1.04,eyeH:.98,spacing:49,stroke:9,cheekBoost:.63
  };
  if(avatar==='pearl')return {
    eyeA:isLight?'#ECE9EA':'#FFFFFF', eyeB:isLight?'#CFC9D2':'#EAE6EC', eyeC:isLight?'#AAB4C8':'#CBD5E6',
    eyeStroke:isLight?'rgba(103,103,115,.14)':'rgba(255,255,255,.07)', happy:isLight?'#77727D':'#F2EEF4',
    brow:isLight?'rgba(91,87,99,.52)':'rgba(225,220,230,.52)', cheek:isLight?'180,164,175':'214,202,211',
    mouth:isLight?'#736D77':'#E0D7E1', tongue:isLight?'#9D939F':'#BDB2BF', dots:'211,207,218',
    particles:['#FFFFFF','#DCE7F6','#F5EAF5'], eyeW:.96,eyeH:.98,spacing:48,stroke:6,cheekBoost:.30
  };
  if(avatar==='crimson')return {
    eyeA:isLight?'#E78A91':'#FFC8CC', eyeB:isLight?'#B94752':'#E56872', eyeC:isLight?'#562C48':'#8A456A',
    eyeStroke:isLight?'rgba(122,46,53,.20)':'rgba(244,111,122,.11)', happy:isLight?'#884047':'#F7B9BE',
    brow:isLight?'rgba(105,42,51,.68)':'rgba(225,103,115,.66)', cheek:isLight?'186,64,75':'225,84,96',
    mouth:isLight?'#7E3A42':'#E4A4AA', tongue:isLight?'#A95D67':'#C57780', dots:'203,99,109',
    particles:['#F36D79','#A24569','#FFB0B6'], eyeW:1.01,eyeH:1.02,spacing:50,stroke:9,cheekBoost:.55
  };
  if(avatar==='galaxy')return {
    eyeA:isLight?'#9AB6F0':'#DDE8FF', eyeB:isLight?'#746ED0':'#A59CEF', eyeC:isLight?'#CE72B9':'#ED9DD9',
    eyeStroke:isLight?'rgba(72,83,148,.19)':'rgba(165,172,255,.10)', happy:isLight?'#59669A':'#DCE2FF',
    brow:isLight?'rgba(68,73,125,.64)':'rgba(182,179,242,.62)', cheek:isLight?'115,104,188':'152,138,224',
    mouth:isLight?'#5B5C8F':'#CAC7EC', tongue:isLight?'#8581AC':'#A7A1CA', dots:'166,156,231',
    particles:['#8EA7FF','#E387CF','#81E3E7'], eyeW:1.03,eyeH:.94,spacing:50,stroke:8,cheekBoost:.44
  };
  if(avatar==='desert')return {
    eyeA:isLight?'#E7C694':'#FFE6B8', eyeB:isLight?'#C7975B':'#E8BC79', eyeC:isLight?'#9B694D':'#C78B6D',
    eyeStroke:isLight?'rgba(124,89,49,.17)':'rgba(240,199,126,.09)', happy:isLight?'#8A6B48':'#F1D3A1',
    brow:isLight?'rgba(109,81,50,.60)':'rgba(223,186,125,.60)', cheek:isLight?'193,133,83':'224,165,106',
    mouth:isLight?'#856348':'#DFC29A', tongue:isLight?'#AE8162':'#C99E7C', dots:'216,179,124',
    particles:['#EBC17D','#D99A67','#F8E2B7'], eyeW:.98,eyeH:1.00,spacing:49,stroke:8,cheekBoost:.47
  };
  if(avatar==='lavender')return {
    eyeA:isLight?'#DCCCF2':'#F5EEFF', eyeB:isLight?'#B8A0DE':'#D4C3F1', eyeC:isLight?'#D7A4C8':'#EDC6DF',
    eyeStroke:isLight?'rgba(110,91,145,.15)':'rgba(222,205,248,.08)', happy:isLight?'#817199':'#EADFF8',
    brow:isLight?'rgba(99,82,128,.56)':'rgba(215,198,235,.56)', cheek:isLight?'175,144,193':'209,176,224',
    mouth:isLight?'#7F6C90':'#D8C8E4', tongue:isLight?'#A491AF':'#BEA9C7', dots:'204,187,226',
    particles:['#DCCAF5','#F2C9E1','#C7D7FA'], eyeW:1.04,eyeH:1.00,spacing:48,stroke:8,cheekBoost:.58
  };
  if(avatar==='matrix')return {
    eyeA:isLight?'#8EDB88':'#C9FFC4', eyeB:isLight?'#52B564':'#82E28D', eyeC:isLight?'#247C5B':'#4EAD83',
    eyeStroke:isLight?'rgba(49,125,64,.20)':'rgba(119,239,137,.11)', happy:isLight?'#4B8A50':'#BDF6C2',
    brow:isLight?'rgba(46,106,55,.66)':'rgba(133,225,145,.64)', cheek:isLight?'67,154,78':'88,197,101',
    mouth:isLight?'#4B7E50':'#A9DDAE', tongue:isLight?'#6DA374':'#84BD8A', dots:'107,207,118',
    particles:['#68E67A','#42A86B','#B8FFBE'], eyeW:.97,eyeH:.92,spacing:50,stroke:7,cheekBoost:.35
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

const AVATAR_MOTION_PROFILES={
  classic:{x:.7,y:1.2,tilt:.45,scale:.004,speed:.85,phase:.0},
  minimal:{x:.25,y:.55,tilt:.18,scale:.002,speed:.62,phase:.4},
  cute:{x:1.15,y:1.65,tilt:.78,scale:.006,speed:1.18,phase:.8},
  cyber:{x:.65,y:.8,tilt:.28,scale:.004,speed:1.62,phase:1.2},
  soft:{x:.55,y:1.35,tilt:.38,scale:.004,speed:.72,phase:1.6},
  pro:{x:.38,y:.7,tilt:.22,scale:.0025,speed:.58,phase:2.0},
  hologram:{x:.8,y:.9,tilt:.25,scale:.005,speed:1.75,phase:2.4},
  sakura:{x:.85,y:1.45,tilt:.55,scale:.005,speed:.93,phase:2.8},
  ocean:{x:1.0,y:1.05,tilt:.42,scale:.0035,speed:.78,phase:3.2},
  solar:{x:.62,y:1.2,tilt:.48,scale:.005,speed:1.05,phase:3.6},
  midnight:{x:.42,y:.92,tilt:.35,scale:.003,speed:.52,phase:4.0},
  mint:{x:.72,y:1.0,tilt:.40,scale:.004,speed:.88,phase:4.4},
  aurora:{x:1.12,y:1.2,tilt:.48,scale:.005,speed:.82,phase:4.8},
  ember:{x:.75,y:1.5,tilt:.62,scale:.006,speed:1.28,phase:5.2},
  rose:{x:.62,y:1.15,tilt:.44,scale:.004,speed:.76,phase:5.6},
  ice:{x:.35,y:.82,tilt:.22,scale:.003,speed:.68,phase:6.0},
  lime:{x:.92,y:1.05,tilt:.56,scale:.005,speed:1.34,phase:6.4},
  violet:{x:.78,y:1.18,tilt:.52,scale:.005,speed:1.02,phase:6.8},
  pearl:{x:.28,y:.65,tilt:.16,scale:.002,speed:.49,phase:7.2},
  crimson:{x:.58,y:1.22,tilt:.50,scale:.006,speed:1.16,phase:7.6},
  galaxy:{x:1.0,y:1.12,tilt:.44,scale:.005,speed:.73,phase:8.0},
  desert:{x:.66,y:.96,tilt:.33,scale:.003,speed:.64,phase:8.4},
  lavender:{x:.72,y:1.32,tilt:.42,scale:.004,speed:.70,phase:8.8},
  matrix:{x:.44,y:.72,tilt:.20,scale:.003,speed:1.52,phase:9.2}
};
function avatarMotionEnvelope(m){
  const start=Number(m.avatarVariantStartedAt)||0;
  const end=Number(m.avatarVariantUntil)||0;
  if(end<=start)return 1;
  const p=clamp((m.elapsed-start)/(end-start),0,1);
  const smooth=x=>x*x*(3-2*x);
  const intro=smooth(clamp(p/.12,0,1));
  const settle=smooth(clamp((1-p)/.18,0,1));
  return .72+.28*Math.min(intro,settle+.12);
}

function applyAvatarMotion(c,m,avatar='classic'){
  const p=AVATAR_MOTION_PROFILES[avatar]||AVATAR_MOTION_PROFILES.classic;
  const v=m.avatarVariantMotion||{};
  const semantic=m.requestedGesture||m.gesture;
  const calm=['idle','relax','breathe','sleep','wait_patient','voicewait','meditate'].includes(semantic);
  const activity=calm?1:.28;
  const reduced=m.reduced?(m.avatarVariantReducedIntensity||.22):1;
  const envelope=avatarMotionEnvelope(m);
  const cadence=Number(v.cadence)||1;
  const speed=p.speed*(Number(v.speed)||1)*cadence;
  const t=m.elapsed*speed+p.phase+(Number(v.phase)||0);
  const xAmp=p.x*(.72+(Number(v.x)||1)*.34);
  const yAmp=p.y*(.72+(Number(v.y)||1)*.30);
  const tiltAmp=p.tilt*(.74+(Number(v.tilt)||1)*.32);
  const scaleAmp=p.scale*(.75+(Number(v.scale)||.004)*58);
  const orbit=(Number(v.orbit)||0)*7;
  const bounce=(Number(v.bounce)||0)*6;
  const nod=(Number(v.nod)||0)*1.6;
  const lean=(Number(v.lean)||0)*4.2;
  const shake=(Number(v.shake)||0)*2.4;
  const breath=Number(v.breath)||1;
  const drift=(Number(v.drift)||0)*5.2;
  const microX=Math.sin(t*5.3+1.7)*shake;
  const microY=Math.cos(t*4.7+.6)*shake*.38;
  const density=Number(m.animationPlan?.motionDensity)||1;
  const intensity=activity*reduced*envelope*density;
  const dx=(Math.sin(t)*xAmp+Math.cos(t*.61+1.2)*orbit+Math.sin(t*.37)*drift+microX)*intensity;
  const dy=(Math.sin(t*1.31+p.phase*.21)*yAmp-Math.abs(Math.sin(t*1.7))*bounce+microY)*intensity;
  const tilt=(Math.sin(t*.83+p.phase*.37)*tiltAmp+Math.sin(t*1.9)*nod+Math.sin(t*.44)*lean)*intensity;
  const scale=1+Math.sin(t*1.11+p.phase*.13)*scaleAmp*breath*intensity;
  c.translate(dx,dy);c.rotate(rad(tilt));c.scale(scale,scale);
}

function avatarLibraryAccent(c,m,theme){
  if(!m.avatarVariantId)return;
  const accent=String(m.avatarVariantAccent||'pulse-1');
  const variant=Math.max(1,Number(accent.match(/-(\d+)$/)?.[1]||1));
  const family=accent.replace(/-\d+$/,'');
  const reduced=m.reduced?.24:1;
  const fxAlpha=Number(m.animationPlan?.fxAlpha)||1;
  const alpha=(.10+.025*((variant-1)%3))*reduced*fxAlpha;
  const primary=theme.particles?.[(variant-1)%Math.max(1,theme.particles?.length||1)]||theme.happy;
  const t=m.elapsed*(.7+variant*.18);
  c.save();c.globalAlpha=alpha;
  if(['scan','code','laser','holo','line','frame'].includes(family)){
    const y=-72+((m.elapsed*(24+variant*7))%144);
    line(c,-104,y,104,y,primary,variant===2?1.3:1);
  }else if(['spark','embers','flare','glint','crystal'].includes(family)){
    const rise=(m.elapsed*(18+variant*5))%86;
    star(c,-94+variant*5,64-rise,1.6+variant*.25,primary,-8+variant*6);
    star(c,96-variant*4,84-rise*.72,1.2+variant*.2,primary,10-variant*4);
  }else if(['stars','orbit','ribbon','petal','float','drift','rose','leaf'].includes(family)){
    ellipse(c,Math.cos(t)*108,Math.sin(t)*54,1.4+variant*.35,1.4+variant*.35,primary);
    ellipse(c,Math.cos(t+Math.PI)*96,Math.sin(t+Math.PI)*46,1.1+variant*.28,1.1+variant*.28,primary);
  }else if(['wave','heat'].includes(family)){
    const y=72+Math.sin(t)*4;
    path(c,`M-108 ${y} Q-72 ${y-6-variant} -36 ${y} T36 ${y} T108 ${y}`,null,primary,1);
  }else{
    ellipse(c,0,-2,114+variant*2,88+variant,null,primary,.8+variant*.15);
  }
  c.restore();
}

function avatarAccent(c,m,avatar,isLight) {
  if(avatar==='aurora'){
    c.save();const a=m.reduced?.24:.23+.09*Math.sin(m.elapsed*1.3);c.globalAlpha=a;
    const col=isLight?'rgba(77,169,161,.62)':'rgba(133,237,221,.62)';
    path(c,'M-112 18 Q-58 -34 0 5 T112 -10',null,col,1.3);
    path(c,'M-104 32 Q-42 -10 8 22 T104 9',null,isLight?'rgba(133,105,193,.48)':'rgba(196,170,255,.48)',1);
    c.restore();
  }else if(avatar==='ember'){
    c.save();c.globalAlpha=m.reduced?.28:.26+.09*Math.sin(m.elapsed*2.1);
    const y=((m.elapsed*26)%76)-20;star(c,-92,56-y,2.3,isLight?'#D76A48':'#FF8B5E',-8);star(c,91,74-y*.75,1.9,isLight?'#C74455':'#EF6270',12);
    ellipse(c,0,-95,2.7,2.7,isLight?'#D97A49':'#FFA05D');c.restore();
  }else if(avatar==='rose'){
    c.save();c.globalAlpha=.38;
    const sway=Math.sin(m.elapsed*.85)*8;star(c,-103+sway*.18,3,2.4,isLight?'#D28AA1':'#F1B4C7',-10);star(c,103-sway*.18,5,2.1,isLight?'#B9957F':'#E0C0A0',9);c.restore();
  }else if(avatar==='ice'){
    c.save();c.globalAlpha=m.reduced?.28:.24+.07*Math.sin(m.elapsed*1.1);
    const ice=isLight?'rgba(91,164,188,.58)':'rgba(193,239,249,.58)';
    for(const [x,y] of [[-104,-20],[105,15],[-82,72]]){line(c,x-4,y,x+4,y,ice,1);line(c,x,y-4,x,y+4,ice,1);}
    c.restore();
  }else if(avatar==='lime'){
    c.save();const scan=-62+((m.elapsed*42)%124);c.globalAlpha=m.reduced?.22:.20+.08*Math.sin(m.elapsed*2.4);
    line(c,-106,scan,106,scan,isLight?'rgba(103,176,67,.60)':'rgba(181,239,116,.60)',1.1);c.restore();
  }else if(avatar==='violet'){
    c.save();c.globalAlpha=.34;
    const a=m.elapsed*.72;ellipse(c,Math.cos(a)*106,Math.sin(a)*42,2.4,2.4,isLight?'#A16CCE':'#D4A4F6');ellipse(c,Math.cos(a+Math.PI)*106,Math.sin(a+Math.PI)*42,2,2,isLight?'#CC659C':'#EE91BE');c.restore();
  }else if(avatar==='pearl'){
    c.save();c.globalAlpha=m.reduced?.20:.18+.08*Math.sin(m.elapsed*.9);
    const pearl=isLight?'rgba(151,151,163,.48)':'rgba(255,255,255,.50)';ellipse(c,0,-96,2.2,2.2,pearl);line(c,-88,83,88,83,pearl,1);c.restore();
  }else if(avatar==='crimson'){
    c.save();const pulse=m.reduced?.23:.20+.12*(.5+.5*Math.sin(m.elapsed*2.5));c.globalAlpha=pulse;
    ellipse(c,0,-3,118,91,null,isLight?'rgba(172,54,64,.48)':'rgba(239,91,103,.48)',1.2);c.restore();
  }else if(avatar==='galaxy'){
    c.save();c.globalAlpha=.36;const a=m.elapsed*.48;
    star(c,Math.cos(a)*107,Math.sin(a)*67,2.2,isLight?'#7086D4':'#AFC2FF',0);star(c,Math.cos(a+2.1)*95,Math.sin(a+2.1)*61,1.8,isLight?'#C46AAE':'#EF9AD8',8);star(c,Math.cos(a+4.2)*102,Math.sin(a+4.2)*55,1.6,isLight?'#67BFC4':'#91EAEC',-8);c.restore();
  }else if(avatar==='desert'){
    c.save();c.globalAlpha=m.reduced?.20:.18+.06*Math.sin(m.elapsed*.8);
    const sand=isLight?'rgba(173,128,73,.52)':'rgba(232,190,121,.52)';
    const yy=75+Math.sin(m.elapsed*1.1)*3;path(c,`M-112 ${yy} Q-72 ${yy-7} -32 ${yy} T48 ${yy} T112 ${yy}`,null,sand,1.1);c.restore();
  }else if(avatar==='lavender'){
    c.save();c.globalAlpha=.30;const lift=(m.elapsed*13)%80;
    ellipse(c,-100,62-lift,2.1,2.1,isLight?'#B7A0DD':'#DDCBF7');ellipse(c,97,79-(lift*.7),1.8,1.8,isLight?'#D4A8C5':'#F0C8E1');c.restore();
  }else if(avatar==='matrix'){
    c.save();c.globalAlpha=m.reduced?.22:.20+.07*Math.sin(m.elapsed*2.6);
    const green=isLight?'rgba(55,144,72,.62)':'rgba(112,235,128,.62)';
    for(const x of [-98,-76,82,101]){const y=-72+((m.elapsed*(24+(x%7))+Math.abs(x))%142);line(c,x,y,x,y+10,green,1);}c.restore();
  }else if(avatar==='sakura'){
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
    mint:isLight?['#29483D','rgba(76,154,121,.23)','#76CDA8','#55967D','rgba(116,216,174,.20)']:['#0E1D18','rgba(135,224,189,.12)','#9AE7C5','#6CC7A1','rgba(139,231,194,.23)'],
    aurora:isLight?['#244A48','rgba(78,164,157,.23)','#78D8CD','#539A94','rgba(129,226,214,.22)']:['#0C1E1D','rgba(130,236,222,.13)','#9AF1E6','#6DCEC4','rgba(139,239,227,.25)'],
    ember:isLight?['#5B3026','rgba(203,91,61,.24)','#DD7555','#A84D3F','rgba(238,114,73,.23)']:['#25120E','rgba(248,116,74,.14)','#F79269','#CE6249','rgba(255,126,79,.26)'],
    rose:isLight?['#594047','rgba(190,118,142,.21)','#CE93A5','#98707B','rgba(226,159,181,.18)']:['#21181C','rgba(239,174,195,.11)','#EDB6C8','#BE8D9D','rgba(246,181,201,.20)'],
    ice:isLight?['#354B51','rgba(105,171,190,.20)','#9FD9E8','#719BA8','rgba(178,229,241,.17)']:['#101A1D','rgba(181,232,243,.10)','#D2F4FA','#9CCAD5','rgba(198,241,249,.20)'],
    lime:isLight?['#3B4D2B','rgba(126,185,75,.23)','#9DD066','#71964C','rgba(173,228,100,.20)']:['#151D0F','rgba(183,237,111,.12)','#C7F388','#95C866','rgba(198,246,125,.23)'],
    violet:isLight?['#493253','rgba(158,94,185,.23)','#B779D6','#87589C','rgba(204,123,223,.21)']:['#1C1322','rgba(211,132,234,.13)','#DCA1F1','#AC76C1','rgba(221,142,239,.24)'],
    pearl:isLight?['#4A484D','rgba(144,139,150,.17)','#C9C3CC','#8F8993','rgba(213,207,216,.13)']:['#19181B','rgba(222,217,226,.08)','#F2EEF4','#BDB7C0','rgba(241,237,244,.15)'],
    crimson:isLight?['#4D2227','rgba(176,62,72,.25)','#C65B65','#893C45','rgba(222,72,84,.22)']:['#1C0C0F','rgba(232,77,89,.14)','#E5737D','#AC4A54','rgba(244,86,98,.25)'],
    galaxy:isLight?['#32374E','rgba(105,111,181,.23)','#889AE1','#626C9F','rgba(154,137,220,.21)']:['#10121F','rgba(158,154,234,.13)','#B1B8F4','#7F87CA','rgba(181,157,240,.24)'],
    desert:isLight?['#514332','rgba(180,139,84,.22)','#C7A066','#8F7049','rgba(218,176,108,.18)']:['#1D1710','rgba(226,184,117,.11)','#E0BF82','#B18C5B','rgba(235,193,126,.21)'],
    lavender:isLight?['#48414F','rgba(157,135,185,.20)','#B7A2CE','#837596','rgba(202,178,220,.18)']:['#1A1720','rgba(211,190,232,.10)','#D9C9EA','#A999B9','rgba(224,202,239,.20)'],
    matrix:isLight?['#203F28','rgba(68,157,84,.24)','#69C879','#4A9258','rgba(105,215,121,.22)']:['#09170D','rgba(105,225,122,.13)','#86E993','#5BBB69','rgba(115,236,130,.25)']
  };
  const p=palettes[avatar]||palettes.classic;
  return {fill:p[0],outer:p[1],edge:p[2],palm:p[3],glow:p[4]};
}
function handPathForStyle(style,grip){
  if(grip)return 'M-13 11 C-21 0 -11 -16 -4 -11 C4 -23 18 -11 15 -1 C23 8 7 22 -5 18 Q-12 18 -13 11 Z';
  const shapes={
    open:'M-14 13 C-23 6 -24 -3 -19 -5 Q-16 -7 -11 1 L-15 -17 C-17 -24 -10 -27 -7 -19 L-3 -5 L-5 -24 C-5 -31 3 -31 4 -24 L6 -7 L8 -22 C9 -29 16 -26 15 -19 L14 -3 Q21 -18 24 -11 C27 -8 16 17 10 20 C1 24 -9 22 -14 13 Z',
    mitten:'M-16 13 C-25 4 -22 -10 -13 -12 C-11 -23 0 -27 5 -19 C13 -25 22 -18 20 -8 C28 0 20 18 9 22 C0 25 -10 22 -16 13 Z',
    rounded:'M-15 13 C-23 5 -22 -5 -17 -8 C-14 -10 -10 -7 -8 -2 L-9 -16 C-10 -24 -2 -27 2 -20 L4 -5 L7 -18 C9 -25 16 -22 15 -14 L14 -2 C20 -12 25 -6 23 2 C21 12 15 20 7 22 C-2 24 -10 21 -15 13 Z',
    angular:'M-17 15 L-23 3 L-18 -7 L-12 -3 L-14 -20 L-7 -25 L-2 -7 L0 -27 L8 -24 L8 -6 L13 -22 L20 -17 L15 -2 L23 -12 L27 -4 L17 18 L7 23 L-7 22 Z',
    formal:'M-13 14 C-20 7 -20 -2 -15 -6 L-10 0 L-11 -18 C-11 -24 -5 -26 -2 -19 L1 -5 L3 -22 C4 -27 10 -27 12 -20 L12 -3 L18 -11 C22 -15 26 -9 23 -3 L14 18 C5 23 -7 22 -13 14 Z',
    wire:'M-15 13 C-23 5 -22 -5 -17 -8 L-9 0 L-10 -19 L-4 -23 L0 -5 L2 -25 L8 -22 L8 -4 L13 -20 L18 -16 L14 -1 L22 -9 L25 -4 L15 18 C7 23 -8 22 -15 13 Z',
    petal:'M-14 14 C-22 7 -20 -4 -15 -8 C-10 -11 -7 -5 -6 0 C-8 -13 -7 -24 0 -25 C7 -24 7 -13 5 -1 C7 -8 11 -18 16 -16 C22 -13 17 -2 12 5 C20 -2 25 4 21 11 C15 22 -5 25 -14 14 Z',
    wave:'M-16 12 C-23 4 -20 -6 -15 -9 C-10 -12 -7 -3 -7 2 C-9 -13 -5 -23 1 -23 C7 -23 8 -10 6 -1 C9 -10 14 -17 18 -13 C23 -9 17 0 13 5 C22 1 25 8 20 14 C12 23 -7 24 -16 12 Z',
    ray:'M-16 13 L-22 3 L-16 -5 L-8 1 L-12 -16 L-4 -21 L0 -4 L1 -23 L9 -20 L8 -3 L15 -17 L22 -11 L14 4 L25 1 L24 10 L10 22 L-7 21 Z',
    crescent:'M-15 13 C-22 6 -21 -4 -15 -9 C-11 -13 -7 -8 -6 -2 C-7 -14 -3 -22 3 -21 C9 -20 10 -9 7 -1 C12 -10 19 -12 21 -6 C24 1 16 10 11 14 C6 19 -6 23 -15 13 Z',
    leaf:'M-16 14 C-23 7 -19 -5 -13 -8 C-7 -11 -5 -3 -5 2 C-7 -12 -1 -23 5 -21 C12 -19 9 -7 6 -1 C12 -9 19 -10 21 -4 C24 4 15 12 10 17 C2 23 -8 22 -16 14 Z',
    ribbon:'M-16 12 C-22 6 -20 -4 -14 -9 C-8 -13 -5 -5 -5 2 C-5 -14 2 -24 8 -20 C14 -16 9 -3 7 1 C14 -7 21 -5 22 1 C23 8 15 16 9 19 C1 23 -9 21 -16 12 Z',
    flame:'M-15 15 C-24 8 -19 -4 -12 -7 C-9 -14 -4 -20 1 -25 C4 -16 10 -15 9 -6 C14 -12 21 -9 20 -2 C26 5 18 17 10 21 C0 26 -8 22 -15 15 Z',
    jewel:'M-15 13 L-21 4 L-17 -7 L-10 -3 L-10 -18 L-4 -24 L1 -7 L5 -22 L12 -18 L10 -2 L18 -11 L24 -5 L16 16 L7 22 L-7 21 Z',
    crystal:'M-16 14 L-23 5 L-17 -5 L-10 -3 L-12 -18 L-4 -26 L1 -8 L6 -23 L14 -17 L11 -1 L20 -9 L25 -1 L17 16 L7 23 L-7 21 Z',
    ringed:'M-15 13 C-22 6 -21 -5 -15 -8 C-10 -11 -7 -3 -7 2 L-8 -17 C-8 -23 -2 -26 2 -20 L4 -4 L7 -19 C8 -24 15 -23 15 -15 L13 -1 C20 -10 24 -5 22 2 C19 15 10 22 2 23 C-6 23 -11 20 -15 13 Z',
    orbit:'M-15 13 C-23 6 -21 -5 -16 -8 C-11 -12 -7 -5 -6 1 C-8 -14 -3 -24 3 -23 C10 -22 9 -9 6 -1 C11 -10 18 -13 21 -7 C25 0 18 12 11 18 C4 23 -7 22 -15 13 Z',
    sand:'M-16 14 C-23 8 -21 -3 -15 -8 C-9 -13 -5 -6 -5 1 C-6 -12 0 -21 6 -20 C12 -18 11 -7 7 -1 C14 -7 21 -5 22 2 C23 10 15 17 8 20 C0 23 -9 21 -16 14 Z',
    digital:'M-17 15 L-23 5 L-18 -6 L-11 -2 L-13 -19 L-6 -24 L-1 -6 L1 -25 L8 -22 L9 -5 L14 -20 L20 -15 L15 -1 L24 -9 L27 -2 L18 17 L8 23 L-7 22 Z'
  };
  return shapes[style]||shapes.open;
}
function drawHandMark(c,mark,style){
  if(mark==='none')return;
  const col=style.palm;
  if(mark==='palmArc'){ path(c,'M-10 3 Q1 -2 5 8',null,col,1.5);return; }
  if(mark==='heart'){ path(c,'M-5 2 C-8 -2 -13 1 -11 6 C-8 11 -2 13 0 15 C2 13 8 11 11 6 C13 1 8 -2 5 2 C3 4 1 5 0 7 C-1 5 -3 4 -5 2 Z',null,col,1.1);return; }
  if(mark==='circuit'){ line(c,-8,3,0,3,col,1.1);line(c,0,3,0,9,col,1.1);line(c,0,7,7,7,col,1.1);ellipse(c,-8,3,1.4,1.4,col);ellipse(c,7,7,1.4,1.4,col);return; }
  if(mark==='spark'){ star(c,0,5,3.1,col,12);return; }
  if(mark==='cuff'){ line(c,-11,13,9,13,col,1.2);line(c,-8,16,6,16,col,1);return; }
  if(mark==='rings'){ ellipse(c,0,5,7,4,null,col,1);ellipse(c,0,5,3,2,null,col,.8);return; }
  if(mark==='petal'){ path(c,'M0 11 C-7 7 -8 0 0 -4 C8 0 7 7 0 11 Z',null,col,1.1);return; }
  if(mark==='bubble'){ ellipse(c,-3,4,3,3,null,col,1);ellipse(c,5,0,2,2,null,col,1);return; }
  if(mark==='sun'){ ellipse(c,0,5,3,3,null,col,1);for(const a of [0,90,180,270])line(c,Math.cos(rad(a))*5,5+Math.sin(rad(a))*5,Math.cos(rad(a))*8,5+Math.sin(rad(a))*8,col,.8);return; }
  if(mark==='star'){ star(c,0,5,3.2,col,0);return; }
  if(mark==='leaf'){ path(c,'M-5 9 Q0 -3 7 0 Q5 8 -5 9',null,col,1.1);return; }
  if(mark==='ribbon'){ path(c,'M-7 8 Q0 -1 7 5 Q1 12 -6 6',null,col,1);return; }
  if(mark==='ember'){ path(c,'M0 12 C-5 7 -4 2 1 -4 C1 1 7 3 5 8 C4 11 2 12 0 12 Z',null,col,1.1);return; }
  if(mark==='gem'){ path(c,'M0 -2 L7 4 L0 12 L-7 4 Z',null,col,1);line(c,-7,4,7,4,col,.8);return; }
  if(mark==='frost'){ line(c,-6,5,6,5,col,1);line(c,0,-1,0,11,col,1);line(c,-4,1,4,9,col,.8);line(c,4,1,-4,9,col,.8);return; }
  if(mark==='bolt'){ path(c,'M2 -2 L-4 5 L1 5 L-2 13 L7 3 L2 3 Z',null,col,1.1);return; }
  if(mark==='orbit'){ ellipse(c,0,5,8,3,null,col,1);ellipse(c,7,4,1.5,1.5,col);return; }
  if(mark==='pearl'){ ellipse(c,0,5,3.5,3.5,col);return; }
  if(mark==='pulse'){ path(c,'M-9 6 L-4 6 L-1 1 L2 11 L5 5 L9 5',null,col,1.2);return; }
  if(mark==='flower'){ star(c,0,5,3.6,col,45);ellipse(c,0,5,1.2,1.2,col);return; }
  if(mark==='code'){ line(c,-7,1,-2,1,col,1);line(c,1,4,7,4,col,1);line(c,-5,8,4,8,col,1);return; }
}
function hand(c,x,y,rotation,opacity,mirror,grip,avatar='classic') {
  if(opacity<.01)return;
  const dna=getAvatarVisualDNA(avatar);
  c.save();c.translate(x,y);c.rotate(rad(rotation));c.scale(mirror?-1:1,1);c.globalAlpha=opacity;
  const d=handPathForStyle(dna.hand,grip);
  const style=handTheme(c,avatar);
  c.save();c.shadowColor=style.glow;c.shadowBlur=avatar==='hologram'||avatar==='cyber'||avatar==='matrix'?11:6;
  path(c,d,dna.hand==='wire'?null:style.fill,style.outer,dna.hand==='wire'?3.2:8);c.restore();
  path(c,d,null,style.edge,dna.hand==='digital'||dna.hand==='angular'?2:2.4);
  drawHandMark(c,dna.handMark,style);
  c.restore();
}
const AVATAR_FACE_SHAPES={
  balanced:{eyeRadius:.47,browStroke:2.8,cheekX:13,cheekY:5,mouthWidth:20,mouthStroke:3.5,speechBase:22,happyStroke:7},
  minimal:{eyeRadius:.28,browStroke:0,cheekX:10,cheekY:4,mouthWidth:16,mouthStroke:2.6,speechBase:19,happyStroke:5.5},
  cute:{eyeRadius:.50,browStroke:3.0,cheekX:15,cheekY:6,mouthWidth:18,mouthStroke:3.7,speechBase:20,happyStroke:7.5},
  tech:{eyeRadius:.22,browStroke:2.2,cheekX:11,cheekY:4,mouthWidth:18,mouthStroke:2.8,speechBase:20,happyStroke:6.2},
  elegant:{eyeRadius:.34,browStroke:2.4,cheekX:11,cheekY:4.5,mouthWidth:18,mouthStroke:3.0,speechBase:20,happyStroke:6.5},
  soft:{eyeRadius:.46,browStroke:2.7,cheekX:14,cheekY:5.5,mouthWidth:19,mouthStroke:3.3,speechBase:21,happyStroke:7},
  warm:{eyeRadius:.30,browStroke:2.7,cheekX:13,cheekY:5,mouthWidth:20,mouthStroke:3.4,speechBase:22,happyStroke:6.8},
  fluid:{eyeRadius:.40,browStroke:2.6,cheekX:12,cheekY:4.5,mouthWidth:19,mouthStroke:3.2,speechBase:21,happyStroke:6.8},
  cosmic:{eyeRadius:.38,browStroke:2.6,cheekX:12,cheekY:4.5,mouthWidth:19,mouthStroke:3.2,speechBase:21,happyStroke:6.8}
};
const AVATAR_FACE_SHAPE_BY_STYLE={
  classic:'balanced',minimal:'minimal',cute:'cute',
  cyber:'tech',hologram:'tech',matrix:'tech',lime:'tech',
  pro:'elegant',pearl:'elegant',ice:'elegant',
  soft:'soft',rose:'soft',lavender:'soft',sakura:'soft',
  solar:'warm',ember:'warm',crimson:'warm',desert:'warm',
  ocean:'fluid',mint:'fluid',aurora:'fluid',
  midnight:'cosmic',galaxy:'cosmic',violet:'cosmic'
};
function avatarFaceShape(avatar='classic'){
  return AVATAR_FACE_SHAPES[AVATAR_FACE_SHAPE_BY_STYLE[avatar]||'balanced'];
}

function buildEyePath(shape,w,h,r){
  const p=new Path2D();
  const poly=pts=>{p.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)p.lineTo(pts[i][0],pts[i][1]);p.closePath();};
  if(shape==='dot'){const rr=Math.min(w,h)*.30;p.ellipse(0,0,rr,rr,0,0,Math.PI*2);return p;}
  if(shape==='round'||shape==='pearl'||shape==='sun'){const rr=Math.min(w,h)*.49;p.ellipse(0,0,rr,rr,0,0,Math.PI*2);return p;}
  if(shape==='slim'){p.roundRect(-w*.52,-h*.31,w*1.04,h*.62,Math.min(r,h*.28));return p;}
  if(shape==='hex'||shape==='gem')return poly([[-w*.43,-h*.48],[w*.33,-h*.48],[w*.53,0],[w*.33,h*.48],[-w*.43,h*.48],[-w*.55,0]]),p;
  if(shape==='square'){p.roundRect(-w*.46,-h*.46,w*.92,h*.92,Math.min(5,r));return p;}
  if(shape==='sharp'){return poly([[-w*.56,-h*.22],[w*.44,-h*.48],[w*.56,h*.18],[-w*.38,h*.46]]),p;}
  if(shape==='crystal'){return poly([[-w*.44,-h*.50],[w*.12,-h*.55],[w*.50,-h*.12],[w*.36,h*.50],[-w*.28,h*.56],[-w*.54,h*.08]]),p;}
  if(shape==='bolt'){return poly([[-w*.36,-h*.52],[w*.16,-h*.52],[-w*.02,-h*.08],[w*.44,-h*.08],[-w*.24,h*.55],[-w*.06,h*.10],[-w*.46,h*.10]]),p;}
  if(shape==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5;const rr=i%2===0?Math.min(w,h)*.48:Math.min(w,h)*.22;const x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?p.lineTo(x,y):p.moveTo(x,y);}p.closePath();return p;}
  if(shape==='crescent'){p.moveTo(w*.34,-h*.50);p.bezierCurveTo(-w*.48,-h*.45,-w*.55,h*.38,w*.25,h*.52);p.bezierCurveTo(-w*.10,h*.18,-w*.08,-h*.17,w*.34,-h*.50);p.closePath();return p;}
  if(shape==='petal'||shape==='leaf'){p.moveTo(0,-h*.55);p.bezierCurveTo(w*.58,-h*.22,w*.50,h*.34,0,h*.55);p.bezierCurveTo(-w*.50,h*.34,-w*.58,-h*.22,0,-h*.55);p.closePath();return p;}
  if(shape==='droplet'){p.moveTo(0,-h*.58);p.bezierCurveTo(w*.55,-h*.12,w*.50,h*.45,0,h*.56);p.bezierCurveTo(-w*.50,h*.45,-w*.55,-h*.12,0,-h*.58);p.closePath();return p;}
  if(shape==='flame'){p.moveTo(w*.05,-h*.60);p.bezierCurveTo(w*.44,-h*.16,w*.56,h*.28,w*.14,h*.54);p.bezierCurveTo(-w*.35,h*.62,-w*.58,h*.14,-w*.22,-h*.20);p.bezierCurveTo(-w*.06,-h*.02,-w*.04,-h*.34,w*.05,-h*.60);p.closePath();return p;}
  if(shape==='ribbon'){return poly([[-w*.52,-h*.30],[w*.38,-h*.52],[w*.54,h*.25],[-w*.36,h*.50]]),p;}
  if(shape==='orbit'){p.ellipse(0,0,w*.46,h*.46,0,0,Math.PI*2);return p;}
  if(shape==='dune'){p.moveTo(-w*.52,h*.20);p.quadraticCurveTo(0,-h*.58,w*.52,h*.20);p.quadraticCurveTo(0,h*.55,-w*.52,h*.20);p.closePath();return p;}
  if(shape==='butterfly'){p.moveTo(0,0);p.bezierCurveTo(-w*.58,-h*.52,-w*.60,h*.35,-w*.08,h*.18);p.bezierCurveTo(-w*.02,h*.42,w*.02,h*.42,w*.08,h*.18);p.bezierCurveTo(w*.60,h*.35,w*.58,-h*.52,0,0);p.closePath();return p;}
  if(shape==='cloud'){p.moveTo(-w*.52,h*.22);p.bezierCurveTo(-w*.62,-h*.12,-w*.28,-h*.42,-w*.05,-h*.20);p.bezierCurveTo(w*.06,-h*.58,w*.55,-h*.48,w*.48,-h*.08);p.bezierCurveTo(w*.70,h*.08,w*.48,h*.45,w*.12,h*.40);p.lineTo(-w*.34,h*.40);p.bezierCurveTo(-w*.55,h*.42,-w*.65,h*.30,-w*.52,h*.22);p.closePath();return p;}
  if(shape==='holo'){p.roundRect(-w*.50,-h*.43,w,h*.86,Math.min(9,r));return p;}
  p.roundRect(-w/2,-h/2,w,h,r);return p;
}
function eye(c,m,x,openness,width,happy,tilt,avatar='classic') {
  const q=m.pose,theme=avatarTheme(c,avatar),shape=avatarFaceShape(avatar),dna=getAvatarVisualDNA(avatar);
  const variant=m.avatarVariantMotion||{};
  const gazeX=(Number(variant.gazeX)||0)*4.8;
  const gazeY=(Number(variant.gazeY)||0)*3.4;
  c.save();c.translate(x+q.gaze_x+gazeX,-17+q.gaze_y+gazeY);c.rotate(rad(tilt));
  const blink=m.blinkTime<.19?1-.97*Math.sin(Math.PI*m.blinkTime/.19):1;
  let w=35*width*theme.eyeW,h=Math.max(4,75*openness*blink*theme.eyeH);
  if(dna.eye==='dot'){w*=.75;h*=.72;}
  if(dna.eye==='slim'){w*=1.08;h*=.78;}
  if(dna.eye==='star'||dna.eye==='sun'||dna.eye==='pearl'){w*=1.02;h*=.76;}
  const r=Math.min(w*shape.eyeRadius,h/2);
  const g=c.createLinearGradient(-w/2,-h/2,w/2,h/2);
  g.addColorStop(0,theme.eyeA);g.addColorStop(.55,theme.eyeB);g.addColorStop(1,theme.eyeC);
  const eyePath=buildEyePath(dna.eye,w,h,r);
  c.globalAlpha=1-happy*.94;c.fillStyle=g;c.fill(eyePath);c.strokeStyle=theme.eyeStroke;c.lineWidth=theme.stroke;c.stroke(eyePath);

  if(['cute','sakura','rose','lavender','pearl'].includes(avatar)&&happy<.72){
    c.globalAlpha=(1-happy)*.62;
    ellipse(c,-w*.17,-h*.18,Math.max(1.4,w*.065),Math.max(1.7,h*.07),'rgba(255,255,255,.90)');
  }
  if(['cyber','hologram','matrix','lime'].includes(avatar)&&happy<.78){
    c.globalAlpha=(1-happy)*.50;
    line(c,-w*.32,0,w*.32,0,'rgba(255,255,255,.68)',1.1);
  }
  if(dna.eye==='orbit'&&happy<.75){
    c.globalAlpha=(1-happy)*.45;ellipse(c,0,0,w*.62,h*.34,null,theme.happy,1);ellipse(c,w*.55,0,1.7,1.7,theme.happy);
  }
  if(dna.eye==='sun'&&happy<.70){
    c.globalAlpha=(1-happy)*.35;for(const a of [0,90,180,270])line(c,Math.cos(rad(a))*w*.48,Math.sin(rad(a))*h*.40,Math.cos(rad(a))*w*.62,Math.sin(rad(a))*h*.52,theme.happy,.8);
  }

  c.globalAlpha=happy;
  path(c,'M-22 5 C-16 -19 16 -19 22 5',null,theme.happy,shape.happyStroke);
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

function drawRestMouth(c,m,avatar,theme,faceShape,q){
  const dna=getAvatarVisualDNA(avatar);
  const y=55,smile=q.smile*22,w=faceShape.mouthWidth,stroke=faceShape.mouthStroke;
  const style=dna.mouth;
  if(style==='dash'){ line(c,-10,y,10,y,theme.mouth,2.2);return; }
  if(style==='w'){
    path(c,'M-18 54 Q-10 66 0 57 Q10 66 18 54',null,theme.mouth,stroke);return;
  }
  if(style==='digital'||style==='segment'||style==='code'){
    line(c,-16,54,-6,58,theme.mouth,2.1);line(c,-3,58,5,58,theme.mouth,2.1);line(c,8,58,16,53,theme.mouth,2.1);return;
  }
  if(style==='softArc'){ path(c,'M-18 54 Q0 68 18 54',null,theme.mouth,3);return; }
  if(style==='calm'){ path(c,'M-15 55 Q0 62 15 55',null,theme.mouth,2.6);return; }
  if(style==='blossom'){
    path(c,'M-17 55 Q-9 64 0 57 Q9 64 17 55',null,theme.mouth,2.8);
    ellipse(c,0,58,1.7,1.3,theme.mouth);return;
  }
  if(style==='wave'||style==='duneWave'){
    path(c,'M-20 56 Q-10 49 0 57 Q10 65 20 54',null,theme.mouth,3);return;
  }
  if(style==='bright'){ path(c,'M-22 53 Q0 72 22 53',null,theme.mouth,3.4);line(c,-23,52,-27,49,theme.mouth,1.2);line(c,23,52,27,49,theme.mouth,1.2);return; }
  if(style==='sleepy'){ path(c,'M-13 57 Q0 61 13 57',null,theme.mouth,2.5);return; }
  if(style==='tiny'){ path(c,'M-9 56 Q0 61 9 56',null,theme.mouth,2.4);return; }
  if(style==='leafArc'){ path(c,'M-16 58 Q-3 48 17 54 Q4 65 -16 58',null,theme.mouth,2.4);return; }
  if(style==='ribbon'){ path(c,'M-18 57 Q-6 48 3 57 Q11 63 20 52',null,theme.mouth,2.8);return; }
  if(style==='smirk'){ path(c,'M-18 58 Q2 62 19 51',null,theme.mouth,3);return; }
  if(style==='diamond'){ path(c,'M-11 56 L0 50 L11 56 L0 62 Z',null,theme.mouth,2.1);return; }
  if(style==='crystalArc'){ path(c,'M-18 56 L-8 61 L0 55 L9 61 L18 54',null,theme.mouth,2.3);return; }
  if(style==='zigzag'){ path(c,'M-19 57 L-11 51 L-3 59 L5 52 L13 59 L20 53',null,theme.mouth,2.2);return; }
  if(style==='orbitArc'){ path(c,'M-18 56 Q0 67 18 55',null,theme.mouth,2.7);ellipse(c,20,53,1.7,1.7,theme.mouth);return; }
  if(style==='pulse'){ path(c,'M-20 57 L-10 57 L-5 50 L1 64 L7 54 L12 57 L20 57',null,theme.mouth,2.3);return; }
  if(style==='cosmic'){ path(c,'M-18 55 Q0 66 18 54',null,theme.mouth,2.7);star(c,22,52,1.7,theme.mouth,0);return; }
  if(style==='lavenderArc'){ path(c,'M-17 55 Q-5 65 5 58 Q12 54 18 52',null,theme.mouth,2.7);return; }
  path(c,`M${-w} 55 C-8 ${55+smile} 8 ${55+smile} ${w} 55`,null,theme.mouth,stroke);
}

function avatarSignatureVisual(c,m,avatar,isLight,theme){
  const dna=getAvatarVisualDNA(avatar);
  const signature=dna.signature;
  const t=m.reduced?0:m.elapsed;
  const variant=Math.max(1,Number(String(m.avatarVariantId||'').match(/-(\d+)$/)?.[1]||1));
  const primary=theme.particles?.[0]||theme.happy;
  const secondary=theme.particles?.[1]||theme.mouth;
  const fxAlpha=Number(m.animationPlan?.fxAlpha)||1;
  const alpha=(m.reduced?.24:(.28+.05*Math.sin(t*(.8+(variant%4)*.13))))*fxAlpha;
  c.save();c.globalAlpha=alpha;

  if(signature==='orbit'){
    c.save();c.rotate(rad(-7));ellipse(c,0,-2,119,88,null,primary,1);ellipse(c,Math.cos(t*.45)*116,Math.sin(t*.45)*42-2,2.3,2.3,secondary);c.restore();
  }else if(signature==='baseline'){
    line(c,-42,88,-12,88,primary,1);line(c,-6,88,6,88,secondary,1);line(c,12,88,42,88,primary,1);
  }else if(signature==='heartBurst'){
    for(const [x,y,s] of [[-108,-20,4],[106,10,3.3]]){
      c.save();c.translate(x,y+Math.sin(t*1.4+x)*4);c.scale(s,s);path(c,'M0 3 C-6 -1 -3 -7 0 -4 C3 -7 6 -1 0 3',primary);c.restore();
    }
  }else if(signature==='visorScan'){
    line(c,-78,-18,78,-18,primary,1.3);line(c,-88,-31,-80,-31,secondary,1.5);line(c,80,-5,88,-5,secondary,1.5);
    const y=-52+((t*42)%104);line(c,-80,y,80,y,secondary,.7);
  }else if(signature==='cloudHalo'){
    for(const [x,r] of [[-46,20],[-15,27],[20,24],[50,17]])ellipse(c,x,-91,r,r*.42,null,primary,1);
  }else if(signature==='goldFrame'){
    path(c,'M0 -109 L7 -101 L0 -93 L-7 -101 Z',null,primary,1.4);
    line(c,-111,-45,-96,-45,primary,1.4);line(c,-111,-45,-111,-30,primary,1.4);
    line(c,111,-45,96,-45,primary,1.4);line(c,111,-45,111,-30,primary,1.4);
  }else if(signature==='echo'){
    c.save();c.translate(Math.sin(t*1.2)*4,0);ellipse(c,0,-2,121,91,null,primary,1);c.globalAlpha*=.55;ellipse(c,0,-2,130,98,null,secondary,.8);c.restore();
  }else if(signature==='petalCrown'){
    for(let i=0;i<5;i++){
      const x=(i-2)*22,y=-97-Math.abs(i-2)*4;
      c.save();c.translate(x,y);c.rotate(rad((i-2)*16));path(c,'M0 -9 C7 -4 7 5 0 10 C-7 5 -7 -4 0 -9',null,primary,1);c.restore();
    }
  }else if(signature==='bubbleWave'){
    for(let i=0;i<4;i++){const rise=(t*(10+i*3)+i*21)%74;ellipse(c,-106+i*68,68-rise,2.5+i*.7,2.5+i*.7,null,i%2?secondary:primary,1);}
    const yy=82+Math.sin(t*1.2)*3;path(c,`M-108 ${yy} Q-72 ${yy-8} -36 ${yy} T36 ${yy} T108 ${yy}`,null,primary,1.1);
  }else if(signature==='sunHalo'){
    for(let i=0;i<12;i++){const a=i*30+t*5,rr=i%2?112:118;line(c,Math.cos(rad(a))*103,Math.sin(rad(a))*78-4,Math.cos(rad(a))*rr,Math.sin(rad(a))*88-4,primary,1);}
    ellipse(c,0,-98,4,4,secondary);
  }else if(signature==='moon'){
    c.save();c.translate(-92,-74);path(c,'M8 -13 C-11 -6 -12 14 7 19 C-2 8 -1 -4 8 -13 Z',primary);c.restore();star(c,94,-70,2.4,secondary,0);star(c,76,-96,1.6,primary,0);
  }else if(signature==='sprout'){
    line(c,0,-91,0,-111,primary,1.2);path(c,'M0 -103 Q-20 -116 -22 -98 Q-8 -94 0 -103',null,primary,1.2);path(c,'M0 -101 Q20 -116 23 -98 Q9 -94 0 -101',null,secondary,1.2);
  }else if(signature==='auroraRibbon'){
    path(c,'M-112 -70 Q-58 -118 0 -82 T112 -96',null,primary,1.4);path(c,'M-105 -55 Q-38 -96 10 -68 T105 -75',null,secondary,1);
  }else if(signature==='flameCrown'){
    for(let i=-1;i<=1;i++){c.save();c.translate(i*28,-96-Math.abs(i)*5);c.scale(1+i*.08,1);path(c,'M0 12 C-9 5 -6 -5 0 -15 C1 -7 9 -5 7 3 C6 9 3 12 0 12 Z',i===0?primary:secondary);c.restore();}
  }else if(signature==='roseGem'){
    path(c,'M0 -112 L14 -99 L0 -84 L-14 -99 Z',null,primary,1.4);line(c,-14,-99,14,-99,secondary,.9);line(c,0,-112,0,-84,secondary,.9);
  }else if(signature==='iceCrown'){
    path(c,'M-32 -91 L-20 -119 L-5 -96 L8 -124 L21 -96 L35 -116 L43 -91',null,primary,1.3);
  }else if(signature==='lightning'){
    path(c,'M-113 -35 L-99 -52 L-104 -35 L-91 -35 L-110 -11 L-104 -29 Z',null,primary,1.4);
    path(c,'M113 25 L99 8 L104 25 L91 25 L110 49 L104 31 Z',null,secondary,1.2);
  }else if(signature==='violetOrbit'){
    c.save();c.rotate(rad(-18));ellipse(c,0,-3,126,64,null,primary,1.1);ellipse(c,Math.cos(t*.55)*121,Math.sin(t*.55)*61-3,3,3,secondary);c.restore();
  }else if(signature==='pearlChain'){
    for(let i=0;i<9;i++){const a=Math.PI*(1.08+i*.105);ellipse(c,Math.cos(a)*102,Math.sin(a)*72-8,2.4,2.4,i%2?secondary:primary);}
  }else if(signature==='heartbeat'){
    path(c,'M-105 84 L-63 84 L-53 73 L-42 98 L-29 79 L-18 84 L20 84 L33 76 L44 91 L55 84 L105 84',null,primary,1.4);
  }else if(signature==='planetRing'){
    c.save();c.rotate(rad(-19));ellipse(c,0,-1,128,66,null,primary,1.1);ellipse(c,96,-42,5,5,secondary);c.restore();star(c,-96,-68,2.2,primary,0);
  }else if(signature==='duneSun'){
    ellipse(c,68,-82,11,11,null,secondary,1.1);path(c,'M-112 82 Q-62 57 -12 82 T90 80 T116 78',null,primary,1.3);
  }else if(signature==='butterfly'){
    for(const side of [-1,1]){c.save();c.translate(side*101,-45+Math.sin(t*1.1+side)*5);c.scale(side,1);path(c,'M0 0 C-14 -17 -27 -7 -15 8 C-25 20 -7 26 0 8 C7 26 25 20 15 8 C27 -7 14 -17 0 0',null,side<0?primary:secondary,1);c.restore();}
  }else if(signature==='codeRain'){
    for(let i=0;i<7;i++){const x=-108+i*36;const y=-76+((t*(19+i*2)+i*27)%145);line(c,x,y,x,y+8+(i%3)*4,i%2?primary:secondary,1);if(i%2===0)line(c,x+4,y+3,x+10,y+3,primary,.8);}
  }
  c.restore();
}

export function stageScale(w,h) { return Math.max(.35,Math.min(w/600,h/420,1.12)); }
export function drawDai(c,m,w,h,avatar='classic') {
  c.clearRect(0,0,w,h);c.save();c.lineCap='round';c.lineJoin='round';
  const isLight=lightTheme(c),theme=avatarTheme(c,avatar),faceShape=avatarFaceShape(avatar);
  sanitizePoseForRender(m.pose);
  const plan=createAnimationPlan(m,{width:w,height:h});
  m.animationPlan=plan;
  c.filter=isLight?'brightness(.88) saturate(1.18) contrast(1.10)':'none';
  const scale=stageScale(w,h),q=m.pose;
  c.translate(w/2+m.offset.x*scale,h/2+7+m.offset.y*scale);c.scale(scale,scale);
  c.globalAlpha*=avatarSwapEnvelope(m);
  c.save();c.translate(0,q.bob);c.rotate(rad(q.tilt));c.scale(q.sx,q.sy);
  applyAvatarMotion(c,m,avatar);
  if(plan.channels.avatarFx)avatarAccent(c,m,avatar,isLight);
  if(plan.channels.signatureFx)avatarSignatureVisual(c,m,avatar,isLight,theme);
  if(plan.channels.libraryFx)avatarLibraryAccent(c,m,theme);
  renderAvatarStateFx(c,m,avatar,theme,plan);

  const requestedGesture=String(m.requestedGesture||m.gesture||'idle');
  if(plan.accessory==='hat'&&avatarAllowsLegacyAccessory(avatar,'hat',requestedGesture))hat(c,m);
  else if(plan.accessory==='wand'&&avatarAllowsLegacyAccessory(avatar,'wand',requestedGesture))wand(c,m);
  else if(plan.accessory==='fishing'&&avatarAllowsLegacyAccessory(avatar,'fishing',requestedGesture))fishing(c,m);
  const variantMotion=m.avatarVariantMotion||{};
  const handBias=(Number(variantMotion.handBias)||0)*5.5;
  const handLift=(Number(variantMotion.handLift)||0)*4.2;
  const allowHands=avatarAllowsHandGesture(avatar,requestedGesture);
  const handIntent=handIntentScale({
    requestedGesture,
    activeGesture:m.gesture||requestedGesture,
    gestureTime:m.gestureTime||0,
    allowHands
  });
  const renderedHands=stabilizeRenderedHands(
    {x:q.lx-handBias,y:q.ly-handLift,alpha:q.la*plan.handScale*handIntent},
    {x:q.rx+handBias,y:q.ry-handLift,alpha:q.ra*plan.handScale*handIntent},
    {mode:plan.mode,reduced:plan.reduced}
  );
  if(handIntent>.01&&plan.handScale>.01){
    hand(c,renderedHands.left.x,renderedHands.left.y,q.lr,renderedHands.left.alpha,true,plan.accessory==='wand'&&q.wand>.3,avatar);
    hand(c,renderedHands.right.x,renderedHands.right.y,q.rr,renderedHands.right.alpha,false,plan.accessory==='fishing'&&q.rod>.3,avatar);
  }
  if(plan.overlays.listen)listen(c,m);
  if(plan.overlays.personality)personality(c,m);

  const spacing=theme.spacing;
  eye(c,m,-spacing,q.left,q.lw,q.happy,-2,avatar);
  eye(c,m,spacing,q.right,q.rw,q.happy,2,avatar);

  if(faceShape.browStroke>0){
    for(const [x,dy] of [[-spacing,3],[spacing,-3]]) {
      path(c,`M${x-13} ${-73+dy} Q${x} ${-79+dy} ${x+13} ${-73+dy}`,null,theme.brow,faceShape.browStroke);
    }
  }

  const cheekAlpha=(isLight?112:78)*q.cheek*theme.cheekBoost/255;
  ellipse(c,-82,40,faceShape.cheekX,faceShape.cheekY,`rgba(${theme.cheek},${cheekAlpha})`);
  ellipse(c,82,40,faceShape.cheekX,faceShape.cheekY,`rgba(${theme.cheek},${cheekAlpha})`);

  if(q.mouth>.055) {
    const speechWide=clamp(q.mouthWide||0,0,1);
    const mw=faceShape.speechBase+q.smile*6+speechWide*13;
    const mh=4+q.mouth*29;
    const upperCurve=53+speechWide*2.2;
    const shape=path(c,`M${-mw/2} 52 Q0 ${upperCurve} ${mw/2} 52 C${mw*.53} ${54+mh} ${-mw*.53} ${54+mh} ${-mw/2} 52`,theme.mouth);
    c.save();c.clip(shape);
    ellipse(c,1.5,53.5+mh,mw*.39,mh*.27,theme.tongue);
    c.restore();
  } else {
    drawRestMouth(c,m,avatar,theme,faceShape,q);
  }

  if(plan.overlays.thoughtDots) for(let i=0;i<3;i++) {
    const a=m.reduced?110:90+100*(.5+.5*Math.sin(m.elapsed*4-i));
    ellipse(c,(i-1)*12,118,3,3,`rgba(${theme.dots},${a/255})`);
  }
  c.restore();

  if(plan.channels.particles) for(const [x,y,,,age,life,kind] of m.particles) {
    c.globalAlpha=clamp(1-age/life,0,1);
    star(c,x,y,3.5*(1-age/life)+1,theme.particles[kind]||theme.particles[0],age*100);
  }
  c.restore();
}
