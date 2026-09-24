import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "cyber",
  "personality": "precision-scan",
  "energy": 0.78,
  "flow": 0.62,
  "tempo": 1.42,
  "accent": "scan",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "idle",
      "scan",
      "recharge"
    ],
    "listening": [
      "listen",
      "detect"
    ],
    "thinking": [
      "code_focus",
      "focus",
      "typing"
    ],
    "searching": [
      "scan",
      "detect",
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
      "alert",
      "error",
      "shake_no"
    ]
  }
});
