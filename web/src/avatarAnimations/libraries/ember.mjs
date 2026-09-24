import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "ember",
  "personality": "spark-rise",
  "energy": 1.32,
  "flow": 0.78,
  "tempo": 1.28,
  "accent": "embers",
  "cooldownMs": 700,
  "reducedIntensity": 0.18,
  "gestures": {
    "idle": [
      "idle",
      "bounce",
      "look_around"
    ],
    "listening": [
      "listen",
      "salute"
    ],
    "thinking": [
      "brainstorm",
      "idea",
      "focus"
    ],
    "searching": [
      "detect",
      "search",
      "scout"
    ],
    "speaking": [
      "talk",
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
      "impatient",
      "error"
    ]
  }
});
