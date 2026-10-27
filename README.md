# Boxing glove foam simulation

This project compares the modeled impact response of layered boxing-glove padding. It combines commercial foam data, published compression-response models, glove geometry, and punch conditions to examine how material choice and layer thickness affect force, compression, timing, and weight.

## Interactive simulator

The [interactive simulator](https://foam.believe.cv/) provides a visual interface for the browser implementation. It can be used to vary the impact condition, foam material, and thickness of each glove layer, and to inspect the resulting force, compression, timing, and weight alongside the full impact traces.

![Impact and layer controls in the interactive simulator](figures/app-simulator-overview.png)

The repository contains two implementations of the same loading model:

- `simulation.py` is the authoritative Python engine used for analysis.
- `javascript/simulation.js` is the browser port used by the interactive simulator.

The complete model, analysis, and design conclusions are in [Simulating the impact response of layered boxing-glove padding](docs/README.md).

## Run the browser simulator

With the JavaScript dependencies available, start the TanStack development server:

```sh
npm run dev
```

The command rebuilds `public/simulator.html` before starting Vite. For a production build:

```sh
npm run build
```

The deployed simulator runs entirely in the browser. It does not require the Python engine or a local filesystem.

Edit the source files in `frontend/` and `javascript/simulation.js`. Do not edit `public/simulator.html` directly; regenerate it with:

```sh
npm run build:foam
```

See [frontend/README.md](frontend/README.md) for the interface structure and [javascript/README.md](javascript/README.md) for the browser engine.

## Run the Python model

Install the pinned Python dependencies:

```sh
python3 -m pip install -r requirements.txt
```

The main API is `simulate(mass_kg, speed_m_s, layers, target)`:

```python
from simulation import simulate

result = simulate(
    mass_kg=2.597,
    speed_m_s=7.7,
    layers=[
        {"layer": 1, "foam_id": "foam-factory-hd36-hq", "thickness_mm": 20},
        {"layer": 2, "foam_id": "evazote-ev50", "thickness_mm": 20},
    ],
    target={"foam_id": "cutfoam-eva75", "thickness_mm": 50},
)

print(result["metrics"])
```

Model defaults are defined in `assumptions.yaml`. Foam identifiers and computation-ready properties come from `data/analytical-foams.csv`.

## Repository guide

| Path | Purpose |
| --- | --- |
| `docs/README.md` | Combined model, analysis, and conclusions |
| `docs/OUTLINE.md` | Working structure for the document |
| `docs/MODEL.md` | Mechanical model, equations, assumptions, and outputs |
| `docs/ANALYSIS.md` | Authored simulation analysis |
| `docs/DECISIONS.md` | Settled choices and consequential open questions |
| `simulation.py` | Authoritative Python simulation engine |
| `javascript/` | Browser engine and parity-test adapter |
| `frontend/` | Editable simulator interface |
| `src/` | TanStack application shell |
| `data/commercial-foams.csv` | Supplier-facing foam data |
| `data/analytical-foams.csv` | Normalized catalog used by both engines |
| `analysis/` | Analysis scripts for the completed simulation results |
| `scripts/` | Catalog, build, rendering, figure, test, and sweep utilities |
| `figures/` and `diagrams/` | Generated analysis figures and model diagrams |

## Data and document workflows

Rebuild the analytical foam catalog from the commercial source data:

```sh
python3 scripts/build_analytical_foams.py
```

Render the analysis tables without modifying the authored source:

```sh
python3 -m scripts.render_analysis
```

Regenerate the model diagrams:

```sh
node scripts/generate-figures.mjs
```

Run a new role-based simulation sweep:

```sh
python3 -m scripts.run_simulations --workers 8 --output data/results.csv
```

The sweep refuses to overwrite an existing result file. Add `--resume` to continue a compatible interrupted run.

## Validation

Run the focused Python checks and frontend parity test:

```sh
python3 -m unittest discover -s scripts -p 'test_*.py'
```

Check the browser source, generated figures, application lint, and production build:

```sh
node --check frontend/app.js
node --check javascript/simulation.js
node scripts/generate-figures.mjs --check
npm run lint
npm run build
```

## Lovable hosting

The production frontend is built and hosted by Lovable. Changes pushed to the connected branch sync back to the Lovable project, so published Git history must not be rewritten.
