import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "mint",
  "personality": "fresh-spring",
  "energy": 0.8,
  "flow": 1.02,
  "tempo": 0.88,
  "accent": "leaf",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "breathe",
      "sway",
      "idle"
    ],
    "listening": [
      "listen",
      "nod_yes"
    ],
    "thinking": [
      "brainstorm",
      "read",
      "focus"
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
      "cheer"
    ],
    "error": [
      "confused",
      "shake_no"
    ]
  }
});
