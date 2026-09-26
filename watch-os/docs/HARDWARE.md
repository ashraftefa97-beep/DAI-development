# Hardware profile

## Primary target: Redmi Watch 3 Active
- Model family: M2235W1 / M65A
- Display target: 240 x 280
- Existing watch firmware remains installed.
- DAI runs as a shell/prototype inside capabilities exposed by the normal watch environment.

### Known integration boundary
The shell must not assume direct access to microphone, speaker, raw Bluetooth or system services until those APIs are proven on M65A.

### Safe development rule
Development on the original watch is read-only or normal watch-face installation only. Do not switch the watch into ENG/USER DEBUG modes and do not force-flash unknown OTA packages.

## Secondary target
If the original watch runtime cannot provide the required interaction path, the same DAI state machine and bridge protocol can move to an ESP32-S3 wearable board without redesigning the DAI service layer.
