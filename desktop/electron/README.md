# DAI AI Desktop

Windows desktop shell for DAI AI.

## What it adds

- Installable Windows app (NSIS installer).
- Uses the same DAI AI account and cloud conversations as the web version.
- Safe local desktop bridge for allow-listed actions:
  - Open installed applications.
  - Focus an open application.
  - Close an application using its normal close request.
  - Play/pause, next/previous, stop, mute, volume up/down.
  - Common navigation shortcuts for the currently focused app.
  - Pick and open a local video, audio, or other file with the Windows default app.
  - Optional start with Windows.

The page never gets Node.js or arbitrary shell access. The preload exposes only the allow-listed bridge, and the Electron main process checks the DAI GitHub Pages origin before executing local actions.

Some elevated/admin programs may not accept control from a normally launched DAI process. DAI should run with the same Windows privilege level as the target app when needed.
