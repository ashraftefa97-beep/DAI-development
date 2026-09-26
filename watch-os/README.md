# DAI Watch OS v1

DAI Watch OS now follows an **M65A-first** strategy for Redmi Watch 3 Active (M2235W1).

## Primary target
- Device family: M65A / Redmi Watch 3 Active
- Display: 240 x 280
- Runtime strategy: DAI Shell on top of the existing watch environment
- Heavy AI / search / speech services: phone or server bridge

The Xiaomi firmware is **not replaced or force-flashed** in this stage. The original watch system keeps responsibility for boot, display power, battery management and Bluetooth while the DAI layer owns the visible experience.

## DAI states
- IDLE
- LISTENING
- THINKING
- SPEAKING
- ERROR

## Architecture
DAI Shell (watch) -> bridge abstraction -> phone/server -> DAI services

The bridge interface is kept separate from the shell so we can use whichever communication path the M65A environment actually exposes.

## Milestones
1. 240x280 DAI Shell visual prototype.
2. Package the shell as a Redmi Watch 3 Active-compatible watch-face prototype.
3. Prove an input/action path from the watch to the phone.
4. Map real DAI state events back to the watch where the platform allows it.
5. Test watch microphone/speaker access only if a supported runtime API is discovered.

## Fallback
ESP32-S3 remains a hardware fallback only if M65A cannot expose enough interaction for DAI.

No ENG mode, USER DEBUG mode, local OTA force-flash or unknown firmware write is part of this branch.
