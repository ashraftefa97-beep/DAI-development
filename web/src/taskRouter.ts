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

export type DaiTaskContext = {
  previousUserText?:string;
  previousAssistantText?:string;
  previousRoute?:DaiTaskRoute;
};

export type DaiRequestEnvelope = {
  id:string;
  text:string;
  source:DaiRequestSource;
  createdAt:number;
  decision:DaiTaskDecision;
};

const linkRe=/(?:\b(?:link|url|website)\b|لينك|رابط)/i;
const strongResearchRe=/(?:ابحث|دور|دوّري|دوري|دورلي|دوريلي|رشح|رشحي|رشحلي|اختارلي|إيه\s+أفضل|ايه\s+افضل|ما\s+هو\s+أفضل|ما\s+هي\s+أفضل|أفضل|افضل|أحسن|احسن|أنسب|انسب|recommend|best|which\s+(?:is|one)|بحث|سعر|اسعار|أسعار|متوفر|متاحة|متاح|فيديو|يوتيوب|youtube|مصدر|مصادر|خبر|اخبار|أخبار|مقارنة|قارن|راجعلي|مراجعة|review|تحقق|اتأكد|تأكد|موعد|current|currently|latest|search|find|video|price|source|compare|news|release|update)/i;
const freshnessRe=/(?:احدث|أحدث|آخر|دلوقتي|حاليا|حالياً|صدر|نزل|تحديث|today|latest|current|release|update)/i;
const smallTalkRe=/^(?:ازيك|إزيك|اخبارك|أخبارك|عامل\s+ايه|عاملة\s+ايه|عامل\s+إيه|عاملة\s+إيه|صباح\s+الخير|مساء\s+الخير|هاي|hi|hello|هلو|اهلا|أهلا|شكرا|شكرًا|تسلم|تمام)(?:\s+(?:النهارده|اليوم|دلوقتي))?[؟?!.]*$/i;
const shortResearchFollowupRe=/^(?:طب|طيب|و|طب\s+و)?\s*(?:ده|دا|دي|دول|السعر|الاسعار|الأسعار|الأرخص|الأفضل|افضل|متوفر|موجود|والتاني|والثاني|البديل|بديل)(?:\s|[؟?!.،]|$)[\s\S]{0,80}$/i;
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

export function routeDaiTask(text:string,context:DaiTaskContext={}):DaiTaskDecision{
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

  if(smallTalkRe.test(normalized)){
    return {route:'chat',confidence:.96,reason:'small talk override',priority:'normal'};
  }

  if(strongResearchRe.test(normalized)||freshnessRe.test(normalized)){
    return {route:'research',confidence:strongResearchRe.test(normalized)?.94:.88,reason:'fresh/search intent',priority:'normal'};
  }

  if(
    context.previousRoute==='research' &&
    normalized.length<=90 &&
    shortResearchFollowupRe.test(normalized)
  ){
    return {route:'research',confidence:.84,reason:'research follow-up from context',priority:'normal'};
  }

  if(complexRe.test(normalized)||normalized.length>900){
    return {route:'complex',confidence:.86,reason:'long/complex reasoning intent',priority:'normal'};
  }

  return {route:'chat',confidence:.76,reason:'general conversation',priority:'normal'};
}

export function createDaiRequest(
  text:string,
  source:DaiRequestSource='text',
  context:DaiTaskContext={}
):DaiRequestEnvelope{
  const clean=normalizedText(text);
  const decision=routeDaiTask(clean,context);
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
