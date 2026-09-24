export const DAI_AVATAR_IDS = [
  'classic','minimal','cute','cyber','soft','pro','hologram','sakura','ocean','solar','midnight','mint',
  'aurora','ember','rose','ice','lime','violet','pearl','crimson','galaxy','desert','lavender','matrix','bonney_nika'
] as const;

export type DaiAvatarStyle = typeof DAI_AVATAR_IDS[number];

export type DaiAvatarOption = {
  id:DaiAvatarStyle;
  label:string;
  desc:string;
  previewMark?:string;
  previewGlyph?:string;
};

export const DAI_AVATAR_OPTIONS: readonly DaiAvatarOption[] = [
  {id:'classic',label:'Classic DAI',desc:'الشكل الأصلي المتوازن والناعم'},
  {id:'minimal',label:'Minimal',desc:'أنظف وأهدأ بألوان محايدة'},
  {id:'cute',label:'Cute',desc:'عيون أكبر ولمسات ألطف ووردية',previewMark:'cute-spark',previewGlyph:'✦'},
  {id:'cyber',label:'Cyber',desc:'ستايل مستقبلي بألوان سيان وبنفسجي',previewMark:'cyber-mark'},
  {id:'soft',label:'Soft',desc:'ألوان باستيل هادية ولمسة دافئة',previewMark:'soft-glow'},
  {id:'pro',label:'Pro',desc:'ستايل أرقى بلمسات ذهبية وتفاصيل أهدأ',previewMark:'pro-mark'},
  {id:'hologram',label:'Hologram',desc:'حلقة ضوئية وخطوط مسح بطابع هولوغرام',previewMark:'hologram-ring'},
  {id:'sakura',label:'Sakura',desc:'وردي كرزي ولمسات بنفسجي ناعمة',previewMark:'sakura-mark'},
  {id:'ocean',label:'Ocean',desc:'أزرق مائي وسيان بطابع هادي',previewMark:'ocean-mark'},
  {id:'solar',label:'Solar',desc:'ذهبي وبرتقالي دافئ وطاقة مشرقة',previewMark:'solar-mark'},
  {id:'midnight',label:'Midnight',desc:'بنفسجي ليلي ونجوم هادية',previewMark:'midnight-mark'},
  {id:'mint',label:'Mint',desc:'أخضر نعناعي وتفاصيل منعشة',previewMark:'mint-mark'},
  {id:'aurora',label:'Aurora',desc:'تركواز وبنفسجي بحركة شفق متدفقة',previewMark:'avatar-new-mark aurora'},
  {id:'ember',label:'Ember',desc:'أحمر وبرتقالي مع شرارات صاعدة',previewMark:'avatar-new-mark ember'},
  {id:'rose',label:'Rose Quartz',desc:'وردي هادي ولمسة ذهبية بحركة ناعمة',previewMark:'avatar-new-mark rose'},
  {id:'ice',label:'Ice',desc:'أزرق ثلجي ولمعات كريستالية هادية',previewMark:'avatar-new-mark ice'},
  {id:'lime',label:'Neon Lime',desc:'ليموني وسيان بخط مسح سريع',previewMark:'avatar-new-mark lime'},
  {id:'violet',label:'Violet Pulse',desc:'بنفسجي وماجنتا بنقاط تدور حول ضي',previewMark:'avatar-new-mark violet'},
  {id:'pearl',label:'Pearl',desc:'أبيض وفضي بوميض بسيط وراقي',previewMark:'avatar-new-mark pearl'},
  {id:'crimson',label:'Crimson',desc:'أحمر داكن مع نبضة ضوئية مميزة',previewMark:'avatar-new-mark crimson'},
  {id:'galaxy',label:'Galaxy',desc:'نيلي ووردي ونجوم تدور حول الشخصية',previewMark:'avatar-new-mark galaxy'},
  {id:'desert',label:'Desert',desc:'رملي وعنبر بحركة موج حر ناعمة',previewMark:'avatar-new-mark desert'},
  {id:'lavender',label:'Lavender',desc:'لافندر ووردي بجزيئات طافية',previewMark:'avatar-new-mark lavender'},
  {id:'matrix',label:'Matrix',desc:'أخضر داكن بخطوط رقمية متحركة',previewMark:'avatar-new-mark matrix'},
  {id:'bonney_nika',label:'Bonney Nika',desc:'ستايل مستوحى من بوني بهيئة نيكا — سحب بيضاء وطاقة مرحة ولمسات ذهبية',previewMark:'avatar-new-mark bonney-nika'}
];

const DAI_AVATAR_STYLE_SET = new Set<string>(DAI_AVATAR_IDS);

export function isDaiAvatarStyle(value:unknown): value is DaiAvatarStyle {
  return typeof value === 'string' && DAI_AVATAR_STYLE_SET.has(value);
}
