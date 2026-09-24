const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const INTENT_RULES=[
  ['farewell',/(?:مع السلامة|باي|تصبح على خير|اشوفك|أشوفك|bye|goodbye|see you)/i],
  ['greeting',/(?:اهل[ًاا]|أهل[ًاا]|ازيك|إزيك|صباح الخير|مساء الخير|هاي\b|hello\b|\bhi\b|welcome)/i],
  ['gratitude',/(?:شكرا|شكرًا|متشكر|تسلم|ميرسي|thank(?:s| you))/i],
  ['celebration',/(?:مبروك|نجح|نجاح|فزت|فرحان|فرحانة|🎉|congrat)/i],
  ['humor',/(?:هههه|ههه|😂|🤣|نكتة|joke|funny|lol\b)/i],
  ['apology',/(?:آسف|اسف|معلش|سامح|sorry|apolog)/i],
  ['story',/(?:حدوتة|حكاية|قصة|قبل النوم|story|bedtime)/i],
  ['surprise',/(?:واو|يا نهار|بجد|مفاجأة|مفاجاه|wow\b|surpris)/i],
  ['disagreement',/(?:لأ|لا مش|مش كده|مش موافق|no\b|wrong)/i],
  ['problem',/(?:مشكلة|غلط|خطأ|مش شغال|مش بيشتغل|وقع|تعطل|فشل|بايظ|مش فاهم|متلخبط|error|broken|failed|issue|problem)/i],
  ['agreement',/(?:تمام|صح|بالضبط|ايوه|أيوه|ماشي|موافق|exactly|correct|yes\b)/i],
  ['question',/[؟?]|(?:ليه|إزاي|ازاي|كيف|هل|فين|أين|امتى|إمتى|what|why|how|where|when|can you|could you)/i]
];

const REASSURING=/(?:مفيش مشكلة|مش مشكلة|لا توجد مشكلة|مافيش مشكلة|no problem|not a problem|all good|كله تمام)/i;
const RESOLVED=/(?:تم الحل|اتحل|اتصلح|اشتغل دلوقتي|تم بنجاح|اكتمل|جاهز|نجح التنفيذ|تم التنفيذ|fixed|resolved|completed|done successfully|working now)/i;
const UNRESOLVED=/(?:تعذر|مقدرش|مش قادر|لسه مش شغال|فشل|غير متاح|تعطل|خطأ مستمر|can't|cannot|failed|unavailable|still broken)/i;

function normalizeRoute(route='chat'){
  const value=String(route||'chat').toLowerCase();
  return ['research','code','command','image','complex','chat'].includes(value)?value:'chat';
}

function detectIntent(userText='',route='chat'){
  const value=String(userText||'').trim();
  const normalizedRoute=normalizeRoute(route);
  if(normalizedRoute==='research')return 'research';
  if(normalizedRoute==='code')return 'coding';
  if(normalizedRoute==='image')return 'creative';
  if(normalizedRoute==='command')return 'command';
  if(normalizedRoute==='complex')return 'analysis';
  if(REASSURING.test(value)||RESOLVED.test(value))return 'agreement';
  for(const [intent,pattern] of INTENT_RULES){
    if(pattern.test(value))return intent;
  }
  return 'conversation';
}

function detectOutcome(assistantText=''){
  const value=String(assistantText||'').trim();
  if(!value)return 'unknown';
  if(REASSURING.test(value))return 'reassuring';
  if(UNRESOLVED.test(value))return 'unresolved';
  if(RESOLVED.test(value))return 'resolved';
  return 'neutral';
}

function emotionForIntent(intent,text='',outcome='unknown'){
  const exclamations=(String(text).match(/[!！]/g)||[]).length;
  let base={
    greeting:['warm',.72],
    farewell:['warm',.66],
    gratitude:['warm',.78],
    celebration:['happy',.94],
    humor:['happy',.84],
    apology:['calm',.70],
    problem:['serious',.74],
    surprise:['curious',.84],
    story:['calm',.76],
    agreement:['warm',.62],
    disagreement:['serious',.64],
    question:['curious',.76],
    research:['curious',.72],
    coding:['serious',.62],
    creative:['curious',.78],
    command:['serious',.60],
    analysis:['curious',.70],
    conversation:['neutral',.52]
  }[intent]||['neutral',.52];

  if(outcome==='resolved'||outcome==='reassuring')base=['warm',Math.max(.62,base[1]-.06)];
  if(outcome==='unresolved')base=['serious',Math.max(.72,base[1])];

  return {mood:base[0],intensity:clamp(base[1]+Math.min(.08,exclamations*.02),.2,1)};
}

const PHASE_BY_INTENT={
  greeting:{
    understanding:['curious','listen'],
    responding:['welcome_back','reply'],
    complete:['wave','idle']
  },
  farewell:{
    understanding:['nod_yes','listen'],
    responding:['reply','goodbye'],
    complete:['goodbye','idle']
  },
  gratitude:{
    understanding:['happy','listen'],
    responding:['approve','reply'],
    complete:['bow','idle']
  },
  celebration:{
    understanding:['excited','curious'],
    responding:['happy','reply'],
    complete:['celebrate','cheer','idle']
  },
  humor:{
    understanding:['curious','giggle'],
    responding:['giggle','reply'],
    complete:['laugh','idle']
  },
  apology:{
    understanding:['listen','thinking_deep'],
    responding:['relax','reply'],
    complete:['nod_yes','idle']
  },
  problem:{
    understanding:['alert','thinking_deep'],
    responding:['focus','reply']
  },
  surprise:{
    understanding:['surprise_soft','curious'],
    responding:['wow','reply'],
    complete:['wow','idle']
  },
  story:{
    understanding:['curious','cozy_sway'],
    responding:['relax','reply'],
    complete:['cozy_sway','idle']
  },
  agreement:{
    understanding:['nod_yes','listen'],
    responding:['approve','reply'],
    complete:['nod_yes','idle']
  },
  disagreement:{
    understanding:['shake_no','focus'],
    responding:['thinking_deep','reply'],
    complete:['nod_yes','idle']
  },
  question:{
    understanding:['question','thinking_deep'],
    responding:['response_ready','reply'],
    complete:['nod_yes','idle']
  },
  research:{
    understanding:['detect','focus'],
    searching:['scan','search'],
    working:['search','detect'],
    responding:['found','reply'],
    complete:['found','idle']
  },
  coding:{
    understanding:['code_focus','focus'],
    working:['code_focus','type_fast'],
    responding:['response_ready','reply'],
    complete:['approve','idle']
  },
  creative:{
    understanding:['idea','brainstorm'],
    working:['brainstorm','working'],
    responding:['response_ready','reply'],
    complete:['approve','idle']
  },
  command:{
    understanding:['detect','focus'],
    working:['focus','working'],
    responding:['approve','reply'],
    complete:['nod_yes','idle']
  },
  analysis:{
    understanding:['thought_orbit','thinking_deep'],
    working:['brainstorm','focus'],
    responding:['response_ready','reply'],
    complete:['nod_yes','idle']
  },
  conversation:{
    understanding:['curious','listen'],
    responding:['reply'],
    complete:['nod_yes','idle']
  }
};

const PHASE_DELAYS={
  idle:[0],
  listening:[0,210],
  understanding:[0,300],
  searching:[0,300],
  working:[0,300],
  preparing:[0,360],
  responding:[0,360],
  speaking:[0],
  complete:[0,620,820],
  error:[0,900]
};

function completionOverride(semantic){
  if(!semantic)return null;
  const outcome=semantic.outcome;
  const intent=semantic.intent;

  if(outcome==='unresolved'){
    return intent==='problem'||['coding','command','research','creative'].includes(intent)
      ? ['confused','idle']
      : ['nod_yes','idle'];
  }
  if(outcome==='resolved'){
    if(intent==='coding')return ['success','idle'];
    if(intent==='command')return ['approve','idle'];
    if(intent==='research')return ['found','idle'];
    if(intent==='creative')return ['pose_star','idle'];
    if(intent==='problem')return ['approve','idle'];
  }
  if(outcome==='reassuring'&&intent==='problem')return ['relax','idle'];
  return null;
}

export function analyzeSemanticMotion({
  userText='',
  assistantText='',
  route='chat',
  source='text'
}={}){
  const intent=detectIntent(userText,route);
  const outcome=detectOutcome(assistantText);
  const emotion=emotionForIntent(intent,userText,outcome);
  const sourceBoost=source==='voice'?.05:0;
  return Object.freeze({
    intent,
    outcome,
    route:normalizeRoute(route),
    source:String(source||'text'),
    mood:emotion.mood,
    intensity:clamp(emotion.intensity+sourceBoost,.2,1),
    confidence:
      intent==='conversation'?.48:
      ['research','coding','creative','command','analysis'].includes(intent)?.94:
      .80
  });
}

export function semanticPhaseScene(phase,semantic,baseScene){
  const fallback=baseScene||{sonic:'idle',steps:[{after:0,state:'idle'}]};
  if(!semantic)return fallback;
  if(phase==='speaking')return {...fallback,steps:[{after:0,state:'talk'}]};
  if(phase==='error')return fallback;

  let gestures=null;
  if(phase==='complete')gestures=completionOverride(semantic);
  if(!gestures){
    const intentMap=PHASE_BY_INTENT[semantic.intent]||PHASE_BY_INTENT.conversation;
    gestures=intentMap?.[phase]||null;
  }
  if(!gestures?.length)return fallback;

  const delays=PHASE_DELAYS[phase]||[];
  const steps=gestures.map((state,index)=>({
    state,
    after:Number.isFinite(delays[index])?delays[index]:index*320
  }));
  return {...fallback,steps};
}

function speechTone(text=''){
  const value=String(text||'');
  if(REASSURING.test(value))return {mood:'warm',intensity:.64};
  if(UNRESOLVED.test(value))return {mood:'serious',intensity:.78};
  if(/(?:للأسف|مشكلة|خطأ|فشل|تحذير|تعطل|error|failed|problem)/i.test(value))return {mood:'serious',intensity:.74};
  if(/(?:مبروك|رائع|ممتاز|تحفة|جميل جدًا|حلو جدًا|ههه|😂|🎉)/i.test(value))return {mood:'happy',intensity:.82};
  if(/(?:شكرا|شكرًا|تسلم|أهلًا|اهلا|صباح|مساء|منور)/i.test(value))return {mood:'warm',intensity:.70};
  if(/(?:حدوتة|حكاية|بهدوء|استرخ|هادئ)/i.test(value))return {mood:'calm',intensity:.70};
  if(/[؟?]|(?:ليه|إزاي|ازاي|هل|فين|امتى|ممكن)/i.test(value))return {mood:'curious',intensity:.70};
  return {mood:'neutral',intensity:.54};
}

export function semanticSpeechMood(text='',context={}){
  const tone=speechTone(text);
  const sourceBoost=context.source==='voice'?.04:0;
  return {
    mood:tone.mood,
    intensity:clamp(tone.intensity+sourceBoost,.2,1),
    intent:context.intent||'conversation'
  };
}

export function validateSemanticMotionDirector(){
  const errors=[];
  for(const intent of Object.keys(PHASE_BY_INTENT)){
    const phases=PHASE_BY_INTENT[intent];
    for(const [phase,gestures] of Object.entries(phases)){
      if(!Array.isArray(gestures)||!gestures.length)errors.push(`${intent}/${phase}: empty scene`);
      if(new Set(gestures).size!==gestures.length)errors.push(`${intent}/${phase}: duplicate gestures`);
    }
  }
  return errors;
}
