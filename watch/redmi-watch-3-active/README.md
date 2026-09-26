# DAI Watch Lite — Redmi Watch 3 Active

This folder is the **M65A DAI Shell prototype** for Redmi Watch 3 Active.

## Target
- Device: Redmi Watch 3 Active / M65A
- Resolution: 240 x 280
- Preview: 156 x 182
- Strategy: use the existing watch environment as the base and make DAI the visible shell.

## Stage A — visual shell
The current safe prototype uses watch-face-compatible assets and a 240x280 layout. It reproduces DAI states visually:
- IDLE
- LISTENING
- THINKING
- SPEAKING
- ERROR

Because a normal face does not yet have a proven live DAI state channel on M65A, the generated watch-face assets are a **visual prototype**, not a claim of live AI control.

## Stage B — interaction bridge
The next target is to prove one normal, non-privileged action path from the watch to the phone. Once that exists, the same DAI state machine can drive real commands through the phone/server bridge.

## Build assets
```bash
python -m pip install pillow
python generate_assets.py
```

Output:
- `dist/images/second_00.png` ... `second_59.png`
- digit sprites
- `dist/preview.png`
- `dist/DAI_Watch_Redmi3Active_Assets.zip`

## Browser prototype
Open `simulator.html` to test the exact 240x280 DAI shell layout and switch between states before packaging assets.

## Safety boundary
This project does not require ENG mode, USER DEBUG mode, force OTA flashing, factory test mode, or unknown firmware writes.
