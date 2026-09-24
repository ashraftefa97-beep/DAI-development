import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "hologram",
  "personality": "phase-shift",
  "energy": 0.76,
  "flow": 0.72,
  "tempo": 1.55,
  "accent": "holo",
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
      "thought_orbit",
      "scan",
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
      "victory"
    ],
    "error": [
      "error",
      "alert"
    ]
  }
});
