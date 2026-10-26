# JavaScript simulation engine

`simulation.js` is a browser-only port of [`../simulation.py`](../simulation.py).
It lets the Lovable-hosted frontend run without a Python server. The Python
engine remains the authoritative implementation for analysis and generated
results.

Keep numerical changes aligned with the Python engine and `assumptions.yaml`.
The frontend parity test runs the same requests through both implementations
and compares their displayed metrics and traces.

`simulation-runner.mjs` is a small stdin/stdout adapter used by that test. The
production build embeds `simulation.js` into `public/simulator.html`; it does
not use the runner.
