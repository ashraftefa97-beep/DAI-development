import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "solar",
  "personality": "radiant-pop",
  "energy": 1.02,
  "flow": 0.82,
  "tempo": 1.04,
  "accent": "flare",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "idle",
      "breathe",
      "look_around"
    ],
    "listening": [
      "listen",
      "salute"
    ],
    "thinking": [
      "idea",
      "brainstorm",
      "focus"
    ],
    "searching": [
      "search",
      "detect"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "celebrate",
      "victory",
      "cheer"
    ],
    "error": [
      "alert",
      "startled"
    ]
  }
});
