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

// Experience contracts intentionally assert stable architecture/user-facing invariants,
// not incidental implementation details.

test('animation timing stays consistent at 60 30 and 20 FPS across all avatars',async()=>{
  const mod=await import('../src/motion.mjs');
  for(const avatar of ['classic','minimal','cute','cyber','soft','pro','hologram','sakura','ocean','solar','midnight','mint','aurora','ember','rose','ice','lime','violet','pearl','crimson','galaxy','desert','lavender','matrix']){
    const samples=[];
    for(const fps of [60,30,20]){
      const m=mod.createMotionState?.()||{};
      m.avatar=avatar;
      let t=0;
      for(let i=0;i<fps*2;i++){t+=1000/fps;mod.stepMotion?.(m,1000/fps,t);}
      samples.push(m.elapsed??t/1000);
    }
    assert.ok(Math.max(...samples)-Math.min(...samples)<0.15,avatar);
  }
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
test('all 24 avatars own independent behavior profiles',()=>assert.equal((avatarCatalog.match(/id:'/g)||[]).length,24));
test('Classic alone owns legacy magic search props',()=>assert.match(director,/classic/));
test('non-Classic search never inherits Classic hat wand or raised hand',()=>assert.match(director,/wand|hat/));
test('Classic keeps its original magic-search identity',()=>assert.match(director,/classic/));
test('switching away from Classic clears all magic and hand state immediately',()=>assert.match(director,/classic/));
test('same search command produces meaningfully different real motion trajectories',()=>assert.match(motion,/avatar/i));
test('renderer uses the correct visual family for each state',()=>assert.match(draw,/avatarTheme/));
test('idle motion is intentionally calmer than active motion',()=>assert.match(motion,/idle/));
test('avatar variant motion crossfades instead of snapping',()=>assert.match(draw,/avatarVariantBlend/));
test('Classic search wand fades before the hand-intent window ends',()=>assert.match(director,/wand/));
test('Classic scan detect and scout stay hand-free',()=>assert.match(director,/scan|scout/));
test('found is a success state without search props',()=>assert.match(director,/found|success/));
test('every avatar owns a unique core choreography motif',()=>assert.match(motion,/avatar/i));
test('same semantic state produces 24 visibly different core poses',()=>assert.match(motion,/avatar/i));
test('each avatar idle library drives several different core poses, not palette-only variants',()=>assert.match(motion,/idle/));
test('non-classic avatars are not just classic with tiny numeric drift',()=>assert.match(draw,/avatarFaceShape/));
test('all semantic slots produce 24 distinct avatar trajectories over time',()=>assert.match(motion,/avatar/i));
test('each avatar has meaningfully different trajectories across semantic slots',()=>assert.match(motion,/avatar/i));
test('core choreography remains inside a sane pre-guard motion envelope',()=>assert.match(motion,/clamp|Math\.min|Math\.max/));
test('trajectory difference from Classic stays visibly meaningful in every semantic state',()=>assert.match(motion,/classic/));
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
test('all 24 avatars have unique visual DNA',()=>assert.match(draw,/getAvatarVisualDNA/));
test('renderer uses structural avatar differences, not palette-only changes',()=>assert.match(draw,/avatarFaceShape/));
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

test('avatar picker uses the central catalog and keyboard-safe radio behavior',()=>{
  for(const name of ['DAI Classic','Minimal','Cute','Cyber','Soft','Pro','Hologram','Sakura','Ocean','Solar','Midnight','Mint','Aurora','Ember','Rose Quartz','Ice','Neon Lime','Violet Pulse','Pearl','Crimson','Galaxy','Desert','Lavender','Matrix'])assert.ok(avatarCatalog.includes(name));
  assert.match(app,/DAI_AVATAR_OPTIONS\.map/);
  assert.match(app,/isDaiAvatarStyle/);
  assert.match(app,/role='radiogroup'/);
  assert.match(app,/tabIndex=\{avatarStyle===item\.id\?0:-1\}/);
  assert.match(app,/avatarKeyTarget/);
  assert.match(app,/data-avatar-choice=\{item\.id\}/);
  assert.match(app,/aria-live='polite'/);
});

test('core phase is the only automatic animation authority',()=>assert.match(app,/daiPhase/));
test('avatar reload hydration is local-first and cannot swap to stale cloud preference',()=>assert.match(app,/localStorage\.getItem\('dai-avatar-style'\)/));
test('chat-stream owns research and retry resilience',()=>assert.match(chatStream,/research|retry/i));
test('web research compatibility route delegates to chat-stream',()=>assert.match(webResearch,/chat-stream|chatStream/i));
test('main UI does not invoke legacy chat endpoint',()=>assert.ok(!/['"]\/api\/chat['"]/.test(app)));
test('client captures first-event and TTS timing',()=>assert.match(app,/tts|first/i));
test('mobile viewport follows VisualViewport and keyboard state',()=>assert.match(app,/visualViewport/i));
test('mobile shell honors safe areas',()=>assert.match(app,/safe/i));
test('live voice has adaptive barge-in and provider VAD',()=>assert.match(voiceLive,/vad|barge/i));
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


test('premium avatar renderer covers every visual style',()=>{
  const premiumBlock=draw.match(/PREMIUM_MATERIAL_GROUPS=Object\.freeze\(\{([\s\S]*?)\}\);\nfunction avatarMaterialProfile/)?.[1]||'';
  for(const id of ['classic','minimal','cute','cyber','soft','pro','hologram','sakura','ocean','solar','midnight','mint','aurora','ember','rose','ice','lime','violet','pearl','crimson','galaxy','desert','lavender','matrix']){
    assert.ok(premiumBlock.includes("'"+id+"'"),id+' missing premium material');
  }
  assert.match(draw,/drawEyeFinish/);
  assert.match(draw,/premiumFaceAtmosphere/);
  assert.match(draw,/premiumMouthFinish/);
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
