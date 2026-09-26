# DAI Avatar Design Rulebook

This document is the canonical visual and animation quality rule for DAI / ضي.

## North star

DAI must continuously improve toward the polish, fluidity, responsiveness, and emotional clarity expected from a premium AI companion. Tabi AI may be used as a **quality benchmark only**. DAI must keep its own identity, shapes, motion language, palette, personality, and implementation; direct copying of another product's character design, assets, poses, or proprietary animation is not allowed.

## Non-negotiable identity

- DAI remains recognizably DAI across web, desktop, mobile, and watch.
- The face is the primary communication surface.
- Eyes, brows, and mouth carry most of the expression.
- The Classic DAI identity remains the baseline reference unless a different DAI avatar style is explicitly selected.
- New polish may refine proportions, materials, lighting, curves, and motion, but must not erase the DAI silhouette or personality.

## Drawing quality

Every avatar pass should improve at least one of:
- cleaner curves and edge quality;
- better eye shape and highlight/material depth;
- more consistent brow and mouth construction;
- softer, controlled lighting and glow;
- better small-size readability;
- more coherent depth without visual clutter.

Avoid noisy outlines, excessive effects, random accessories, or detail that reduces readability.

## Motion quality

DAI should feel alive even when idle, but never restless.

### Idle
- subtle breathing / floating motion;
- natural blinks;
- tiny gaze changes;
- micro head/face drift;
- no repetitive large hand waving.

### Listening
- eyes and brows should communicate attention first;
- listening feedback can pulse gently;
- the pose must remain stable enough to feel focused.

### Thinking
- use controlled gaze/brow changes and restrained motion;
- avoid frantic loops or large body gestures.

### Speaking
- mouth and face have priority;
- lip motion starts with real audio, not before it;
- hand gestures are rare, purposeful, and secondary;
- head and eye motion stay subtle while speech is active.

### Typing/text reply
- mouth must remain still;
- no fake lip sync;
- use a calm working/thinking expression instead.

## Facial animation

- Blinks must vary naturally rather than run on a fixed robotic interval.
- Eyes should lead attention; the rest of the face follows.
- Brows should add emotional context without exaggerated cartoon acting.
- Mouth shapes should interpolate smoothly and avoid simple open/close flapping.
- Expression changes must blend; hard pose cuts are considered defects.

## Voice sync

Target behavior:
- visible mouth onset within 80 ms of actual speech playback;
- visible mouth release within 120 ms of speech ending;
- animation must never visibly start speaking before audio starts;
- voice activity should drive mouth intensity and shape;
- silence returns the mouth to an idle expression smoothly.

## Transitions

State changes should normally complete in roughly 140–420 ms depending on the expression. Transitions must preserve continuity of gaze, face position, and scale. Sudden jumps, arm teleports, facial pops, and mismatched mouth states are regression bugs.

## Performance

Primary target:
- 60 FPS where the device can sustain it;
- stable frame pacing is more important than decorative effects;
- 30 FPS is an acceptable fallback on constrained devices;
- animation simulation remains time-correct even if rendering skips frames;
- reduce particles/effects before reducing facial quality.

## Platform adaptation

The same identity and motion principles apply everywhere, while implementation adapts to hardware:
- Web/Desktop: full real-time animation and voice-driven lip sync.
- Mobile: keep facial fidelity; reduce expensive ambient effects first.
- Watch: preserve DAI Classic face language and readable micro-expression; simplify frame rate/effects as required by the device.

A constrained platform is not permission to redesign DAI into a different character.

## Quality gate

Before accepting an avatar change, verify:

1. Is the drawing cleaner or more readable?
2. Is the motion smoother and less robotic?
3. Is the facial expression more intelligent and emotionally clear?
4. Is lip sync closer to real audio timing?
5. Does DAI still look unmistakably like DAI?
6. Does the change avoid copying another product's character or assets?

If any answer is no, the change is incomplete.

## Priority order

When tradeoffs are necessary, optimize in this order:

1. identity consistency;
2. eyes / brows / mouth;
3. audio-to-mouth synchronization;
4. transition smoothness;
5. idle naturalism;
6. gesture quality;
7. decorative particles and secondary effects.

This rulebook is project-wide and should guide all future DAI avatar work.
