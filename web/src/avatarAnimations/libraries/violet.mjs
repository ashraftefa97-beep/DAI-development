import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "violet",
  "personality": "violet-orbit",
  "energy": 0.92,
  "flow": 1.08,
  "tempo": 1,
  "accent": "orbit",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "thought_orbit",
      "sway",
      "idle"
    ],
    "listening": [
      "listen",
      "curious"
    ],
    "thinking": [
      "brainstorm",
      "thought_orbit",
      "idea"
    ],
    "searching": [
      "scout",
      "scan"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "pose_star",
      "victory",
      "happy"
    ],
    "error": [
      "confused",
      "shy"
    ]
  }
});
