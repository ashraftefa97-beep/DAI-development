import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "soft",
  "personality": "gentle-drift",
  "energy": 0.62,
  "flow": 1.12,
  "tempo": 0.68,
  "accent": "drift",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "breathe",
      "cozy_sway",
      "idle"
    ],
    "listening": [
      "listen",
      "nod_yes"
    ],
    "thinking": [
      "thinking_deep",
      "read",
      "thought_orbit"
    ],
    "searching": [
      "search",
      "look_around"
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
