import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "lavender",
  "personality": "lavender-float",
  "energy": 0.58,
  "flow": 1.2,
  "tempo": 0.68,
  "accent": "float",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "cozy_sway",
      "breathe",
      "dream"
    ],
    "listening": [
      "listen",
      "curious"
    ],
    "thinking": [
      "read",
      "thought_orbit",
      "meditate"
    ],
    "searching": [
      "look_around",
      "search"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "happy",
      "proud"
    ],
    "error": [
      "shy",
      "confused"
    ]
  }
});
