"""Compatibility entrypoint. Install dev dependencies with npm ci first."""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent
subprocess.run(["node", str(root / "scripts" / "build.mjs")], cwd=root, check=True)
