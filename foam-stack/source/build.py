"""Keep the original Python entry point using the hosted app's Node builder."""

from pathlib import Path
import subprocess

repository = Path(__file__).resolve().parents[2]
subprocess.run(["node", str(repository / "scripts" / "build-foam.mjs")], check=True)
