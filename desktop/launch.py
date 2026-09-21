"""Dependency-aware entry point; uses the selected Python environment without installing packages."""
import importlib.util
import os
from pathlib import Path
import runpy
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
extra = os.environ.get("DAI_PYLIBS")
if extra and Path(extra).is_dir():
    sys.path.insert(0, extra)
if "--doctor" in sys.argv:
    runpy.run_path(str(ROOT / "doctor.py"), run_name="__main__")
    raise SystemExit(0)
missing = [name for name in ("PySide6", "requests", "numpy") if importlib.util.find_spec(name) is None]
if missing:
    print("DAI cannot start in this Python environment. Missing: " + ", ".join(missing))
    print("Use the existing AI-Companion venv, or run launch.py --doctor to inspect this environment.")
    raise SystemExit(2)
runpy.run_path(str(ROOT / "dai_ui.py"), run_name="__main__")
