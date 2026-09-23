export type DaiTaskRoute =
  | 'command'
  | 'link'
  | 'research'
  | 'code'
  | 'image'
  | 'complex'
  | 'chat';

export type DaiRequestSource = 'text' | 'voice' | 'live' | 'desktop';
export type DaiRequestPriority = 'interrupt' | 'high' | 'normal' | 'low';

export type DaiTaskDecision = {
  route:DaiTaskRoute;
  confidence:number;
  reason:string;
  priority:DaiRequestPriority;
};

export type DaiRequestEnvelope = {
  id:string;
  text:string;
  source:DaiRequestSource;
  createdAt:number;
  decision:DaiTaskDecision;
};

const linkRe=/(?:\b(?:link|url|website)\b|لينك|رابط)/i;
const researchRe=/(?:ابحث|دور|دوّري|دوري|دورلي|رشح|رشحي|رشحلي|اختارلي|إيه\s+أفضل|ايه\s+افضل|ما\s+هو\s+أفضل|ما\s+هي\s+أفضل|أفضل|افضل|أحسن|احسن|أنسب|انسب|recommend|best|which\s+(?:is|one)|بحث|احدث|أحدث|آخر|النهارده|اليوم|دلوقتي|حاليا|حالياً|سعر|اسعار|أسعار|متوفر|متاحة|متاح|فيديو|يوتيوب|youtube|مصدر|مصادر|خبر|اخبار|أخبار|مقارنة|قارن|راجعلي|مراجعة|review|تحقق|اتأكد|تأكد|موعد|صدر|نزل|تحديث|current|currently|latest|today|search|find|video|price|source|compare|news|release|update)/i;
const codeRe=/(?:اكتبلي?\s+كود|اكتب\s+كود|برمج|برمجة|برمجه|مطور|تطوير\s+(?:موقع|تطبيق)|اعمل\s+(?:موقع|صفحة|صفحه|تطبيق|سكريبت)|صلح\s+(?:الكود|الخطأ|البج)|عدل\s+(?:الكود|الموقع|الصفحة|الصفحه)|كود\s+(?:html|css|javascript|typescript|react|python|sql)|\bhtml\b|\bcss\b|\bjavascript\b|\btypescript\b|\breact\b|\bnode(?:\.js)?\b|\bpython\b|\bsql\b|\bapi\b|\bregex\b|\bdebug\b|\brefactor\b|\bfunction\b|\bclass\b|\bcomponent\b|github\s+(?:repo|repository)|سكريبت|بايثون|جافاسكريبت|تايب سكريبت|ريأكت|رياكت|قاعدة بيانات|داتابيز)/i;
const codeFalsePositiveRe=/(?:كود خصم|promo code|discount code|رمز تحقق|verification code|باركود|barcode|qr code)/i;
const imageRe=/(?:اعمل(?:ي|لي)?\s+(?:صورة|صوره|بوستر|poster|wallpaper)|ولّد(?:ي)?\s+(?:صورة|صوره)|انشئ(?:ي)?\s+(?:صورة|صوره)|صمم(?:ي)?\s+(?:صورة|صوره|بوستر)|generate\s+(?:an?\s+)?image|create\s+(?:an?\s+)?image|image generation|text to image)/i;
const complexRe=/(?:حلل(?:ي)?\s+بالتفصيل|تحليل\s+عميق|خطة\s+كاملة|خطه\s+كامله|معمارية|architecture|استراتيجية|استراتيجيه|خطوات\s+تفصيلية|اشرح\s+بالتفصيل|فكر\s+بعمق|reasoning|deep analysis|comprehensive|بالتفصيل\s+الممل)/i;

const hardInterruptRe=/^(?:وقف|وقفي|اسكت|اسكتي|الغ[يِ]?|الغي|cancel|stop|mute)(?:\s|$)/i;
const commandRe=/^(?:(?:افتح|افتحي|شغل|شغلي|اقفل|اقفلي|اغلق|اغلقي|close|open|launch)\s+|(?:روح|روحي|ركز|ركزي|حول|حولي)\s+(?:على|ل)?\s*|(?:ارفع|ارفعي|زود|زوّد|وطي|قلل|قللي|اكتم|mute)\s*|(?:وقف|وقفي|كمل|كملي|pause|resume|play|قدم|قدمي|رجع|رجعي)\s+(?:الفيديو|المقطع|الصوت|الموسيقى|الاغنية|الأغنية)|(?:التالي|السابق|next\s+track|previous\s+track|fullscreen|ملء\s+الشاشة))/i;

function normalizedText(value:string){
  return String(value||'').replace(/\s+/g,' ').trim();
}

function makeId(){
  if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'){
    return crypto.randomUUID();
  }
  return 'dai-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
}

export function routeDaiTask(text:string):DaiTaskDecision{
  const normalized=normalizedText(text);
  if(!normalized)return {route:'chat',confidence:1,reason:'empty',priority:'low'};

  if(hardInterruptRe.test(normalized)){
    return {route:'command',confidence:.99,reason:'interrupt/control intent',priority:'interrupt'};
  }

  if(commandRe.test(normalized)){
    return {route:'command',confidence:.97,reason:'direct device/control command',priority:'high'};
  }

  if(imageRe.test(normalized)){
    return {route:'image',confidence:.96,reason:'image-generation intent',priority:'normal'};
  }

  if(!codeFalsePositiveRe.test(normalized)&&codeRe.test(normalized)){
    return {route:'code',confidence:.95,reason:'coding intent',priority:'normal'};
  }

  if(linkRe.test(normalized)){
    return {route:'link',confidence:.97,reason:'link/navigation intent',priority:'normal'};
  }

  if(researchRe.test(normalized)){
    return {route:'research',confidence:.93,reason:'fresh/search intent',priority:'normal'};
  }

  if(complexRe.test(normalized)||normalized.length>900){
    return {route:'complex',confidence:.86,reason:'long/complex reasoning intent',priority:'normal'};
  }

  return {route:'chat',confidence:.76,reason:'general conversation',priority:'normal'};
}

export function createDaiRequest(
  text:string,
  source:DaiRequestSource='text'
):DaiRequestEnvelope{
  const clean=normalizedText(text);
  const decision=routeDaiTask(clean);
  return {
    id:makeId(),
    text:clean,
    source,
    createdAt:Date.now(),
    decision:{
      ...decision,
      priority:source==='live'&&decision.priority==='normal'?'high':decision.priority
    }
  };
}
