import { createDaiRequest, routeDaiTask } from '../src/taskRouter.js';

const cases = [
  ['دوريلي على أفضل 3D برينتر في السوق','research'],
  ['ابعت لينك الموقع','link'],
  ['اكتبلي كود React لزرار','code'],
  ['كود خصم نون','chat'],
  ['اعمل صورة بوستر ريلز','image'],
  ['افتح كروم','command'],
  ['حلل المشكلة بالتفصيل','complex'],
  ['عامل ايه النهارده','chat'],
  ['سعر iPhone 17','research'],
  ['آخر أخبار الذكاء الاصطناعي','research'],
];

let failed = 0;
for (const [text, expected] of cases) {
  const result = routeDaiTask(text);
  if (result.route !== expected) {
    console.error(`FAIL route: "${text}" -> ${result.route}, expected ${expected}`);
    failed++;
  } else {
    console.log(`PASS route: "${text}" -> ${result.route}`);
  }
}

const interrupt = createDaiRequest('وقف الصوت','voice');
if (interrupt.decision.priority !== 'interrupt' || interrupt.decision.route !== 'command') {
  console.error('FAIL interrupt routing');
  failed++;
} else {
  console.log('PASS interrupt routing');
}

if (failed) {
  console.error(`Router smoke tests failed: ${failed}`);
  process.exit(1);
}
console.log('Router smoke tests passed.');
