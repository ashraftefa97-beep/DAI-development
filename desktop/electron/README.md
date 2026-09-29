# DAI AI Desktop

Desktop shell for DAI AI on Windows and macOS.

## Builds

- Windows 10/11 x64: NSIS installer (.exe).
- macOS Apple Silicon: DMG installer (arm64).
- macOS Intel: DMG installer (x64).

All editions use the same DAI account, cloud conversations, voice experience, search and Classic DAI interface.

## Desktop capabilities

### Windows
- Open, focus and close installed applications.
- Media controls and common shortcuts.
- Window layout controls.
- Pick and open local files.
- Optional start with Windows.
- Floating DAI companion.
- Screen snapshot on explicit request.
- Native in-app browser.

### macOS
- Open, focus and close applications.
- Pick and open local files.
- Optional start at login.
- Floating DAI companion.
- Screen snapshot on explicit request (macOS may request Screen Recording permission).
- Native in-app browser.

Some advanced Windows-only automation actions are intentionally not exposed on macOS until a native macOS implementation is added. The renderer never receives arbitrary Node.js or shell access; only allow-listed IPC actions are exposed.

## Build locally

```bash
cd desktop/electron
npm install

# Windows
npm run dist:win

# macOS (must run on macOS)
npm run dist:mac
```

GitHub Actions builds Windows and macOS installers independently and uploads them as workflow artifacts.
