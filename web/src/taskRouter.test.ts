import test from 'node:test';
import assert from 'node:assert/strict';
import { routeDaiTask } from './taskRouter';

const cases:Array<[string,string]> = [
  ['دوريلي على أفضل 3D برينتر في السوق','research'],
  ['ايه آخر تحديث iOS','research'],
  ['هات لينك الموقع','link'],
  ['افتح يوتيوب','command'],
  ['اكتبلي كود React لصفحة تسجيل دخول','code'],
  ['اعمل بوستر أنمي','image'],
  ['حلل المشكلة دي بالتفصيل واعمل خطة كاملة','complex'],
  ['ازيك','chat'],
  ['شكرا','chat'],
  ['كود خصم امازون','chat']
];

for (const [input,expected] of cases) {
  test(`route: ${input}`, () => {
    assert.equal(routeDaiTask(input).route, expected);
  });
}

test('interrupt commands stay highest priority', () => {
  assert.equal(routeDaiTask('وقف الصوت').priority, 'interrupt');
});

test('research intent beats long general chat only when fresh intent is explicit', () => {
  assert.equal(routeDaiTask('قارن أحدث أسعار 3D printers').route, 'research');
});
