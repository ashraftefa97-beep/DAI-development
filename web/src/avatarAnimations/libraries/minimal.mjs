import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "minimal",
  "personality": "quiet-focus",
  "energy": 0.42,
  "flow": 0.45,
  "tempo": 0.58,
  "accent": "line",
  "cooldownMs": 1200,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "idle",
      "relax",
      "breathe"
    ],
    "listening": [
      "listen",
      "nod_yes"
    ],
    "thinking": [
      "focus",
      "read",
      "thinking_deep"
    ],
    "searching": [
      "scan",
      "search"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "approve",
      "happy"
    ],
    "error": [
      "confused",
      "shake_no"
    ]
  }
});
