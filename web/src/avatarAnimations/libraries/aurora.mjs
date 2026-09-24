import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "aurora",
  "personality": "aurora-orbit",
  "energy": 0.76,
  "flow": 1.42,
  "tempo": 0.78,
  "accent": "ribbon",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "sway",
      "thought_orbit",
      "breathe"
    ],
    "listening": [
      "listen",
      "curious"
    ],
    "thinking": [
      "thought_orbit",
      "brainstorm",
      "meditate"
    ],
    "searching": [
      "scout",
      "scan",
      "search"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "proud",
      "victory"
    ],
    "error": [
      "confused",
      "alert"
    ]
  }
});
