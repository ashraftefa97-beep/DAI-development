import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "pro",
  "personality": "executive-calm",
  "energy": 0.52,
  "flow": 0.58,
  "tempo": 0.62,
  "accent": "frame",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "idle",
      "relax",
      "breathe"
    ],
    "listening": [
      "listen",
      "salute"
    ],
    "thinking": [
      "focus",
      "code_focus",
      "read"
    ],
    "searching": [
      "scan",
      "detect"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "approve",
      "success"
    ],
    "error": [
      "alert",
      "shake_no"
    ]
  }
});
