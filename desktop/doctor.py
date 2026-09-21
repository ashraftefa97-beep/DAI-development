"""Run with the SAME Python environment used for dai_ui.py; never installs anything."""
import importlib.util
import json
import os
import socket
from pathlib import Path
from urllib.parse import urlsplit
from dai_core import settings

def inspect():
    cfg = settings()
    url = urlsplit(cfg["ollamaUrl"])
    try:
        with socket.create_connection((url.hostname, url.port or (443 if url.scheme=="https" else 80)), timeout=2):
            ollama = True
    except OSError:
        ollama = False
    tts = Path(os.environ.get("DAI_TTS_ROOT", r"C:\DAI-XTTS"))
    return {
        "dependencies": {name: importlib.util.find_spec(name) is not None for name in
                         ("PySide6","requests","numpy","sounddevice","faster_whisper","ddgs","edge_tts","torch","f5_tts")},
        "ollamaPortReachable": ollama,
        "configuredModels": [cfg["model"], cfg["fallbackModel"]],
        "referenceWavExists": (tts/"reference.wav").is_file(),
        "silmaDirectoryExists": (tts/"models"/"SILMA-TTS").is_dir(),
        "ttsStatus": "SILMA/F5 integration requires validation on the computer containing these assets",
    }

if __name__ == "__main__":
    print(json.dumps(inspect(), ensure_ascii=False, indent=2))
