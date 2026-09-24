import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "midnight",
  "personality": "night-float",
  "energy": 0.54,
  "flow": 1.1,
  "tempo": 0.52,
  "accent": "stars",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "dream",
      "cozy_sway",
      "idle"
    ],
    "listening": [
      "listen",
      "curious"
    ],
    "thinking": [
      "thinking_deep",
      "thought_orbit",
      "meditate"
    ],
    "searching": [
      "look_around",
      "scan"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "proud",
      "happy"
    ],
    "error": [
      "confused",
      "shy"
    ]
  }
});
