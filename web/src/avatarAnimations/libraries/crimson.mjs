import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "crimson",
  "personality": "crimson-pulse",
  "energy": 1.08,
  "flow": 0.68,
  "tempo": 1.14,
  "accent": "pulse",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "idle",
      "look_around",
      "bounce"
    ],
    "listening": [
      "listen",
      "salute"
    ],
    "thinking": [
      "focus",
      "brainstorm",
      "idea"
    ],
    "searching": [
      "detect",
      "search"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "victory",
      "success",
      "proud"
    ],
    "error": [
      "alert",
      "error",
      "impatient"
    ]
  }
});
