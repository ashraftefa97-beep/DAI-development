import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "pearl",
  "personality": "pearl-poise",
  "energy": 0.4,
  "flow": 0.52,
  "tempo": 0.48,
  "accent": "glint",
  "cooldownMs": 1200,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "relax",
      "breathe",
      "idle"
    ],
    "listening": [
      "listen",
      "nod_yes"
    ],
    "thinking": [
      "read",
      "focus",
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
      "proud"
    ],
    "error": [
      "confused",
      "shake_no"
    ]
  }
});
