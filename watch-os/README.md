# DAI Watch OS v1

Standalone wearable client for DAI on an ESP32-S3 watch platform.

## Target
Initial hardware profile: ESP32-S3 + 240x280 ST7789V2-class touch display. The architecture keeps DAI intelligence, search and speech services on the phone/server while the watch owns the UI, interaction state and low-latency command transport.

## v1 states
- IDLE
- LISTENING
- THINKING
- SPEAKING
- ERROR

## Architecture
watch UI -> DAI link -> phone/server -> DAI services

No Xiaomi firmware flashing is required. Redmi Watch 3 Active remains untouched.

## Current milestone
A compilable host-side prototype/state machine is the first milestone. Hardware drivers are isolated behind interfaces so the UI/DAI protocol can be developed before physical hardware arrives.
