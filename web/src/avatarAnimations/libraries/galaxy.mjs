import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "galaxy",
  "personality": "galaxy-drift",
  "energy": 0.7,
  "flow": 1.4,
  "tempo": 0.7,
  "accent": "stars",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "thought_orbit",
      "dream",
      "sway"
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
      "look_around"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "pose_star",
      "victory",
      "proud"
    ],
    "error": [
      "confused",
      "shy"
    ]
  }
});
