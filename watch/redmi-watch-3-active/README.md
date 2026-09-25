# DAI Watch Lite — Redmi Watch 3 Active

DAI Watch Lite is the low-power watch-face build for Redmi Watch 3 Active.

## Target
- Display: 240 × 280
- Preview: 156 × 182
- Runtime: Redmi Watch 3 Active / NuttX watch-face runtime
- Rendering strategy: RGB full-screen second-driven frames + digital time widgets

## Why second-driven frames?
Community EasyFace documentation does not list Redmi Watch 3 Active among the models supporting high-frame-rate `anim_[xx@yy]` watch-face animation. The Redmi Watch 3 Active decoder does expose an ImageList driven by `Second`, so this build uses 60 pre-rendered frames selected by the current second. This gives a safe 1 Hz liquid-motion effect without relying on an unsupported animation primitive.

## Build
```bash
python -m pip install pillow
python generate_assets.py
```

Output:
- `dist/images/second_00.png` … `second_59.png`
- `dist/images/digits_big/*.png`
- `dist/images/digits_small/*.png`
- `dist/preview.png`
- `dist/DAI_Watch_Redmi3Active_Assets.zip`

The GitHub Actions workflow `redmi3-active-watchface.yml` produces the same ZIP automatically.

## EasyFace layout
Import the generated images into EasyFace for **Redmi Watch 3 Active**, then follow `easyface-layout.json`.

The full-screen ImageList:
- position: x=0, y=0
- size: 240 × 280
- data source: `Second`
- index 0..59 -> `second_00.png`..`second_59.png`

Put the digital time widgets above the frame layer.

## Motion language
The frames use DAI's liquid-motion DNA:
- soft body breathing
- eye lead / body follow
- curved ribbon limbs rather than rigid hands
- small follow-through and settle
- quiet glow trail
- blink/smile/listen/thinking/talk visual phases over a 60-second loop

This is a watch-face animation only. Redmi Watch 3 Active does not expose DAI's live AI state or third-party voice calling APIs to the face runtime.
