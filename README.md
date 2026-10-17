# Glove Foam Mechanics

Explore foam compositions and their response to impact in the existing [Lovable project](https://lovable.dev/projects/3d6d452d-5a37-4acb-8599-f166ccaf07bb). The original Foam Stack Builder v12 package supplies the material laws, numerical model, and historical screening records.

The homepage runs the simulator in a full-page, same-origin iframe within the TanStack Start application. The interface is organized vertically: Impact, Target, Layers, Results, Impact graphs, Parameter study, and Methodology. Save/load, trace-export, and the artificial rigid-striker preset are no longer exposed in the interface.

## Development and builds

With the project's locked dependencies available:

```sh
npm run dev
npm run build
```

Both commands regenerate `public/foam-stack/foam_stack_builder_v12.html` from the editable fragments in `foam-stack/source/` and the root-level [`METHODOLOGY.md`](METHODOLOGY.md). A small build-time renderer converts the methodology's Markdown to HTML, then the pinned KaTeX dependency renders its LaTeX as native MathML. Lovable builds do not need Python; the generated simulator needs no math scripts, fonts, or network requests. Development changes to simulator fragments or the methodology require rerunning `npm run build:foam` and reloading the browser.

To rebuild only the simulator with the build dependencies installed:

```sh
npm run build:foam
```

Open `public/foam-stack/foam_stack_builder_v12.html` in a browser. The same file is served at `/foam-stack/foam_stack_builder_v12.html` when hosted. Source and audit data remain outside `public/`.

## Checks

```sh
npm run test:foam
npm run test:foam:hand
npm run test:foam:materials
npm run test:foam:browser
npm run test:foam:browser -- --url http://localhost:8080
```

The numerical suite runs with Node.js. The browser suite requires Python with Playwright and Chromium, Chrome, or Edge available. Use the URL printed by the dev server for the hosted check; `--browser` can select an executable. Standalone checks verify offline operation; hosted checks exercise the homepage iframe. New browser reports and screenshots go to the ignored `output/playwright/` directory.

The supplied screening records and sample files are retained in `foam-stack/`. See [the mechanics audit](foam-stack/MECHANICS_AUDIT.md) for findings and [the simulator README](foam-stack/README.md) for reproduction commands. Numerical checks verify the stated model; empirical foam/glove validation remains outstanding.

## Foam layers

Soft, Medium, and Firm are complete layer presets. Editing total thickness scales every layer proportionally while retaining each layer's material settings. Individual layers must remain between 0.5 and 100 mm.

Results update for the selected stack and impact. A numerical range limit is not a resolved peak or measured foam bottom-out.

## Hand Spring

Human presets (30% gentler, Adult study and Olympic boxer) and custom impacts now
include one **Hand Spring at 1 kN/mm** behind the glove foam, on every target. Think
of a firm rubber cushion representing the combined give of the hand and wrist.
The moving mass, spring, foam and target carry the same total force. As the foam
becomes stiff, the spring supplies more stopping travel.

The spring acts throughout the impact: `hand give = force / stiffness`, and its
stored energy is `force² / (2 × stiffness)`. Total work includes foam, target and
hand spring contributions. Hand give does not reduce the reported foam thickness.
Results show **Peak force**. Hand give, stored spring energy, and the model
assumption are explained in the bottom Methodology section.

The fixed stiffness is a modeling assumption, not a measured hand property. It
estimates transmitted force, not pain or injury, and retains the existing foam
curve and finite range limits. Mechanical glove-study impacts and SATRA checks
continue to use their rigid strikers without a Hand Spring.

## Targets and outcomes

The study target selector offers **Rigid plate + 25 mm EVA75**, **Rigid plate + 50 mm EVA75**, and **Heavy bag**. The two plate coverings follow [Perkins et al. (2018)](https://doi.org/10.4236/wjet.2018.63037). EVA75 uses nominal density 75 kg/m³ and a 55 kPa compression-pressure anchor at 25%; the unmeasured curve is supplied by the EVA-family approximation. Target parameters remain independent of glove sensitivity settings. The bag retains its assumed local compression law and free horizontal motion.

All three study targets use horizontal impacts with matched mass and speed. Automatic SATRA checks retain the original vertical, unpadded reference apparatus and show only 3 J / 10 J model Pass, Fail, or Unresolved. They do not certify a physical glove.

Results include peak force, force reached by 10 ms as a percentage of peak, time to peak, loading impulse, remaining glove thickness, fist speed and foam sample weight. If peak force occurs before 10 ms, the percentage samples that earlier peak and reports 100%; it does not invent an unloading force at 10 ms. An unresolved peak has no percentage. Impulse covers first compression only.

Foam weight is calculated from each material's density and its specified thickness over a **30 × 30 mm** square. It is a standardized foam sample mass, not complete-glove mass, and does not alter impact mass or contact geometry.

## Parameter study

The Parameter study section runs **9,855 numbered tests**: 365 designs at 30–70 mm, nine glove-response scenarios, and all three targets. It holds the adult-study impact fixed at 2.597 kg and 7.7 m/s. Designs include seven named materials, all two-material pairs at three proportions, and the preset stacks. Glove stress scale and high-compression tail exponent vary independently of the target curves.

**Run study & download CSV** calculates in a browser worker, shows progress, supports cancellation and downloads the complete table. The run uses the current bag settings and the adult-impact Hand Spring. Every row records its test number, timestamp, design, materials, target and solver inputs, all requested outputs, and unresolved/error status. A completed run also updates the analysis. The stored default-target study predates the Hand Spring: its results and rankings are historical and must be rerun to describe the current model.

The frontier compares peak force, sample weight and total thickness. A design must have no higher peak in every matched target/scenario, with no extra weight or thickness, to dominate another. Incomplete designs cannot establish dominance. This tests direction within a specified model/grid; it is not a global optimum or a confidence bound on real foam behaviour.

Reproduce the full study with `npm run study:foam`. Artifacts are in `foam-stack/analysis/`: `adult-parameter-study.csv`, its complete plan and summary, and the exploratory analysis report. `npm run test:foam` includes the original mechanics, bag, layer, early-loading, padded-target and sweep suites. Individual commands include `test:foam:padded`, `test:foam:early` and `test:foam:sweep`.

## Lovable sync

Changes pushed to the connected `main` branch sync into the [Lovable editor](https://lovable.dev/projects/3d6d452d-5a37-4acb-8599-f166ccaf07bb). Publish from Lovable when ready. Preserve published git history; do not force-push or rewrite existing commits.
