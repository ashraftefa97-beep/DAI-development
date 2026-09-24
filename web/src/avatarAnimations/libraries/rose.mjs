import { makeAvatarLibrary } from '../runtime.mjs';

export default makeAvatarLibrary({
  "id": "rose",
  "personality": "rose-glide",
  "energy": 0.64,
  "flow": 1.16,
  "tempo": 0.72,
  "accent": "rose",
  "cooldownMs": 900,
  "reducedIntensity": 0.22,
  "gestures": {
    "idle": [
      "cozy_sway",
      "breathe",
      "relax"
    ],
    "listening": [
      "listen",
      "nod_yes"
    ],
    "thinking": [
      "read",
      "thinking_deep",
      "thought_orbit"
    ],
    "searching": [
      "look_around",
      "search"
    ],
    "speaking": [
      "talk",
      "talk"
    ],
    "success": [
      "proud",
      "happy"
    ],
    "error": [
      "shy",
      "confused"
    ]
  }
});
