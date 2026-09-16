# Glove Foam Mechanics

The Lovable homepage embeds the standalone simulator at
`../public/foam-stack/foam_stack_builder_v12.html`. Both versions use the same
generated HTML and work without external assets. Editable fragments, historical
screening data, checks and the new parameter-study results live here.

## Current interface and model

Cards appear vertically: Impact, Target, Layers, Results, Impact graphs, Parameter
study, and Methodology. Soft, Medium and Firm are complete stack presets. Changing
total thickness scales every layer proportionally, preserving its material inputs.
The artificial rigid-striker preset and Save/Load/Export trace controls are removed.

Study targets are a rigid plate with **25 mm EVA75**, a rigid plate with **50 mm
EVA75**, and a **moving, deforming heavy bag**. All study impacts are horizontal.
The EVA75 mat shares local pressure with the glove layers and contributes its own
compression and loading work. Its nominal 75 kg/m^3 density and 55 kPa pressure at
25% compression anchor an assumed EVA-family curve. Mat inputs stay fixed when
glove response assumptions change. The curved striker remains a geometric
approximation; the published mechanical fist has not been reconstructed.

The bag combines free translation with an assumed local loading spring. Its
defaults are 41 kg, 42 cm diameter and 40 kN/m stiffness. Controls provide 10-100 kg,
25-80 cm and 20/40/80 kN/m. These are scenario settings, not measured uncertainty
bounds. The bag starts at rest; unloading, rebound and suspension dynamics are
outside the first-compression model.

Human presets (30% gentler, Adult study and Olympic boxer) and custom impacts use
a fixed **Hand Spring at 1 kN/mm (1,000,000 N/m)** on every target. It represents
combined hand/wrist give: moving mass → Hand Spring → glove foam → target.
The massless spring carries the total contact force throughout the impact, with
`xh = F / stiffness` and `hw = F² / (2 × stiffness)`. Total closure includes hand
give; total loading work is `W = fw + tw + hw`. Foam compression and thickness
left remain glove-only quantities.

As the foam becomes stiff, the spring provides more stopping travel. This uses
the existing foam law without adding a compressed-foam law or switching at a
cutoff. Results say **Peak force**; hand give, stored energy and the assumption
appear in the bottom Methodology section.
The stiffness is an uncalibrated modeling assumption; force does not predict pain
or injury. The elastic spring stores energy rather than permanently absorbing it.
Mechanical glove-study impacts and SATRA checks retain their rigid strikers and
omit the Hand Spring. Model-domain limits still apply.

Results show peak force, force reached by 10 ms relative to peak, time to peak,
loading impulse, glove thickness left, fist speed and foam sample weight.

- Early loading samples at the earlier of 10 ms and the resolved peak. A peak
  before 10 ms gives 100% and is labeled explicitly. The raw exact-10-ms force is
  retained only when the trace covers it. An unresolved peak has no percentage.
- Time and impulse cover first compression only. The impact graphs show force,
  glove compression decomposed by layer, glove loading work and fist speed. When
  present, hand give is a separate compression band and hand spring energy is a
  separate energy line. Target deformation stays in the solver but is omitted
  from these graphs.
- Weight sums density times specified thickness over a **30 x 30 mm square**. It
  excludes the target, cover and other glove components, and does not change the
  prescribed impact mass or circular contact geometry.
- Automatic SATRA 3 J / 10 J checks use the original vertical bare-support rig and
  2 kN criterion. Two passive labels show model Pass, Fail or Unresolved. They are
  independent of the study target and do not certify a physical glove.

The metric notes use descriptive bands:

- Force reached by 10 ms: below 50% **Gradual buildup**; 50% to below 70%
  **Moderate buildup**; 70% through 85% **Sharp buildup**; above 85%
  **Very sharp buildup**. A peak before 10 ms remains 100%, with its early timing
  explained separately.
- Time to peak: below 10 ms **Abrupt buildup**; 10 ms to below 12 ms **Quick buildup**;
  12 ms through 18 ms **Moderate buildup**; above 18 ms **Gradual buildup**.

These user-defined bands describe loading rather than glove quality. Preferences
for feel differ; the bands are not experimentally calibrated feel or injury
classes. A lower relative early force can result from a higher later peak.
Published force examples retain their apparatus context.
The methodology is authored in LaTeX and rendered to native MathML during build.

## Parameter study and findings

**Run study & download CSV** calculates 9,855 numbered cases in a browser worker:
365 designs, nine glove-response scenarios and three targets, using the adult
study input of 2.597 kg at 7.7 m/s. The browser remains interactive; cancellation
preserves the preceding completed analysis. A finished run downloads the CSV and
updates the comparison. The run uses the currently selected bag settings.
New runs include the fixed 1 kN/mm Hand Spring for the adult impact.

The grid includes 30, 40, 50, 60 and 70 mm stacks; seven single materials; every
two-material pair at 25/75, 50/50 and 75/25 thickness ratios; and three presets.
Sensitivity combines stress multipliers 0.8/1.0/1.2 with tail exponents 1.5/2/3.
These are local assumed scenarios, not measured tolerances or exhaustive bounds.

The stored default study **predates the Hand Spring** and has **8,515 resolved and
1,340 unresolved cases, with zero calculation errors**. Its counts and rankings
are historical; rerun the study for the current model. Of 134 fully compared
historical designs, 56 are on the frontier
and 78 are dominated. A dominating design uses no more weight or thickness and
has no higher peak in every matched condition. Designs with any unresolved case
cannot establish dominance. No single material wins on all targets.

See [the exploratory analysis](analysis/EXPLORATORY_ANALYSIS.md),
[all numbered cases](analysis/adult-parameter-study.csv),
[the full plan](analysis/adult-parameter-study-plan.json), and
[the refinement checks](analysis/refinement-checks.json).

## Reproduce

Run from the repository root:

```sh
npm run build:foam
npm run test:foam
npm run test:foam:hand
npm run test:foam:materials
npm run study:foam
node foam-stack/analysis/run_refinement.cjs
python foam-stack/source/test_browser.py
```

`npm run dev` and `npm run build` also regenerate the HTML. The pinned KaTeX build
dependency renders the equations; Python is unnecessary for Lovable builds.
`source/build.py` remains a compatibility entry point to the Node builder.

The pre-Hand-Spring numerical record includes 323 original mechanics checks, 457 bag
checks, 10 layer-scaling checks, 812 early-loading checks, 705 padded-target/weight
checks and 56 sweep checks. The separate material suite has 739 checks. The full
CSV was independently checked for numbering, inputs, missing-result handling,
energy, momentum and mass calculations. Selected rankings passed 322 refinement
checks over 126 solves; this does not revalidate every frontier comparison.

`test:foam:hand` checks the Hand Spring against analytic spring solutions,
energy/force balances, scope exclusions and finite model limits. It also runs as
part of `test:foam`. Historical reports remain records of their original model.

The pre-Hand-Spring browser suite passed 517 standalone and 520 hosted checks, including
all three targets, early peaks, weight, actual worker CSV download, cancellation
and mobile layout. Browser reports and screenshots are under
`../output/playwright/foam-study-standalone/` and `foam-study-hosted/`.
The final embedded study also passed 87 focused browser checks; its screenshots
and reports are in `../output/playwright/foam-study-final-smoke/`.

Browser checks need Python Playwright and Chromium. On Windows this environment
uses `C:/Python311/python.exe`. Add `--url http://localhost:8081` to check the
hosted iframe; use the port printed by the dev server. `--browser` and `--output`
override the executable and output directory.

## Historical artifacts

The supplied v12 material laws and original rigid-support checks are retained.
`source/numerical_checks_v12.json`, `source/browser_checks_v12.json` and
`source/screen_v12.json` document the original package. Its 40 mm presets were
selected using low-energy rigid-support screening; they were not global optima
for the new targets. The artificial 1 mm, 5 GPa contact layer is a numerical
reference with no anatomical hand tissue. It remains only in backend checks.

`source/run_screen.py` reproduces the historical thickness screens.
`source/refresh_docs.py` refreshes marked preset tables and definitions while
preserving the reviewed methodology prose. Both use explicit UTF-8. Same-grade
layers can be combined; layer order has no effect in the independent-column model.

See [MECHANICS_AUDIT.md](MECHANICS_AUDIT.md) for the assumptions, equations, sources
and remaining measurement needs. Numerical consistency is established for the
stated model; physical prediction of a real glove remains unvalidated.
