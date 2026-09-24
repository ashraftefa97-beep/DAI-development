import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "sakura",
  "personality": "petal-dance",
  "energy": 0.82,
  "flow": 1.22,
  "tempo": 0.86,
  "accent": "petal",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "cozy_sway",
      "breathe",
      "idle"
    ],
    "listening": [
      "listen",
      "curious"
    ],
    "thinking": [
      "thought_orbit",
      "brainstorm",
      "read"
    ],
    "searching": [
      "look_around",
      "search",
      "scout"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "happy",
      "cheer",
      "pose_star"
    ],
    "error": [
      "shy",
      "confused"
    ]
  }
});
