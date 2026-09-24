import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "desert",
  "personality": "dune-breathe",
  "energy": 0.58,
  "flow": 0.92,
  "tempo": 0.62,
  "accent": "heat",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "breathe",
      "sway",
      "relax"
    ],
    "listening": [
      "listen",
      "nod_yes"
    ],
    "thinking": [
      "thinking_deep",
      "focus",
      "read"
    ],
    "searching": [
      "scout",
      "search"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "proud",
      "approve"
    ],
    "error": [
      "confused",
      "alert"
    ]
  }
});
