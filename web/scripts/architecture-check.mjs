import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/GithubApp.tsx', import.meta.url), 'utf8');
const research = fs.readFileSync(new URL('../../supabase/functions/web-research/index.ts', import.meta.url), 'utf8');
const stream = fs.readFileSync(new URL('../../supabase/functions/chat-stream/index.ts', import.meta.url), 'utf8');

const failures = [];

if (/supabase\.functions\.invoke\(['"]chat['"]/.test(app)) {
  failures.push('GithubApp still invokes legacy chat function.');
}
if (/\/functions\/v1\/chat(?!-stream)/.test(app)) {
  failures.push('GithubApp contains direct legacy /functions/v1/chat usage.');
}
if (!app.includes('/functions/v1/chat-stream')) {
  failures.push('GithubApp is not wired to chat-stream.');
}
if (!app.includes('transitionCorePhase(')) {
  failures.push('Core phase controller is missing.');
}
if (!research.includes('/functions/v1/chat-stream')) {
  failures.push('web-research is not proxying through chat-stream.');
}
if (!stream.includes('researchOnly')) {
  failures.push('chat-stream researchOnly gateway is missing.');
}
if (!stream.includes('dai_request_metrics')) {
  failures.push('chat-stream request telemetry is missing.');
}
if (!stream.includes('dai_search_cache')) {
  failures.push('persistent search cache is missing.');
}

if (failures.length) {
  for (const failure of failures) console.error('ARCH FAIL:', failure);
  process.exit(1);
}

console.log('Architecture checks passed.');
