export const DAI_AVATAR_QUALITY_POLICY=Object.freeze({
  version:1,
  status:'canonical',
  qualityBar:'premium-ai-companion',
  benchmarkNote:'External products such as Tabi AI are quality references only; never copy character assets, proprietary poses, or distinctive artwork.',
  identity:Object.freeze({
    preserveDaiIdentity:true,
    classicIsBaseline:true,
    faceFirst:true,
    expressionPriority:Object.freeze(['eyes','brows','mouth','head','hands']),
  }),
  rendering:Object.freeze({
    targetFps:60,
    fallbackFps:30,
    frameBudgetMs:16.7,
    preferStableFramePacing:true,
    preserveFaceBeforeParticles:true,
  }),
  motion:Object.freeze({
    idleMaxDriftPx:5,
    idleMaxTiltDeg:3,
    transitionMinMs:140,
    transitionMaxMs:420,
    speakingHands:'rare-purposeful',
    typingMouthMotion:false,
    roboticLoopsForbidden:true,
  }),
  face:Object.freeze({
    naturalBlink:true,
    microGaze:true,
    smoothExpressionBlend:true,
    openCloseFlapForbidden:true,
  }),
  voiceSync:Object.freeze({
    mouthOnsetMaxMs:80,
    mouthReleaseMaxMs:120,
    neverAnimateSpeechBeforeAudio:true,
    voiceLevelDrivesMouth:true,
  }),
  acceptance:Object.freeze([
    'cleaner-or-more-readable-drawing',
    'smoother-less-robotic-motion',
    'clearer-facial-expression',
    'better-audio-mouth-sync',
    'dai-identity-preserved',
    'no-direct-copying'
  ])
});

export function validateAvatarQualityPolicy(policy=DAI_AVATAR_QUALITY_POLICY){
  const errors=[];
  if(!policy.identity?.preserveDaiIdentity)errors.push('DAI identity must be preserved');
  if(!policy.identity?.faceFirst)errors.push('Face-first expression is required');
  if((policy.rendering?.targetFps||0)<60)errors.push('Primary render target must remain 60 FPS');
  if((policy.rendering?.fallbackFps||0)<30)errors.push('Fallback render target must remain at least 30 FPS');
  if((policy.motion?.transitionMinMs||0)<100)errors.push('Transitions are too abrupt');
  if((policy.motion?.transitionMaxMs||9999)>500)errors.push('Transitions are too sluggish');
  if(policy.motion?.typingMouthMotion!==false)errors.push('Text replies must not animate the mouth');
  if(policy.voiceSync?.neverAnimateSpeechBeforeAudio!==true)errors.push('Speech animation must never lead audio');
  if((policy.voiceSync?.mouthOnsetMaxMs||9999)>100)errors.push('Lip-sync onset budget regressed');
  if((policy.voiceSync?.mouthReleaseMaxMs||9999)>150)errors.push('Lip-sync release budget regressed');
  return errors;
}
