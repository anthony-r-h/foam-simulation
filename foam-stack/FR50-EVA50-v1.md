# Four-Role 50 mm / EVA75 50 mm — v1

Protocol ID: **`fr50-eva50-v1`**. This is a computational parameter study, not a physical certification test.

## Design rules

Every stack totals exactly **50 mm**, contains **four different materials**, and has exactly one material in each role. A material cannot occupy two roles. All seven inventory materials are eligible for every role; all seven need not appear in an individual stack.

| Role ID | Allowed thickness |
| --- | --- |
| `hand_comfort` | 1, 2, 3, 4, 5 mm (2–10% of the stack) |
| `support_backing` | 1, 2, 3, 4, 5 mm (2–10% of the stack) |
| `main_padding` | Positive multiples of 5 mm (10% increments) |
| `outer_contact` | Positive multiples of 5 mm (10% increments) |

Outer contact and main padding fill the remainder. The physical layer order is Outer contact, Main padding, Support backing, Hand comfort.

Inventory, in fixed canonical order: `soft` (PU Soft HR), `hd36` (PU HD36-HQ), `lux` (PU Lux-HQ), `qualux` (PU Qualux Firm), `ev30` (Evazote EV30), `ev50` (Evazote EV50), `latex` (Dunlop latex). Use the unchanged named definitions in the archived `engine.js`. No custom materials, property perturbations, or separate presets.

## Enumeration and numbering

1. Enumerate comfort 1–5 mm, then backing 1–5 mm, then main padding in ascending 5 mm increments. Compute outer contact as the remainder; keep only positive multiples of 5 mm.
2. Assign four distinct inventory materials to the ordered roles, using the inventory order above.
3. Canonicalize each composition by listing its material/thickness pairs in inventory order. Its design ID joins `material-thickness` entries with underscores.
4. Merge identical design IDs. Retain **all** originating role assignments with that composition.
5. Sort design IDs in ascending code-point order, independent of locale. Assign test numbers **1–7,910**. Each composition gets one test on the sole target. Test IDs append `__stress-1-tail-2__eva50` to the design ID; qualify them with the protocol ID when combining studies.

There are **39 role-thickness patterns × 840 distinct-material assignments = 32,760 role assignments**, yielding **7,910 unique model compositions**. The solver ignores role labels and layer order, so equivalent role assignments are not independent tests. These labels do not model skin comfort, adhesion, or backing-specific mechanics.

### Test codes and readable names

The interface shows a simple label such as **Test 7251**. Each numbered test also has a protocol-qualified export code, such as `fr50-eva50-v1-00001`, exported as `test_code`. The original composition-based `test_id` remains available. Codes and numbers do not depend on which axes are selected or on worker scheduling.

Names use ordinary role-labelled text, for example `Outer contact: 35 mm Evazote EV50; Main padding: 10 mm Evazote EV30; Support backing: 4 mm Soft HR; Hand comfort: 1 mm Qualux Firm`. The selected stack is displayed as four table rows. Names list material and thickness **from hand to target: hand comfort → main padding → outer contact → support backing**. For each deduplicated composition, use the first valid role assignment encountered by the enumeration above as its reproducible representative. `test_name`, `design_label`, and CSV `layer_1` through `layer_4` describe that assignment in physical layer order; each layer includes its role. Canonical composition IDs and the solver's internal material order remain unchanged.

All equivalent assignments remain in `role_assignments_json`. The selected-test view can display any of those assignments; they share one simulation result. A readable name therefore describes a valid representative stack, not a claim that role order changes this model's physics.

### Scatter-plot exploration

X and Y are independently selectable: peak force, foam specimen weight, F10/Fmax, time to peak, percent thickness remaining, and kinetic energy at exactly 10 ms. All points with both axis values are plotted; unavailable values are omitted and counted, never replaced with zero. Constant axes remain valid. The frontier follows the selected pair of axes and their preferred directions. Each outcome has its own frontier against weight.

## Fixed simulation inputs

| Input | Value |
| --- | --- |
| Target | 50 mm EVA75 on a fixed plate |
| Effective impact mass | 2.597 kg |
| Initial speed | 7.7 m/s |
| Initial energy | 76.988065 J |
| Gravity along impact | 0 m/s² |
| Hand spring | 1,000,000 N/m (1 kN/mm) |
| Striker curvature radius / contact face radius | 100 mm / 40 mm |
| Glove and target stress multipliers | 1 |
| Glove and target tail powers | 2 |
| Thickness retention / global firmness | 1 / 1 |
| Loading curve / loading duration | `fast` / 0 ms |
| Solver | `nr=24`, `nt=20`, `resolution=550`, `steps=240` |
| Foam weight basis | 30 × 30 mm specimen; excludes target and coverings |

The archived model sources specify the full geometry, material calibration, priors, target law, solver and defaults. No sensitivity scenarios belong to this protocol.

## Outcomes and analysis

Export peak force; F10/Fmax; time to peak; foam thickness remaining at the endpoint; fist speed at peak; first-compression impulse; sample weight; and kinetic energy at exactly 10 ms. Preserve `resolved`, `unresolved`, and `error` statuses and reasons. An unresolved endpoint is not a resolved peak.

**F10/Fmax = F(min(0.010 s, time to peak)) / peak force.** The CSV stores this as a percentage. A peak before 10 ms gives 100%; it is not force at exactly 10 ms. The CSV also records the actual sample time and exact-10-ms force availability.

**Energy at 10 ms** is remaining striker kinetic energy, linearly interpolated on the first-compression trace. It is unavailable if the trace ends earlier; do not substitute zero or energy at peak.

### Frontiers and individual outcome rankings

The physical study and its 7,910 test identities are unchanged. Scoring is a separate analysis, identified by **`outcome-rank-percentile-v1`**.

| Outcome | Better direction |
| --- | --- |
| Peak force | Lower |
| Sample weight | Lower |
| F10/Fmax | Lower |
| Time to peak | Higher |
| Thickness remaining (%) | Higher |
| Energy remaining at exactly 10 ms | Lower |

**Thickness remaining (%) = 100 * remaining thickness / original thickness.** The simulation CSV retains millimetres as well as this percentage; the graph and scoring use the percentage.

For each outcome versus weight, a design is dominated if another resolved design uses no more weight and is at least as good on the outcome, with at least one strict improvement. The time-to-peak frontier therefore shows the longest time attainable at a given weight or less. Identical coordinates share membership. The graph uses the same rule for any selected pair of axes.

For each outcome, rank resolved tests with an available value in the preferred direction. With N available tests, **component score = 100 * (N - average tied rank) / (N - 1)**. Exact ties share the same score. Displayed rank equals one plus the number of strictly better tests. A constant outcome, or a single available test, scores 50. This gives all components a common higher-is-better scale independent of units.

Each outcome is ranked independently. Missing outcomes remain unranked. No overall score, combined ranking or weighting is applied.

The interface shows frontier filters, scatter plots, and selected-test layers and outcomes. The CLI writes `adult-parameter-study-rankings.csv` and `adult-parameter-study-scoring.json`. Exported rankings include directions, method ID, raw values and units, component ranks and scores, outcome-versus-weight frontier membership.

These directions are user preferences, not validated protection ratings. A lower F10/Fmax can result from a higher peak. Conclusions apply to the model and enumerated grid; nearly tied predictions require finer-resolution checks. The original study archive retains its historical force/weight/thickness frontier; these new analyses do not rewrite that archive.

### Exploring near-frontier subsets

Filters use **`weight-budget-relative-gap-v1`**. Each of the five outcomes has its own comparison against sample weight. The reference is always the full loaded study; selecting filters never recalculates a weaker frontier from the survivors.

For a test at weight w, let b be the best outcome among resolved tests with weight at most w. For a lower-is-better outcome, relative gap (%) is `100 * (value - b) / abs(b)`. For a higher-is-better outcome, it is `100 * (b - value) / abs(b)`. All designs at an equal weight are considered together. This is a relative percentage, including for F10/Fmax and percent thickness remaining; it is not a percentage-point difference.

Each selected filter accepts designs within its independently adjustable allowance (0 to 100%). **A 0% allowance means exact frontier membership**, including coordinate ties but excluding heavier equal-performance designs. With a positive allowance, those plateau designs may qualify at zero outcome gap. If the best reference is zero, an equal outcome has zero gap; a different outcome has an unbounded relative gap and cannot pass a finite allowance. Missing outcomes and unresolved tests cannot pass a selected filter.

Filters combine using **AND**. Adding a filter can only remove designs; widening an allowance can only add designs. Filter order does not affect the final subset. The panel shows each filter's standalone count, cumulative remaining counts in selection order, and the final survivor count. No filters are selected initially; allowances initially show 5%. Clearing the filters restores the full set.

Plots show the survivors. Axis scales and frontier membership retain the full-study reference. Changing axes does not change active filters. Outcome-range summaries show the survivors' available values, minimum, median and maximum. No aggregate score or metric weighting is introduced.

The subset CSV contains only surviving designs, retains their full-study ranks, and records the selected allowances, method ID, full reference count, directions, raw outcomes and units, gaps, best available reference values and reference design IDs. Keep this export with the study archive to reproduce the same filter selection.

## Reproduction

From the repository root, generate the complete plan and source archive without running simulations:

```powershell
node foam-stack/source/run_sweep.cjs --plan-only --output output/fr50-eva50-v1
```

Run the study into a fresh directory:

```powershell
node foam-stack/source/run_sweep.cjs --workers 4 --output output/fr50-eva50-v1-run-001
```

The runner writes the full plan and `study-manifest.json` before execution. The manifest records counts, a SHA-256 hash of the plan excluding its run timestamp, SHA-256 hashes of the archived executable sources, and the Node/platform versions. The `source` directory contains the exact model and runner, so reproduction does not depend on a later checkout. Keep the manifest, source archive, plan, CSV, summary, and any refinement report together. Worker count affects scheduling, not numbering or CSV order.

To repeat from the archive, use the recorded Node version and run its `source/run_sweep.cjs` with a new, explicit `--output` directory. Verify source and timestamp-independent plan hashes against the original manifest. Compare numerical results, excluding run timestamps; cross-platform floating-point differences may require a numerical tolerance rather than byte-identical CSV files.

Use `--limit 8` for a labelled partial smoke run. Partial results do not constitute completion of the protocol. The full runner separately rechecks the lowest five peaks and up to twenty frontier designs at finer resolution; that refinement does not replace the 7,910 baseline rows or verify every near tie.

The browser runs the same enumeration and exports role mappings and reproduction inputs in each CSV row. For the source archive and SHA-256 manifest, use the command-line runner.

**Version policy:** changes to inventory, role constraints, deduplication, numbering, impact, model, geometry, target, fixed assumptions or baseline numerical resolution require a new protocol version. Source hashes identify the exact implementation used within a version.

## Layer-label correction

The original display incorrectly called Outer contact "secondary padding" and showed an incorrect hand-to-target order. The corrected display uses the simulator's established outside-to-hand order. This is a presentation correction: material/thickness totals, composition IDs, test numbers, model inputs and numerical outcomes are unchanged. Original run archives remain unchanged; any corrected CSV is identified as a presentation-only derivative.

### Layer requirements

Each of the four layers can be filtered by material and an inclusive minimum/maximum thickness in whole millimetres. Blank fields impose no restriction. All layer requirements must hold in one valid assignment of the composition. The plot still shows each unique simulation once; inspection and the subset CSV show the first matching assignment. The CSV records the layer filters and matching layers. Layer requirements intersect with the selected frontier filters; the frontier reference remains the full study. Clearing layer filters does not clear frontier filters.

### Current stack comparison

The gold diamond evaluates the current layer-builder materials and entered properties, with thicknesses scaled proportionally to total 50 mm. It uses the same fixed striker geometry, adult impact (2.597 kg at 7.7 m/s), horizontal motion, 50 mm EVA75 target, nominal model settings and numerical resolution as the study. Builder punch/target selections do not change this comparison. It updates on layer edits, remains visible through filters when both axis values are available, and can be selected to inspect its scaled layers and outcomes. It is a separate reference, excluded from study counts, frontiers and study CSV exports. Invalid inputs or unavailable metrics are reported explicitly.
