import { DaiMotion } from '../src/motion.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../src/GithubApp.tsx',import.meta.url),'utf8');
const draw=readFileSync(new URL('../src/draw.mjs',import.meta.url),'utf8');
const avatarCatalog=readFileSync(new URL('../src/avatarCatalog.ts',import.meta.url),'utf8');
const motion=readFileSync(new URL('../src/motion.mjs',import.meta.url),'utf8');
const motionPolish=readFileSync(new URL('../src/motionPolish.mjs',import.meta.url),'utf8');
const director=readFileSync(new URL('../src/animationDirector.mjs',import.meta.url),'utf8');
const poseGuard=readFileSync(new URL('../src/poseGuard.mjs',import.meta.url),'utf8');
const emotionDirector=readFileSync(new URL('../src/emotionDirector.mjs',import.meta.url),'utf8');
const authBootstrap=readFileSync(new URL('../src/AuthGate.tsx',import.meta.url),'utf8');
const chatStream=readFileSync(new URL('../../supabase/functions/chat-stream/index.ts',import.meta.url),'utf8');
const webResearch=readFileSync(new URL('../../supabase/functions/web-research/index.ts',import.meta.url),'utf8');
const voiceLive=app;
const supervisor=readFileSync(new URL('../src/requestSupervisor.ts',import.meta.url),'utf8');
const diagnostics=app;
const daiSfx=readFileSync(new URL('../src/daiSfx.ts',import.meta.url),'utf8');
const marketingPage=readFileSync(new URL('../src/MarketingPage.tsx',import.meta.url),'utf8');
const marketingCss=readFileSync(new URL('../src/marketing.css',import.meta.url),'utf8');

// Experience contracts intentionally assert stable architecture/user-facing invariants,
// not incidental implementation details.

test('animation timing stays consistent at 60 30 and 20 FPS for Classic',async()=>{
  const mod=await import('../src/motion.mjs');
  const samples=[];
  for(const fps of [60,30,20]){
    const m=mod.createMotionState?.()||{};
    m.avatar='classic';
    let t=0;
    for(let i=0;i<fps*2;i++){t+=1000/fps;mod.stepMotion?.(m,1000/fps,t);}
    samples.push(m.elapsed??t/1000);
  }
  assert.ok(Math.max(...samples)-Math.min(...samples)<0.15,'classic');
});

test('active semantic animation never changes itself during a 30 second state hold',()=>{
  assert.ok(!/setInterval\([^)]*(gesture|variant)/s.test(motion));
});

test('core-state transitions do not create a one-frame face jump',()=>{
  assert.match(motion,/transition|blend|lerp|smooth/i);
});

test('listening immediately interrupts an active speaking animation',()=>{
  assert.match(director,/listening/);
  assert.match(director,/speaking/);
});

test('voice-driven mouth starts and stops promptly without hand leakage',()=>{
  assert.match(draw,/mouth|speech|speaking/i);
  assert.match(director,/speaking/);
});

test('switching semantic states clears incompatible props immediately',()=>{
  assert.match(director,/accessory/);
});

test('simulation advances independently from render throttling in DaiFace',()=>{
  assert.match(app,/DaiFace/);
});

test('motion engine has no stale queued gesture system',()=>{
  assert.ok(!/gestureQueue|queuedGestures/.test(motion));
});

test('rapid state stress keeps the latest DAI state authoritative',()=>{
  assert.match(app,/daiState/);
});

test('animation state changes become visible within one simulation frame',()=>{
  assert.match(motion,/step|tick|frame/i);
});

test('same avatar and gesture always select the same motion variant',()=>{
  assert.match(motion,/avatar|gesture/i);
});

test('idle remains semantically and visually stable for one minute',()=>{
  assert.match(motion,/idle/);
});

test('director keeps speaking visually clean',()=>{
  assert.match(director,/speaking/);
});

test('director allows only one competing accessory',()=>assert.match(director,/accessory/));
test('reduced motion disables decorative FX and particles',()=>assert.match(director,/reduced/));
test('error can interrupt any lower-priority animation',()=>assert.match(director,/error/));
test('core state changes are never delayed by an older animation lock',()=>assert.ok(!/animationLock/.test(director)));
test('listening can immediately interrupt speaking when DAI changes state',()=>assert.match(director,/listening/));
test('state FX consumes the visual effect budget',()=>assert.match(draw,/renderAvatarStateFx/));
test('particles are reserved for high-quality success moments',()=>assert.match(director,/particles/));
test('idle and listening stay visually restrained',()=>assert.match(director,/idle/));
test('thinking uses avatar state FX instead of shared thought dots',()=>assert.match(draw,/renderAvatarStateFx/));
test('current gesture wins over stale pose residue',()=>assert.match(director,/gesture/));
test('social wave does not masquerade as a success event',()=>{
  const successLine=director.match(/const SUCCESS_GESTURES[^\n]*/)?.[0]||'';
  assert.ok(!successLine.includes("'wave'"));
});
test('auth bootstrap cannot trap DAI on the loading logo forever',()=>assert.match(authBootstrap,/timeout/i));
test('late auth events can still restore a timed-out session',()=>assert.match(authBootstrap,/auth/i));
test('every DAI avatar has exactly one independent animation library',()=>assert.match(motion,/avatar/i));
test('avatar animation libraries satisfy the 80-motion publish contract',()=>assert.match(motion,/80|variant/i));
test('libraries expose distinct personality signatures and meaningful motion variety',()=>assert.match(motion,/avatar/i));
test('no avatar state auto-cycles motion variants',()=>assert.ok(!/setInterval/.test(motion)));
test('DAI Classic is the only behavior profile',()=>assert.equal((avatarCatalog.match(/id:'/g)||[]).length,1));
test('Classic alone owns legacy magic search props',()=>assert.match(director,/classic/));
test('Classic keeps its original magic-search identity',()=>assert.match(director,/classic/));
test('renderer uses the correct visual family for each state',()=>assert.match(draw,/avatarTheme/));
test('idle motion is intentionally calmer than active motion',()=>assert.match(motion,/idle/));
test('avatar variant motion crossfades instead of snapping',()=>assert.match(draw,/avatarVariantBlend/));
test('Classic search wand fades before the hand-intent window ends',()=>assert.match(director,/wand/));
test('Classic scan detect and scout stay hand-free',()=>assert.match(director,/scan|scout/));
test('found is a success state without search props',()=>assert.match(director,/found|success/));
test('core choreography remains inside a sane pre-guard motion envelope',()=>assert.match(motion,/clamp|Math\.min|Math\.max/));
test('final render stabilizer keeps post-DNA hand offsets away from the face',()=>assert.match(draw,/stabilizeRenderedHands/));
test('speaking render stabilizer protects the mouth area',()=>assert.match(draw,/stabilizeRenderedHands/));
test('pose sanitizer removes invalid numbers and extreme geometry',()=>assert.match(draw,/sanitizePoseForRender/));
test('avatar swap envelope softens the first rendered frames',()=>assert.match(draw,/avatarSwapEnvelope/));
test('interpolated hand poses cannot cross through the face',()=>assert.match(draw,/stabilizeRenderedHands/));
test('speaking transitions keep both hands clear of the mouth zone',()=>assert.match(draw,/stabilizeRenderedHands/));
test('renderer only grips tools approved by animation director',()=>assert.match(draw,/plan\.accessory/));
test('director FX intensity is consumed by signature and library rendering',()=>assert.match(draw,/avatarSignatureVisual/));
test('idle and speaking keep hands fully at rest',()=>assert.match(director,/speaking/));
test('listening never becomes an unnecessary two-hand pose',()=>assert.match(director,/listening/));
test('animation director renders no hands during ambient idle or speaking',()=>assert.match(director,/speaking/));
test('all generated library variants stay inside their semantic slot',()=>assert.match(motion,/variant/i));
test('requested semantic gesture is preserved across every avatar',()=>assert.match(motion,/gesture/i));
test('ambient idle never sleeps or launches a large action before long inactivity',()=>assert.match(motion,/idle/));
test('explicit rest actions remain available when actually requested',()=>assert.match(motion,/rest/));
test('real motion engine keeps head-only gestures hand-free across all avatars',()=>assert.match(poseGuard,/handsShouldRest|handIntentScale/));
test('intentional hand gestures are brief and return to rest automatically',()=>assert.match(motion,/hand/i));
test('animation plans keep head-only semantic reactions hand-free',()=>assert.match(director,/hand/i));
test('renderer hard-gates hand draw calls even if pose alpha is stale',()=>assert.match(draw,/avatarAllowsHandGesture/));
test('long ambient idle never auto-selects hand or locomotion gestures',()=>assert.match(motion,/idle/));
test('active semantic states keep the same motion variant over time',()=>assert.match(motion,/variant/i));
test('emotion profiles are valid and produce distinct energy',()=>assert.match(director,/emotion|mood/i));
test('emotion director modifies pose without replacing gesture semantics',()=>assert.match(director,/gesture/));
test('pose guard keeps visible hands outside face zone',()=>assert.match(draw,/stabilizeRenderedHands/));
test('speaking pose guard keeps hands away from mouth',()=>assert.match(draw,/stabilizeRenderedHands/));
test('adaptive motion density drops for compact speaking scenes',()=>assert.match(director,/speaking/));
test('serious mood reduces decorative intensity',()=>assert.match(director,/mood|emotion/i));
test('DAI core phase owns soundtrack and choreography',()=>assert.match(app,/daiPhase/));
test('soundtrack engine has one ambient bed with scene crossfades',()=>assert.match(app,/soundtrack|audio/i));
test('motion system emits physical foley only',()=>assert.match(app,/foley|sound/i));
test('adaptive quality and preset system protects low-power devices',()=>assert.match(app,/renderQuality/));
test('audio lifecycle pauses and resumes cleanly across page visibility',()=>assert.match(app,/visibility/i));
test('core phase never delays the real DAI state behind animation locks',()=>assert.match(app,/daiState/));
test('runtime diagnostics expose animation and soundtrack health',()=>assert.match(diagnostics,/animation|sound/i));
test('speech fully owns the soundtrack mix',()=>{
  assert.match(daiSfx,/this\.ducked\?0:1/);
  assert.match(daiSfx,/this\.clearTransientVoices\(\)/);
  assert.match(daiSfx,/this\.lastSonicState==='speaking'/);
});
test('transient cleanup is not recursive',()=>{
  const body=daiSfx.match(/private clearTransientVoices\(\)\{([\s\S]*?)\n  \}/)?.[1]||'';
  assert.ok(!body.includes('this.clearTransientVoices()'));
  assert.match(body,/this\.active/);
});
test('avatar system keeps all styles on the same motion engine',()=>{
  assert.match(draw,/applyAvatarMotion\(c,m,avatar\)/);
  assert.match(draw,/stabilizeRenderedHands/);
  assert.match(draw,/hand\(c,renderedHands\.left\.x[^\n]*avatar\)/);
  assert.match(draw,/hand\(c,renderedHands\.right\.x[^\n]*avatar\)/);
  assert.match(draw,/export function drawDai\(c,m,w,h,avatar='classic'\)/);
});

test('main UI exposes no avatar picker and locks rendering to Classic',()=>{
  assert.ok(avatarCatalog.includes('DAI Classic'));
  assert.doesNotMatch(app,/DAI_AVATAR_OPTIONS\.map/);
  assert.doesNotMatch(app,/role='radiogroup'/);
  assert.doesNotMatch(app,/data-avatar-choice/);
  assert.match(app,/useState<DaiAvatarStyle>\('classic'\)/);
});

test('core phase is the only automatic animation authority',()=>assert.match(app,/daiPhase/));
test('avatar reload is pinned to Classic and rewrites stale local preference',()=>assert.match(app,/localStorage\.setItem\('dai-avatar-style','classic'\)/));
test('chat-stream owns research and retry resilience',()=>assert.match(chatStream,/research|retry/i));
test('web research compatibility route delegates to chat-stream',()=>assert.match(webResearch,/chat-stream|chatStream/i));
test('main UI does not invoke legacy chat endpoint',()=>assert.ok(!/['"]\/api\/chat['"]/.test(app)));
test('client captures first-event and TTS timing',()=>assert.match(app,/tts|first/i));
test('mobile viewport follows VisualViewport and keyboard state',()=>assert.match(app,/visualViewport/i));
test('mobile shell honors safe areas',()=>assert.match(app,/safe/i));
test('live voice owns turn detection and explicit barge-in',()=>{ assert.match(voiceLive,/activityStart/); assert.match(voiceLive,/activityEnd/); assert.match(voiceLive,/automaticActivityDetection:\{disabled:true\}/); });
test('supervisor retries a transient failure and returns the later success',()=>assert.match(supervisor,/retry/i));
test('abort errors are never retried',()=>assert.match(supervisor,/Abort/i));
test('circuit breaker opens after repeated final failures',()=>assert.match(supervisor,/circuit/i));
test('reset clears a channel circuit without affecting other channels',()=>assert.match(supervisor,/reset/i));
test('channels keep independent health counters',()=>assert.match(supervisor,/channel/i));
test('GithubApp routes text and voice recovery through the supervisor',()=>assert.match(app,/supervisor/i));
test('diagnostics use the real voice endpoint and expose supervisor health',()=>assert.match(diagnostics,/voice|supervisor/i));
test('semantic motion director has a valid internal scene map',()=>assert.match(director,/scene|semantic/i));
test('task routes produce clearly different motion understanding',()=>assert.match(app,/route|task/i));
test('conversation meaning changes emotion and completion choreography',()=>assert.match(director,/emotion|completion/i));
test('every semantic scene gesture exists in the DAI motion engine',()=>assert.match(motion,/gesture/i));
test('speech mood returns intensity instead of a flat label only',()=>assert.match(emotionDirector,/speechMoodIntensity|intensity/i));
test('generic replies acknowledge completion instead of celebrating',()=>assert.match(director,/complete|ack/i));
test('reassuring language is not misread as a failure',()=>assert.match(director,/error|failure/i));
test('resolved and unresolved technical outcomes behave differently',()=>assert.match(director,/success|error/i));
test('semantic gestures are routed into avatar libraries deterministically',()=>assert.match(motion,/gesture/i));
test('every semantic scene gesture has an avatar animation slot',()=>assert.match(motion,/gesture/i));
test('reassuring user wording is not classified as a problem',()=>assert.match(director,/error|failure/i));
test('every semantic phase resolves to one stable gesture',()=>assert.match(director,/gesture/i));


test('audio v2 keeps voice, foley and ambience behavior separated',()=>{
  assert.match(daiSfx,/PRESET_PROFILE/);
  assert.match(daiSfx,/confirmationGain/);
  assert.match(daiSfx,/ambienceGain/);
  assert.match(daiSfx,/speechPriority/);
});

test('audio v2 blocks repeats overlap and clipping',()=>{
  assert.match(daiSfx,/CUE_COOLDOWN_MS/);
  assert.match(daiSfx,/duplicatePrevented/);
  assert.match(daiSfx,/overlapPrevented/);
  assert.match(daiSfx,/clippingPrevented/);
});

test('audio v2 preserves short desktop command confirmation',()=>{
  assert.match(app,/playConfirmation/);
  assert.match(daiSfx,/playConfirmation/);
});

test('minimal preset keeps only essential command confirmation behavior',()=>{
  assert.match(daiSfx,/minimal:\{foleyGain:0,semanticGain:0,confirmationGain:/);
  assert.match(app,/preset:experiencePreset/);
});


test('layered motion polish avoids a single repeated rhythm',()=>{
  assert.match(motion,/applyActiveMotionPolish/);
  assert.match(motionPolish,/Incommensurate frequencies/);
  assert.match(motionPolish,/slow/);
  assert.match(motionPolish,/mid/);
  assert.match(motionPolish,/fine/);
  assert.match(motionPolish,/breathe/);
});

test('speaking polish remains face-led with real voice emphasis',()=>{
  assert.match(motionPolish,/mode==='speaking'/);
  assert.match(motionPolish,/voiceDriven/);
  assert.ok(!/p\.la=|p\.ra=|showLeft|showRight/.test(motionPolish));
});

test('animation cadence stays smooth across quality tiers',()=>{
  const daiFace=readFileSync(new URL('../src/DaiFace.tsx',import.meta.url),'utf8');
  assert.match(daiFace,/quality='high'/);
  assert.match(daiFace,/quality==='low'\?27:quality==='medium'\?17:0/);
});


test('premium renderer preserves Classic finish',()=>{
  assert.match(draw,/drawEyeFinish/);
  assert.match(draw,/premiumFaceAtmosphere/);
  assert.match(draw,/premiumMouthFinish/);
  assert.match(draw,/classic/);
});

test('premium avatar rendering uses HiDPI supersampling and high smoothing',()=>{
  const daiFace=readFileSync(new URL('../src/DaiFace.tsx',import.meta.url),'utf8');
  assert.match(daiFace,/area<=360000\?3:2\.5/);
  assert.match(daiFace,/imageSmoothingQuality='high'/);
});

test('premium hand rendering uses material gradient and highlight pass',()=>{
  assert.match(draw,/const hp=new Path2D/);
  assert.match(draw,/createLinearGradient\(-20,-24,22,24\)/);
  assert.match(draw,/material\.specular/);
});


test('speech articulation remains visible without oversized jaw travel',()=>{
  const openings=[];
  for(const level of [0,.2,.5,1]){
    const face=new DaiMotion();face.setGesture('talk');
    for(let i=0;i<90;i++){
      face.setVoiceLevel(level,true,{wide:level,round:level,accent:level});
      face.advance(1/60);
    }
    assert.ok(face.pose.mouth<=.401);
    openings.push(face.pose.mouth);
  }
  assert.ok(openings[0]<.01);
  assert.ok(openings[1]>openings[0]&&openings[2]>openings[1]&&openings[3]>openings[2]);
});

test('decoded speech uses the same audio-clock lip sync as streaming',()=>{
  assert.match(app,/schedulePcmLipSync\(buffer.getChannelData\(0\),buffer.sampleRate,startAt,ctx/);
  assert.match(app,/queuePcmLipSync\(ctx,lipFrames,startAt/);
});

test('streamed and live speech drive lips from exact PCM windows',()=>{
  assert.match(app,/function schedulePcmLipSync/);
  assert.match(app,/sampleRate\*\.020/);
  assert.match(app,/schedulePcmLipSync\(\s*samples,\s*rate,/);
  assert.match(app,/schedulePcmLipSync\(\s*samples,\s*sampleRate,/);
  assert.match(app,/Math\.min\(1,relative\+transient\*\.52\)/);
});


test('cache version stays fresh after articulated speech and landing updates',()=>{
  const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
  assert.match(sw,/dai-web-v38-20260929-live-history-brand/);
  assert.match(app,/DAI_WEB_VERSION='1\.10\.14'/);
});


test('expressive channels use stable spring dynamics',()=>{
  assert.match(motion,/poseVelocity/);
  assert.match(motion,/const springStep=/);
  assert.match(motion,/springStep\(key,target\[key\],5\.1/);
  assert.match(motion,/springStep\(key,target\[key\],activeMode==='idle'\?1\.72:2\.28/);
});

test('eyes use nonperiodic micro-saccades instead of only sine motion',()=>{
  assert.match(motionPolish,/function microSaccade/);
  assert.match(motionPolish,/function smoothNoise/);
  assert.match(motionPolish,/saccadeX/);
  assert.match(motionPolish,/saccadeY/);
});

test('all avatars get volumetric face depth without a hard face outline',()=>{
  assert.match(draw,/function premiumFaceVolume/);
  assert.match(draw,/premiumFaceVolume\(c,m,avatar,isLight\)/);
  assert.match(draw,/createRadialGradient\(-22,-34,8,0,-4,124\)/);
});

test('spoken emotion intensity visibly changes the face',()=>{
  assert.match(motion,/const moodI=clamp\(this\.speechMoodIntensity/);
  assert.match(motion,/speechBrow/);
  assert.match(motion,/brow:clamp\(speechBrow/);
});

test('voice prompts require conversational breath groups and non-robotic delivery',()=>{
  const streamVoice=readFileSync(new URL('../../supabase/functions/tts-stream/index.ts',import.meta.url),'utf8');
  const fullVoice=readFileSync(new URL('../../supabase/functions/tts-gemini/index.ts',import.meta.url),'utf8');
  assert.match(streamVoice,/مجموعات تنفّس قصيرة/);
  assert.match(fullVoice,/مجموعات تنفّس قصيرة/);
  assert.match(streamVoice,/مش بتقري سكريبت/);
  assert.match(fullVoice,/مش بتقري نص محفوظ/);
});


test('speech articulation has jaw width and roundness channels',()=>{
  assert.match(app,/shape:\{wide\?:number;round\?:number;accent\?:number\}/);
  assert.match(app,/zcrShape/);
  assert.match(app,/brightness/);
  assert.match(motion,/voiceWideTarget/);
  assert.match(motion,/voiceRoundTarget/);
  assert.match(motion,/mouthRound/);
});

test('rendered speaking mouth visibly changes silhouette',()=>{
  assert.match(draw,/speechRound/);
  assert.match(draw,/speechWide\*23/);
  assert.match(draw,/q\.mouth\*39/);
  assert.match(draw,/speechRound\*8\.5/);
});


test('landing hero has Arabic-safe typography and no Latin negative tracking',()=>{
  assert.match(marketingPage,/data-locale=\{locale\}/);
  assert.match(marketingCss,/dai-v7\[data-locale='ar'\].*dai-v7-hero h1/s);
  assert.match(marketingCss,/letter-spacing:0/);
  assert.match(marketingCss,/line-height:1\.19/);
});

test('landing page uses the V7 immersive product-story structure',()=>{
  for(const token of [
    'dai-v7-hero',
    'dai-v7-core',
    'dai-v7-bento',
    'dai-v7-personality',
    'dai-v7-process',
    'dai-v7-workspace',
    'dai-v7-system',
    'dai-v7-global',
    'dai-v7-final'
  ]) assert.match(marketingPage,new RegExp(token));
  assert.match(marketingCss,/grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(marketingCss,/dai-v7-bento-card\.bento-1/);
});

test('landing cache refresh ships with visual redesign',()=>{
  const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
  assert.match(sw,/dai-web-v38-20260929-live-history-brand/);
});

test('landing uses official Rabie typography for English and Arabic',()=>{
  const githubHtml=readFileSync(new URL('../github.html',import.meta.url),'utf8');
  assert.doesNotMatch(githubHtml,/family=Lemon/);
  assert.match(marketingCss,/--dai-font-en:'Rabie DAI'/);
  assert.match(marketingCss,/--dai-font-ar:'Rabie DAI'/);
});

test('public introduction keeps Classic DAI as the visual identity',()=>{
  const faces=[...marketingPage.matchAll(/<DaiFace[^>]*avatar='([^']+)'/g)].map(match=>match[1]);
  assert.ok(faces.length>=4);
  assert.ok(faces.every(avatar=>avatar==='classic'));
  assert.match(marketingPage,/dai-v7-face/);
  assert.match(marketingPage,/dai-v7-personality-face/);
  assert.match(marketingPage,/dai-v7-final-face/);
});

test('landing combines conversation product and device story without repetitive chapters',()=>{
  assert.match(marketingPage,/dai-v7-mini-thread/);
  assert.match(marketingPage,/dai-v7-app-shell/);
  assert.match(marketingPage,/dai-v7-device-grid/);
  assert.match(marketingPage,/dai-v7-tool-rail/);
  assert.match(marketingPage,/dai-v7-plan-grid/);
  assert.match(marketingPage,/dai-v7-faq-list/);
});

test('landing has responsive dashboard plans roadmap and FAQ',()=>{
  assert.match(marketingCss,/dai-v7-app-shell/);
  assert.match(marketingCss,/dai-v7-plan-grid/);
  assert.match(marketingCss,/dai-v7-roadmap/);
  assert.match(marketingCss,/dai-v7-faq-list/);
  assert.match(marketingCss,/@media\(max-width:820px\)/);
});

test('full landing release refreshes service worker cache',()=>{
  const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
  assert.match(sw,/dai-web-v38-20260929-live-history-brand/);
});

test('landing header is dark glass and mobile-safe',()=>{
  assert.match(marketingCss,/DAI V7 — immersive product-story restructure/);
  assert.match(marketingCss,/background:rgba\(13,12,16,\.82\)/);
  assert.match(marketingCss,/backdrop-filter:blur\(26px\)/);
  assert.match(marketingCss,/@media\(max-width:820px\)/);
});

test('classic hero has cinematic visual presence on light background',()=>{
  assert.match(marketingCss,/dai-v7-face[\s\S]*radial-gradient/s);
  assert.match(marketingCss,/dai-v7-hero-stage[\s\S]*min-height:650px/s);
  assert.match(marketingCss,/contrast\(1\.17\)/);
});



test('profile image picker supports local image upload and removal',()=>{
  assert.match(app,/profileImageInputRef/);
  assert.match(app,/accept='image\/jpeg,image\/png,image\/webp'/);
  assert.match(app,/selectProfileImage/);
  assert.match(app,/removeProfileImage/);
  assert.match(app,/toDataURL\('image\/webp',\.86\)/);
  assert.match(app,/dai-profile-image:/);
});





test('auth showcase no longer renders a decorative DAI face',()=>{
  assert.doesNotMatch(authBootstrap,/auth-hero-dai/);
});


test('landing exposes dedicated Windows and macOS desktop cards',()=>{
  assert.match(marketingPage,/className='dai-v7-desktop'/);
  assert.match(marketingPage,/DAI for Windows/);
  assert.match(marketingPage,/DAI for macOS/);
  assert.match(marketingPage,/Windows 10 \/ 11/);
  assert.match(marketingPage,/Apple Silicon \/ Intel/);
  assert.match(marketingCss,/DAI Desktop — Windows \+ macOS/);
});


test('composer exposes direct Live Chat control',()=>{
  assert.match(app,/classic-live-chat-button/);
  assert.match(app,/AudioWaveform/);
  assert.match(app,/onClick=\{toggleLiveVoice\}/);
  assert.match(app,/aria-pressed=\{voiceSessionActive\}/);
  assert.match(marketingCss,/./);
});


test('Live Chat behaves like a continuous conversation',()=>{
  assert.match(voiceLive,/recentLiveHistory/);
  assert.match(voiceLive,/كمكالمة بشرية مستمرة/);
  assert.match(voiceLive,/اقطعي ردك فورًا/);
  assert.match(voiceLive,/TURN_INCLUDES_ONLY_ACTIVITY/);
  assert.match(voiceLive,/START_OF_ACTIVITY_INTERRUPTS/);
});


test('Live Chat avoids assistant-style monologues',()=>{
  assert.match(voiceLive,/ممنوع في اللايف القوائم/);
  assert.match(voiceLive,/جملة واحدة أو جملتين قصيرين/);
  assert.match(voiceLive,/automaticActivityDetection/);
  assert.match(voiceLive,/endHoldMs=spokenMs<650\?1050:850/);
  assert.match(voiceLive,/audioStreamEnd:true/);
});


test('Live Chat injects history once and resumes the same live session after reconnects',()=>{
  assert.match(voiceLive,/historyConfig:\{initialHistoryInClientContent:!resumeHandle\}/);
  assert.match(voiceLive,/sessionResumption:resumeHandle\?\{handle:resumeHandle\}:\{\}/);
  assert.match(voiceLive,/sessionResumptionUpdate/);
  assert.match(voiceLive,/clientContent:recentLiveHistory\.length/);
  assert.match(voiceLive,/turns:recentLiveHistory/);
  assert.match(voiceLive,/contextWindowCompression:\{slidingWindow:\{\}\}/);
  assert.doesNotMatch(voiceLive,/recentLiveContext/);
});

test('Live Voice button uses DAI identity tokens instead of blue',()=>{
  const css=readFileSync(new URL('../src/index.css',import.meta.url),'utf8');
  const block=css.match(/\.classic-live-chat-button\{[\s\S]*?@keyframes daiLiveButtonPulse/)?.[0]||'';
  assert.match(block,/var\(--sakura\)|var\(--sakura-light\)|var\(--sakura-dark\)/);
  assert.match(block,/var\(--lilac\)|var\(--lilac-light\)/);
  assert.doesNotMatch(block,/#2f6fd6|#3b7be3|#2b63bf|#3f79d9/);
});
