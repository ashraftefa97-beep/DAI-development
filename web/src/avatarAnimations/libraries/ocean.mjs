import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "ocean",
  "personality": "wave-flow",
  "energy": 0.72,
  "flow": 1.34,
  "tempo": 0.74,
  "accent": "wave",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "sway",
      "breathe",
      "relax"
    ],
    "listening": [
      "listen",
      "nod_yes"
    ],
    "thinking": [
      "thinking_deep",
      "thought_orbit"
    ],
    "searching": [
      "search",
      "scout"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "happy",
      "approve"
    ],
    "error": [
      "confused",
      "shake_no"
    ]
  }
});
