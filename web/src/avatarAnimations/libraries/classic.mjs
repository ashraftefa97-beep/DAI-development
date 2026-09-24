import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "classic",
  "personality": "balanced",
  "energy": 0.82,
  "flow": 0.82,
  "tempo": 0.84,
  "accent": "pulse",
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
      "nod_yes"
    ],
    "thinking": [
      "thinking_deep",
      "focus",
      "brainstorm"
    ],
    "searching": [
      "search",
      "scan"
    ],
    "speaking": [
      "talk",
      "talk",
      "talk"
    ],
    "success": [
      "happy",
      "approve",
      "success"
    ],
    "error": [
      "confused",
      "error"
    ]
  }
});
