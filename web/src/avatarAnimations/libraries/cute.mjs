import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "cute",
  "personality": "bouncy-cheer",
  "energy": 1.25,
  "flow": 1.08,
  "tempo": 1.18,
  "accent": "spark",
  "cooldownMs": 900,
  "reducedIntensity": 0.18,
  "gestures": {
    "idle": [
      "idle",
      "cozy_sway",
      "giggle"
    ],
    "listening": [
      "listen",
      "curious",
      "nod_yes"
    ],
    "thinking": [
      "brainstorm",
      "question",
      "thought_orbit"
    ],
    "searching": [
      "scout",
      "search",
      "peek"
    ],
    "speaking": [
      "talk",
      "talk",
      "talk"
    ],
    "success": [
      "cheer",
      "happy",
      "high_five"
    ],
    "error": [
      "shy",
      "confused",
      "startled"
    ]
  }
});
