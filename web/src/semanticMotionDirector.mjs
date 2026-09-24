const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const INTENT_RULES=[
  ['farewell',/(?:مع السلامة|باي|تصبح على خير|اشوفك|أشوفك|bye|goodbye|see you)/i],
  ['greeting',/(?:اهل[ًاا]|أهل[ًاا]|ازيك|إزيك|صباح الخير|مساء الخير|هاي\b|hello\b|\bhi\b|welcome)/i],
  ['gratitude',/(?:شكرا|شكرًا|متشكر|تسلم|ميرسي|thank(?:s| you))/i],
  ['celebration',/(?:مبروك|نجح|نجاح|فزت|فرحان|فرحانة|ممتاز|رائع|تحفة|جامد جدًا|🎉|congrat)/i],
  ['humor',/(?:هههه|ههه|😂|🤣|ضحك|نكتة|joke|funny|lol\b)/i],
  ['apology',/(?:آسف|اسف|معلش|سامح|sorry|apolog)/i],
  ['problem',/(?:مشكلة|غلط|خطأ|مش شغال|مش بيشتغل|وقع|تعطل|فشل|بايظ|مش فاهم|متلخبط|error|broken|failed|issue|problem)/i],
  ['surprise',/(?:واو|يا نهار|بجد|مفاجأة|مفاجاه|wow\b|surpris)/i],
  ['story',/(?:حدوتة|حكاية|قصة|قبل النوم|story|bedtime)/i],
  ['agreement',/(?:تمام|صح|بالضبط|ايوه|أيوه|ماشي|موافق|exactly|correct|yes\b)/i],
  ['disagreement',/(?:لأ|لا مش|مش كده|غلط|مش موافق|no\b|wrong)/i],
  ['question',/[؟?]|(?:ليه|إزاي|ازاي|كيف|هل|فين|أين|امتى|إمتى|what|why|how|where|when|can you|could you)/i]
];

function normalizeRoute(route='chat'){
  const value=String(route||'chat').toLowerCase();
  return ['research','code','command','image','complex','chat'].includes(value)?value:'chat';
}

function detectIntent(userText='',assistantText='',route='chat'){
  const combined=(String(userText||'')+' '+String(assistantText||'')).trim();
  const normalizedRoute=normalizeRoute(route);
  if(normalizedRoute==='research')return 'research';
  if(normalizedRoute==='code')return 'coding';
  if(normalizedRoute==='image')return 'creative';
  if(normalizedRoute==='command')return 'command';
  if(normalizedRoute==='complex')return 'analysis';
  for(const [intent,pattern] of INTENT_RULES){
    if(pattern.test(combined))return intent;
  }
  if(String(assistantText||'').length>700)return 'explanation';
  return 'conversation';
}

function emotionForIntent(intent,text=''){
  const exclamations=(String(text).match(/[!！]/g)||[]).length;
  const base={
    greeting:['warm',.72],
    farewell:['warm',.66],
    gratitude:['warm',.78],
    celebration:['happy',.94],
    humor:['happy',.84],
    apology:['calm',.70],
    problem:['serious',.82],
    surprise:['curious',.88],
    story:['calm',.76],
    agreement:['warm',.62],
    disagreement:['serious',.64],
    question:['curious',.76],
    research:['curious',.74],
    coding:['serious',.66],
    creative:['curious',.82],
    command:['serious',.62],
    analysis:['curious',.72],
    explanation:['neutral',.58],
    conversation:['neutral',.54]
  }[intent]||['neutral',.54];
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
    responding:['focus','reply'],
    complete:['approve','idle']
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
    complete:['approve','idle']
  },
  question:{
    understanding:['question','thinking_deep'],
    responding:['response_ready','reply'],
    complete:['approve','idle']
  },
  research:{
    understanding:['detect','focus'],
    searching:['scan','search'],
    working:['search','detect'],
    responding:['found','reply'],
    complete:['found','approve','idle']
  },
  coding:{
    understanding:['code_focus','focus'],
    working:['code_focus','type_fast'],
    responding:['response_ready','reply'],
    complete:['success','proud','idle']
  },
  creative:{
    understanding:['idea','brainstorm'],
    working:['brainstorm','working'],
    responding:['wow','reply'],
    complete:['pose_star','happy','idle']
  },
  command:{
    understanding:['detect','focus'],
    working:['focus','working'],
    responding:['approve','reply'],
    complete:['approve','idle']
  },
  analysis:{
    understanding:['thought_orbit','thinking_deep'],
    working:['brainstorm','focus'],
    responding:['response_ready','reply'],
    complete:['approve','idle']
  },
  explanation:{
    understanding:['focus','thinking_deep'],
    responding:['reply','nod_yes'],
    complete:['approve','idle']
  }
};

const PHASE_DELAYS={
  idle:[0],
  listening:[0,210],
  understanding:[0,300],
  searching:[0,300],
  working:[0,300],
  preparing:[0,390],
  responding:[0,400],
  speaking:[0],
  complete:[0,760,1080],
  error:[0,1040]
};

export function analyzeSemanticMotion({
  userText='',
  assistantText='',
  route='chat',
  source='text'
}={}){
  const intent=detectIntent(userText,assistantText,route);
  const emotion=emotionForIntent(intent,userText+' '+assistantText);
  const sourceBoost=source==='voice'?.06:0;
  return Object.freeze({
    intent,
    route:normalizeRoute(route),
    source:String(source||'text'),
    mood:emotion.mood,
    intensity:clamp(emotion.intensity+sourceBoost,.2,1),
    confidence:
      intent==='conversation'?.46:
      ['research','coding','creative','command','analysis'].includes(intent)?.94:
      .78
  });
}

export function semanticPhaseScene(phase,semantic,baseScene){
  const fallback=baseScene||{sonic:'idle',steps:[{after:0,state:'idle'}]};
  if(!semantic)return fallback;
  if(phase==='speaking')return {...fallback,steps:[{after:0,state:'talk'}]};
  if(phase==='error')return fallback;

  const intentMap=PHASE_BY_INTENT[semantic.intent]||null;
  const gestures=intentMap?.[phase];
  if(!gestures?.length)return fallback;

  const delays=PHASE_DELAYS[phase]||[];
  const steps=gestures.map((state,index)=>({
    state,
    after:Number.isFinite(delays[index])?delays[index]:index*360
  }));
  return {...fallback,steps};
}

export function semanticSpeechMood(text='',context={}){
  const result=analyzeSemanticMotion({
    userText:context.userText||'',
    assistantText:String(text||''),
    route:context.route||'chat',
    source:context.source||'voice'
  });
  return {mood:result.mood,intensity:result.intensity,intent:result.intent};
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
