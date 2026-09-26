# DAI Watch Link Protocol v1

This protocol is transport-independent.

On M65A the transport is intentionally left behind an adapter until we prove which watch-to-phone action channel is available. On an ESP32 fallback it can map directly to BLE or Wi-Fi.

Every logical message carries:
- v: protocol version
- type: event type
- id: request/session id
- text: optional UTF-8 payload

## Voice/state flow
1. User action requests LISTENING.
2. Bridge starts capture on the supported endpoint.
3. DAI enters THINKING when capture ends.
4. SPEECH_START changes the shell to SPEAKING exactly when audio playback begins.
5. SPEECH_END returns the shell to IDLE.

Text replies use REPLY_TEXT and do not trigger mouth animation.

The watch shell may initially support only a subset of these events. Unsupported events must degrade to a visual-only state rather than attempting privileged system access.
