# Glove Foam Mechanics

A foam stack simulator hosted in the existing [Lovable project](https://lovable.dev/projects/3d6d452d-5a37-4acb-8599-f166ccaf07bb). The TanStack Start homepage embeds `/simulator.html` in a same-origin iframe.

The frontend selects an impact reference with a discrete slider and configures four foam layers. Soft, Medium, and Hard presets populate the layers. Results include impact metrics, colored sample blocks with layer response, summed 30 × 30 mm sample weight, and impact graphs.

## Development and builds

With the project's dependencies available:

```sh
npm run dev
npm run build
```

Both commands regenerate the simulator HTML before running Vite. To rebuild only the simulator, using Node.js without installed npm dependencies:

```sh
npm run build:foam
```

Edit `frontend/app.js`, `style.css`, `shell.html`, and `javascript/simulation.js`, then rebuild and reload. The builder embeds the browser engine and material catalog from `data/analytical-foams.csv`. Do not edit the generated HTML directly.

## Frontend simulation

The deployed frontend runs a JavaScript port of the simulation directly in the browser. Its source and parity-test adapter are in `javascript/`; see [`javascript/README.md`](javascript/README.md). The Python engine remains authoritative for analysis.

For local frontend development:

```sh
npm run build:foam
npm run dev
```

The normal Lovable/TanStack build embeds the JavaScript engine and foam catalog in `public/simulator.html`; no Python service is required by the site.

## Source and historical records

The current [model](docs/MODEL.md), [working outline](docs/OUTLINE.md), and [decisions](docs/DECISIONS.md) live in `docs/`. The Python engine is `simulation.py` at the repository root. Follow [AGENTS.md](AGENTS.md) for the authoring workflow. The [former methodology](legacy/METHODOLOGY.md) is retained as historical source material.

`data/commercial-foams.csv` holds supplier data; `scripts/build_analytical_foams.py` generates `data/analytical-foams.csv` for the engine and frontend. `assumptions.yaml` holds model settings. See [FIGURES.md](docs/FIGURES.md) for figure generation and [the frontend README](frontend/README.md) for the interface source.

## Checks and sweeps

With the Python dependencies in `requirements.txt` available:

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
python3 -m unittest discover -s scripts -p 'test_*.py'
node scripts/generate-figures.mjs --check
```

Run the role-based sweep from the repository root:

```sh
python3 -m scripts.run_simulations --workers 8 --output data/results_new-run.csv
python3 -m scripts.run_simulations --workers 8 --output data/results_new-run.csv --resume
```

The default output is `data/simulations.csv`. New runs refuse to overwrite existing results. During a run, keep its checkpoint and lock file for recovery; resume requires unchanged model code and inputs. After a run finishes and no runner is using it, those recovery files can be removed.

The completed October 23 results are in `data/results_full_2026-10-23.csv`. Earlier result files, logs, checkpoints, and the source snapshot have been removed. Generated `data/results*.csv` files remain local and ignored by Git.

## Lovable sync

Changes pushed to the connected `main` branch sync into the [Lovable editor](https://lovable.dev/projects/3d6d452d-5a37-4acb-8599-f166ccaf07bb). Publish from Lovable when ready. Preserve published git history; do not force-push or rewrite existing commits.
