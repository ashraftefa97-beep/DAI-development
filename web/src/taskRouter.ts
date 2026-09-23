export type DaiTaskRoute =
  | 'research'
  | 'code'
  | 'image'
  | 'complex'
  | 'chat';

export type DaiTaskDecision = {
  route:DaiTaskRoute;
  confidence:number;
  reason:string;
};

const researchRe=/(?:ابحث|دور|دوّري|دوري|بحث|احدث|أحدث|آخر|النهارده|اليوم|سعر|اسعار|أسعار|لينك|رابط|فيديو|يوتيوب|youtube|موقع|مصدر|مصادر|خبر|اخبار|أخبار|مقارنة|قارن|حل مشكلة|حل للمشكلة|راجعلي|تحقق|اتأكد|تأكد|latest|search|find|link|video|price|source|compare)/i;
const codeRe=/(?:اكتبلي?\s+كود|اكتب\s+كود|برمج|برمجة|برمجه|مطور|تطوير\s+(?:موقع|تطبيق)|اعمل\s+(?:موقع|صفحة|صفحه|تطبيق|سكريبت)|صلح\s+(?:الكود|الخطأ|البج)|عدل\s+(?:الكود|الموقع|الصفحة|الصفحه)|كود\s+(?:html|css|javascript|typescript|react|python|sql)|\bhtml\b|\bcss\b|\bjavascript\b|\btypescript\b|\breact\b|\bnode(?:\.js)?\b|\bpython\b|\bsql\b|\bapi\b|\bregex\b|\bdebug\b|\brefactor\b|\bfunction\b|\bclass\b|\bcomponent\b|github\s+(?:repo|repository)|سكريبت|بايثون|جافاسكريبت|تايب سكريبت|ريأكت|رياكت|قاعدة بيانات|داتابيز)/i;
const codeFalsePositiveRe=/(?:كود خصم|promo code|discount code|رمز تحقق|verification code|باركود|barcode|qr code)/i;
const imageRe=/(?:اعمل(?:ي|لي)?\s+(?:صورة|صوره|بوستر|poster|wallpaper)|ولّد(?:ي)?\s+(?:صورة|صوره)|انشئ(?:ي)?\s+(?:صورة|صوره)|صمم(?:ي)?\s+(?:صورة|صوره|بوستر)|generate\s+(?:an?\s+)?image|create\s+(?:an?\s+)?image|image generation|text to image)/i;
const complexRe=/(?:حلل(?:ي)?\s+بالتفصيل|تحليل\s+عميق|خطة\s+كاملة|خطه\s+كامله|معمارية|architecture|استراتيجية|استراتيجيه|خطوات\s+تفصيلية|اشرح\s+بالتفصيل|فكر\s+بعمق|reasoning|deep analysis|comprehensive|بالتفصيل\s+الممل)/i;

export function routeDaiTask(text:string):DaiTaskDecision{
  const normalized=String(text||'').trim();
  if(!normalized)return {route:'chat',confidence:1,reason:'empty'};

  if(imageRe.test(normalized)){
    return {route:'image',confidence:.96,reason:'image-generation intent'};
  }

  if(!codeFalsePositiveRe.test(normalized)&&codeRe.test(normalized)){
    return {route:'code',confidence:.95,reason:'coding intent'};
  }

  if(researchRe.test(normalized)){
    return {route:'research',confidence:.92,reason:'fresh/search intent'};
  }

  if(complexRe.test(normalized)||normalized.length>900){
    return {route:'complex',confidence:.84,reason:'long/complex reasoning intent'};
  }

  return {route:'chat',confidence:.72,reason:'general conversation'};
}
