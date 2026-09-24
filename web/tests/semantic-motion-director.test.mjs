import test from 'node:test';
import assert from 'node:assert/strict';

import { gestures } from '../src/motion.mjs';
import {
  analyzeSemanticMotion,
  semanticPhaseScene,
  semanticSpeechMood,
  validateSemanticMotionDirector
} from '../src/semanticMotionDirector.mjs';
import { animationSlotForGesture, gestureSlotMap } from '../src/avatarAnimations/runtime.mjs';

const fallback={
  sonic:'idle',
  steps:[{after:0,state:'idle'}],
  settleMs:980
};

test('semantic motion director has a valid internal scene map',()=>{
  assert.deepEqual(validateSemanticMotionDirector(),[]);
});

test('task routes produce clearly different motion understanding',()=>{
  const research=analyzeSemanticMotion({userText:'دورلي على أحدث الأخبار',route:'research'});
  const code=analyzeSemanticMotion({userText:'اكتبلي كود',route:'code'});
  const image=analyzeSemanticMotion({userText:'اعمل صورة',route:'image'});
  const command=analyzeSemanticMotion({userText:'افتح البرنامج',route:'command'});

  assert.equal(research.intent,'research');
  assert.equal(code.intent,'coding');
  assert.equal(image.intent,'creative');
  assert.equal(command.intent,'command');

  assert.deepEqual(
    semanticPhaseScene('searching',research,fallback).steps.map(step=>step.state),
    ['search']
  );
  assert.deepEqual(
    semanticPhaseScene('working',code,fallback).steps.map(step=>step.state),
    ['code_focus']
  );
  assert.deepEqual(
    semanticPhaseScene('working',image,fallback).steps.map(step=>step.state),
    ['brainstorm']
  );
});

test('conversation meaning changes emotion and completion choreography',()=>{
  const celebration=analyzeSemanticMotion({userText:'مبروك نجحت!',route:'chat'});
  const problem=analyzeSemanticMotion({userText:'في مشكلة ومش شغال',route:'chat'});
  const greeting=analyzeSemanticMotion({userText:'ازيك يا ضي',route:'chat'});
  const question=analyzeSemanticMotion({userText:'ازاي ده بيشتغل؟',route:'chat'});

  assert.equal(celebration.mood,'happy');
  assert.equal(problem.mood,'serious');
  assert.equal(greeting.mood,'warm');
  assert.equal(question.mood,'curious');

  assert.equal(semanticPhaseScene('complete',celebration,fallback).steps[0].state,'celebrate');
  assert.equal(semanticPhaseScene('complete',greeting,fallback).steps[0].state,'wave');
  assert.equal(semanticPhaseScene('understanding',problem,fallback).steps[0].state,'thinking_deep');
  assert.equal(semanticPhaseScene('understanding',question,fallback).steps[0].state,'thinking_deep');
});

test('every semantic scene gesture exists in the DAI motion engine',()=>{
  const valid=new Set(gestures);
  const scenarios=[
    {userText:'اهلا',route:'chat'},
    {userText:'مع السلامة',route:'chat'},
    {userText:'شكرا',route:'chat'},
    {userText:'مبروك نجحت',route:'chat'},
    {userText:'هههه',route:'chat'},
    {userText:'آسف',route:'chat'},
    {userText:'في مشكلة',route:'chat'},
    {userText:'واو',route:'chat'},
    {userText:'احكيلي حدوتة',route:'chat'},
    {userText:'تمام بالضبط',route:'chat'},
    {userText:'لا مش كده',route:'chat'},
    {userText:'ازاي؟',route:'chat'},
    {userText:'ابحث',route:'research'},
    {userText:'اكتب كود',route:'code'},
    {userText:'اعمل صورة',route:'image'},
    {userText:'افتح البرنامج',route:'command'},
    {userText:'حلل الموضوع',route:'complex'}
  ];
  const phases=['listening','understanding','searching','working','preparing','responding','speaking','complete','error'];

  for(const scenario of scenarios){
    const semantic=analyzeSemanticMotion(scenario);
    for(const phase of phases){
      const scene=semanticPhaseScene(phase,semantic,fallback);
      for(const step of scene.steps){
        assert.ok(valid.has(step.state),`${semantic.intent}/${phase}: unknown gesture ${step.state}`);
      }
    }
  }
});

test('speech mood returns intensity instead of a flat label only',()=>{
  const happy=semanticSpeechMood('ممتاز جدًا! تحفة!',{route:'chat',source:'voice'});
  const serious=semanticSpeechMood('للأسف حصلت مشكلة',{route:'chat',source:'voice'});
  assert.equal(happy.mood,'happy');
  assert.equal(serious.mood,'serious');
  assert.ok(happy.intensity>.7);
  assert.ok(serious.intensity>.7);
});


test('generic replies acknowledge completion instead of celebrating',()=>{
  const generic=analyzeSemanticMotion({
    userText:'قولّي معلومة عن القمر',
    assistantText:'القمر تابع طبيعي للأرض.',
    route:'chat'
  });
  const scene=semanticPhaseScene('complete',generic,{
    sonic:'complete',
    steps:[{after:0,state:'nod_yes'},{after:620,state:'idle'}],
    settleMs:760
  });
  const states=scene.steps.map(step=>step.state);
  assert.deepEqual(states,['nod_yes']);
  assert.ok(!states.includes('success'));
  assert.ok(!states.includes('celebrate'));
});

test('reassuring language is not misread as a failure',()=>{
  const semantic=analyzeSemanticMotion({
    userText:'هل كل حاجة تمام؟',
    assistantText:'مفيش مشكلة، كله تمام دلوقتي.',
    route:'chat'
  });
  assert.equal(semantic.outcome,'reassuring');
  assert.notEqual(semantic.mood,'serious');
  const scene=semanticPhaseScene('complete',semantic,{
    sonic:'complete',
    steps:[{after:0,state:'nod_yes'},{after:620,state:'idle'}]
  });
  assert.ok(!scene.steps.some(step=>step.state==='error'||step.state==='confused'));
});

test('resolved and unresolved technical outcomes behave differently',()=>{
  const resolved=analyzeSemanticMotion({
    userText:'عندي مشكلة في الكود',
    assistantText:'تم الحل واتصلح الكود.',
    route:'code'
  });
  const unresolved=analyzeSemanticMotion({
    userText:'عندي مشكلة في الكود',
    assistantText:'للأسف تعذر التنفيذ ولسه مش شغال.',
    route:'code'
  });
  assert.equal(resolved.outcome,'resolved');
  assert.equal(unresolved.outcome,'unresolved');
  assert.equal(semanticPhaseScene('complete',resolved,fallback).steps[0].state,'success');
  assert.equal(semanticPhaseScene('complete',unresolved,fallback).steps[0].state,'confused');
});

test('semantic gestures are routed into avatar libraries deterministically',()=>{
  const expected={
    curious:'listening',
    nod_yes:'listening',
    look_around:'idle',
    response_ready:'thinking',
    wave:'success',
    goodbye:'success',
    scan:'searching',
    reply:'speaking'
  };
  for(const [gesture,slot] of Object.entries(expected)){
    assert.equal(animationSlotForGesture(gesture),slot,gesture);
  }

  const map=gestureSlotMap();
  assert.equal(Object.keys(map).length,new Set(Object.keys(map)).size);
});

test('every semantic scene gesture has an avatar animation slot',()=>{
  const scenarios=[
    {userText:'اهلا',assistantText:'أهلا بيك',route:'chat'},
    {userText:'باي',assistantText:'مع السلامة',route:'chat'},
    {userText:'شكرا',assistantText:'العفو',route:'chat'},
    {userText:'مبروك نجحت',assistantText:'مبروك!',route:'chat'},
    {userText:'هههه',assistantText:'ضحكتني',route:'chat'},
    {userText:'عندي مشكلة',assistantText:'تم الحل',route:'chat'},
    {userText:'ابحث عن الخبر',assistantText:'لقيت النتيجة',route:'research'},
    {userText:'اكتب كود',assistantText:'تم الحل',route:'code'},
    {userText:'اعمل صورة',assistantText:'جاهز',route:'image'},
    {userText:'افتح البرنامج',assistantText:'تم التنفيذ',route:'command'},
    {userText:'حلل الموضوع',assistantText:'ده التحليل',route:'complex'}
  ];
  const phases=['understanding','searching','working','preparing','responding','speaking','complete'];
  for(const scenario of scenarios){
    const semantic=analyzeSemanticMotion(scenario);
    for(const phase of phases){
      const scene=semanticPhaseScene(phase,semantic,fallback);
      for(const step of scene.steps){
        assert.ok(animationSlotForGesture(step.state),`${semantic.intent}/${phase}: ${step.state} has no avatar slot`);
      }
    }
  }
});


test('reassuring user wording is not classified as a problem',()=>{
  const noProblem=analyzeSemanticMotion({
    userText:'مفيش مشكلة خلاص كله تمام',
    route:'chat'
  });
  const resolved=analyzeSemanticMotion({
    userText:'اتحل الموضوع وتم الحل',
    route:'chat'
  });
  assert.equal(noProblem.intent,'agreement');
  assert.equal(resolved.intent,'agreement');
  assert.notEqual(noProblem.mood,'serious');
});


test('every semantic phase resolves to one stable gesture',()=>{
  const scenarios=[
    {userText:'ابحث عن الخبر',assistantText:'لقيت النتيجة',route:'research'},
    {userText:'اكتب كود',assistantText:'تم الحل',route:'code'},
    {userText:'اعمل صورة',assistantText:'جاهز',route:'image'},
    {userText:'حلل الموضوع',assistantText:'ده التحليل',route:'complex'},
    {userText:'ازاي؟',assistantText:'هشرحلك',route:'chat'}
  ];
  for(const scenario of scenarios){
    const semantic=analyzeSemanticMotion(scenario);
    for(const phase of ['understanding','searching','working','responding','speaking','complete']){
      const scene=semanticPhaseScene(phase,semantic,fallback);
      assert.equal(scene.steps.length,1,`${semantic.intent}/${phase} changed animation inside one phase`);
      assert.equal(scene.steps[0].after,0);
    }
  }
});
