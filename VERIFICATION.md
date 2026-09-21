# Verification — DAI, 21 September 2026

Latest deployment: 1789977100407 — ready; no frontend/backend/network errors.
Previous working deployment: 1789948192837.
Reference source: reference/dai_ui.py.

## Passed with real code/runtime
- Qt desktop window starts, renders Arabic after loading the installed Segoe UI font in the offscreen test environment, and closes.
- Python unit/integration suite: 7 tests passed.
- DaiFace class AST is unchanged from the supplied laptop reference.
- Python/JavaScript pose parity: 234 combinations, 7,488 numerical values, tolerance 1e-10, all passed.
- Motion engine produces finite values at 30, 60, and 120 Hz.
- All 13 Canvas states render in installed Microsoft Edge without JavaScript errors.
- Live anonymous API requests through the actual deployed SDK returned 401 for conversations, settings, and a conversation's messages.
- Public live login page: HTTP 200; no JavaScript errors; no horizontal overflow at 375x667.

## Passed using explicitly mocked dependencies
- Desktop model request and qwen fallback, Arabic intent normalization, source filtering, atomic memory, corrupt memory handling.
- Desktop STT WAV pipeline with a mocked transcriber; voice failure leaves keyboard input usable.
- Backend handlers with a mocked SDK/database/storage/model: 8 protected route families, cross-user get/chat/delete denial, settings validation/persistence, chat history pointers, upload signature validation, multi-page deletion, per-instance throttling.
- Deployed frontend JavaScript with browser-local mocked auth/API: sign-in/out, chat, reload persistence, settings save/failure, failed-send draft recovery, deletion, state changes, mobile layout.
- Mock frontend tests never used or modified the user's production conversations.

## Not verified / unavailable
- Real Ollama generation, qwen models, GPU/CUDA execution.
- Real microphone device capture and Faster-Whisper inference.
- Real SILMA/F5 synthesis, reference voice quality, generated Arabic WAV, or TTS playback.
- Actual third-party OAuth login/logout and two-real-account data isolation.
- Real authenticated hosted chat/storage persistence/delete or real live research responses.
- Browser speeech recognition recognition quality and service availability.
- Global distributed rate limits and concurrent multi-client correctness.
- Exact match to an unseen newer source on the other computer.
- No E2E results were returned by AppDeploy (e2e_tests: null). Empty deployment logs are not evidence of those workflows passing.

## Reproduce local tests
Use a Python environment with PySide6, numpy, and requests:
    python -B tests/test_desktop.py
    node tests/test_motion.mjs
    node tests/test_backend.mjs
Desktop tests use offscreen Qt, mocked model/voice providers, and temporary memory files. They do not call Ollama or record audio.
The test suite writes pose fixtures and preview images into the delivery folder.
Browser tests ran through Playwright with the already-installed Edge browser. Original working test scripts remain in the task's work folder.

Preview caveat: web-studio screenshots use an explicitly mocked session/API; they demonstrate the actual rendered frontend, not authenticated production AI behavior.

DDGS timeout and safe-search argument names were checked against the maintainer documentation: https://github.com/deedy5/ddgs/blob/main/README.md . Safe search uses the documented value on.
