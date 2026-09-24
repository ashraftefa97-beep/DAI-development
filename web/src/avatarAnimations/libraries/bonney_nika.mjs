import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  id: 'bonney_nika',
  personality: 'joyful-freedom',
  energy: 1.34,
  flow: 1.28,
  tempo: 1.22,
  phase: 1.18,
  accent: 'nika-cloud',
  cooldownMs: 760,
  reducedIntensity: 0.22,
  gestures: {
    idle: ['idle','breathe','sway','cozy_sway','look_around'],
    listening: ['listen','curious','nod_yes'],
    thinking: ['thinking_deep','brainstorm','idea','focus'],
    searching: ['search','scan','scout'],
    speaking: ['talk','reply','music_nod'],
    success: ['happy','laugh','celebrate','victory','peace'],
    error: ['confused','surprise_soft','shake_no']
  }
});
