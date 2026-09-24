import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "lime",
  "personality": "neon-snap",
  "energy": 1.08,
  "flow": 0.8,
  "tempo": 1.36,
  "accent": "laser",
  "cooldownMs": 700,
  "reducedIntensity": 0.18,
  "gestures": {
    "idle": [
      "bounce",
      "idle",
      "scan"
    ],
    "listening": [
      "listen",
      "nod_yes"
    ],
    "thinking": [
      "typing",
      "brainstorm",
      "code_focus"
    ],
    "searching": [
      "scan",
      "detect",
      "search"
    ],
    "speaking": [
      "talk",
      "talk",
      "talk"
    ],
    "success": [
      "cheer",
      "high_five",
      "success"
    ],
    "error": [
      "startled",
      "alert",
      "error"
    ]
  }
});
