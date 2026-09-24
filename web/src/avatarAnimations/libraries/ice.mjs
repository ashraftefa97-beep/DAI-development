import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "ice",
  "personality": "crystal-still",
  "energy": 0.48,
  "flow": 0.58,
  "tempo": 0.66,
  "accent": "crystal",
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
      "detect"
    ],
    "thinking": [
      "focus",
      "thinking_deep",
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
