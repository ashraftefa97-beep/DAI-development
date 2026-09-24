import test from 'node:test';
import assert from 'node:assert/strict';

import { gestures } from '../src/motion.mjs';
import {
  analyzeSemanticMotion,
  semanticPhaseScene,
  semanticSpeechMood,
  validateSemanticMotionDirector
} from '../src/semanticMotionDirector.mjs';

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
    ['scan','search']
  );
  assert.deepEqual(
    semanticPhaseScene('working',code,fallback).steps.map(step=>step.state),
    ['code_focus','type_fast']
  );
  assert.deepEqual(
    semanticPhaseScene('working',image,fallback).steps.map(step=>step.state),
    ['brainstorm','working']
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
  assert.equal(semanticPhaseScene('understanding',problem,fallback).steps[0].state,'alert');
  assert.equal(semanticPhaseScene('understanding',question,fallback).steps[0].state,'question');
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
