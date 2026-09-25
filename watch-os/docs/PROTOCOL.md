# DAI Watch Link Protocol v1

Transport is intentionally abstract: BLE is primary; Wi-Fi can be added later.

Every message carries:
- v: protocol version
- type: event type
- id: request/session id
- text: optional UTF-8 payload

Voice flow:
1. Watch enters LISTENING.
2. Audio transport begins.
3. Server/phone signals THINKING when capture ends.
4. Speech playback starts only after SPEECH_START.
5. UI enters SPEAKING for exact animation/audio synchronization.
6. SPEECH_END returns UI to IDLE.

Text replies use REPLY_TEXT without mouth animation.
