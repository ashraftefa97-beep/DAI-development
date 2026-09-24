import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "matrix",
  "personality": "matrix-code",
  "energy": 0.72,
  "flow": 0.55,
  "tempo": 1.5,
  "accent": "code",
  "cooldownMs": 700,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "scan",
      "idle",
      "recharge"
    ],
    "listening": [
      "listen",
      "detect"
    ],
    "thinking": [
      "code_focus",
      "typing",
      "focus"
    ],
    "searching": [
      "detect",
      "scan",
      "search"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "success",
      "approve",
      "victory"
    ],
    "error": [
      "error",
      "alert",
      "shake_no"
    ]
  }
});
