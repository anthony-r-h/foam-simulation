# Foam stack frontend

The TanStack homepage embeds the generated [simulator HTML](../public/simulator.html). Its sections are Impact, Layers, Results, and Impact graphs.

## Editable source

- `shell.html`: page structure and controls.
- `style.css`: layout, typography, layer colors, and responsive styling.
- `app.js`: presets, catalog-backed inputs, browser simulation calls, result rendering, sample blocks, and SVG graphs.
- `../javascript/simulation.js`: browser port of the Python simulation engine.
- `../scripts/build-foam.mjs`: embeds these fragments and the catalog from `../data/analytical-foams.csv` into the generated HTML.

The frontend has no browser library dependencies. Simulations run in the browser through `../javascript/simulation.js`. The Python engine in `../simulation.py` remains authoritative for analysis.

## Rebuild and preview

Run from the repository root:

```sh
node --check frontend/app.js
node --check javascript/simulation.js
npm run build:foam
```

Rebuild after changing a fragment or the catalog, then reload the browser. `npm run dev` and `npm run build` also rebuild the HTML before invoking Vite.

Use `npm run dev` for local preview. The generated simulator does not need a Python process or a deployed simulation endpoint.

## Impact

The slider selects Light, Child, Developing, Adult, Boxer, or Gorilla and defaults to Adult. Adult retains 2.597 kg at 7.7 m/s. The other stops retain the previous reference energies (5, 20, 45, 121, and 200 J), with speed derived at the same 2.597 kg mass. Only the joule value appears below the selected reference.

## Layers and results

Four fixed layers are named Outside, Main cushion, Support, and Hand comfort. Soft, Medium, and Hard presets set their materials and thicknesses. Each thickness is a positive whole number of millimetres. Material type, density, and firmness are collapsed under Material details. The target is fixed to 50 mm EVA75 in the simulation request.

Layer colors connect the editors, sample blocks, response labels, and graph lines. The blocks are placeholders for external foam geometry. Sample weight sums the four 30 × 30 mm foam samples using the engine's returned weight. Graph views show cumulative remaining thickness with force, or glove work with speed.
