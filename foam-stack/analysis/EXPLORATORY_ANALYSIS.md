# Exploratory analysis of glove foam response

## Executive findings

The model can eliminate some designs within the tested assumptions, but it does
not identify one composition that wins on every target. Target padding changes
both the nominal ranking and sensitivity to uncertain foam response.

- **25 mm EVA75:** 70 mm Qualux Firm gives the lowest nominal peak, **3.537 kN**.
- **50 mm EVA75 and bag:** 70 mm Soft HR gives the lowest nominal peaks,
  **2.572 kN** and **1.636 kN**, respectively.
- A concrete, stable improvement exists: at 70 mm, **75% Soft HR + 25% Qualux**
  gives at least **13.56% lower peak force** than **75% HD36-HQ + 25% Qualux**
  across all 27 matched conditions, with **7.83% less foam mass**.
- The bag suppresses differences between foam assumptions in this model. The
  thinner EVA75 mat exposes much greater sensitivity, including unresolved cases.
- The early-loading percentage, loading impulse and fist speed must be read with
  their mechanical meaning. Minimizing them would not define a better glove.

These are conditional design-screening results, not validated injury predictions.

## Study definition

The saved study contains **9,855 numbered cases**: 365 designs, nine foam-response
scenarios and three targets. Incident mass is **2.597 kg**, speed **7.7 m/s**, and
energy **76.988 J**, with no gravity along the impact direction. These are the
adult study's separate mean mass and speed, transferred to the modeled targets;
the resulting energy is not a measured population mean.

Thicknesses are 30, 40, 50, 60 and 70 mm. Each thickness contains seven single
materials, all 21 pairs at three thickness proportions (25/75, 50/50, 75/25), and
three preset stacks: 73 compositions per thickness. The Medium preset duplicates
the mechanical composition of one Soft HR/EV50 pair and is not independent evidence.

The nine sensitivity scenarios combine a common glove stress multiplier of
0.8, 1.0 or 1.2 with a high-compression tail exponent of 1.5, 2 or 3. Supplier
anchors, densities and the underlying family curves otherwise remain fixed.
These are local assumed perturbations, not measured tolerances or probability
bounds. Individual layers do not receive independent random parameters.

Targets are a fixed plate with 25 or 50 mm EVA75, and a 41 kg bag with 42 cm
diameter and assumed 40 kN/m local stiffness. EVA75 has nominal density 75 kg/m^3
and 55 kPa pressure at 25% compression, with an assumed EVA-family continuation.
Its curve stays fixed across glove sensitivity cases. Target thicknesses follow
[Perkins et al. (2018)](https://doi.org/10.4236/wjet.2018.63037); the corresponding
mat response and striker geometry are approximations, not a reconstruction of
that experiment. The supplier's density and compression ranges do not provide a
complete dynamic law. [Supplier specification](https://www.ubuild.co.nz/wp-content/uploads/2022/10/properties-of-low-density-pe-eva-foams-feb-2022.pdf)

Weight is density times specified thickness over a **30 x 30 mm square**. It is
foam sample mass, generally a few grams, not complete-glove weight. It does not
alter the prescribed impact mass or the circular mechanical contact footprint.

## Resolved results and frontier

| Target | Resolved | Unresolved | Calculation errors |
| --- | ---: | ---: | ---: |
| 25 mm EVA75 | 2,033 | 1,252 | 0 |
| 50 mm EVA75 | 3,197 | 88 | 0 |
| Bag | 3,285 | 0 | 0 |
| **Total** | **8,515** | **1,340** | **0** |

An unresolved case reaches a model-domain limit before completing first
compression. Its endpoint is not a peak, a measured bottom-out, or a low-force
success. The CSV retains reached force, speed, impulse and the limiting reason;
peak-dependent fields remain empty.

**134 designs** resolve every target/scenario combination. Among them, **56 lie
on the frontier** and **78 are dominated**. The remaining **231 designs** cannot
be classified because at least one case is unresolved. Exclusion does not prove
poor physical performance.

Design A dominates design B only if A uses no more thickness or sample mass and
has no higher peak force in **each of the 27 matched conditions**, with a strict
improvement in at least one criterion. This is stronger than comparing mean
peaks, but establishes dominance only within this finite model/grid. The frontier
contains 6 designs at 30 mm, 7 at 40 mm, 11 at 50 mm, 16 at 60 mm and 16 at 70 mm.

### Selected trade-offs

All rows below are fully resolved frontier designs. Forces use the nominal glove
response; percentages are thickness proportions, not mass fractions.

| Composition | Thickness (mm) | Sample mass (g) | 25 mm EVA75 peak (kN) | 50 mm EVA75 peak (kN) | Bag peak (kN) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Qualux Firm | 70 | 3.13 | 3.537 | 3.053 | 2.043 |
| Soft HR | 70 | 2.52 | 5.394 | 2.572 | 1.636 |
| 25% Soft HR + 75% Qualux | 70 | 2.98 | 3.586 | 2.995 | 1.952 |
| 75% Soft HR + 25% EV30 | 70 | 2.36 | 5.761 | 2.771 | 1.696 |
| Qualux Firm | 40 | 1.79 | 4.605 | 3.842 | 2.170 |
| EV30 | 50 | 1.35 | 18.079 | 5.314 | 2.019 |

More thickness can lower force at the cost of mass and bulk. It does not remove
the target-dependent trade-off: Soft HR at 70 mm beats Qualux at 70 mm on the
50 mm mat and bag, but has a 52.49% higher peak on the 25 mm mat. A light EV30
stack can remain on the frontier even with a high thin-mat peak because a heavier
alternative does not dominate its mass criterion.

## Sensitivity and metric interpretation

For the **same 134 fully resolved designs**, define each design's peak spread as
100 times its highest scenario peak divided by its lowest, minus 100. The median
spread is **109.25% on 25 mm EVA75**, **16.55% on 50 mm EVA75**, and **2.91% on the
bag**. Using the same designs avoids confounding this comparison with the much
larger excluded population on the thinner mat.

The assumed bag response therefore masks much of the modeled foam sensitivity.
This does not establish that real bags are insensitive to glove construction:
bag stiffness, effective moving mass, fill state and evolving contact geometry
have not been calibrated or swept here.

The nominal Medium 40 mm stack illustrates the tail uncertainty. It predicts
65.61 kN on the 25 mm mat, 7.25 kN on the 50 mm mat and 2.06 kN on the bag. Three
of its nine thin-mat scenarios remain unresolved. Such large predictions come
from extrapolated loading laws and steep compression tails; they are a reason
to measure the response, not precise estimates of hand loading.

### Early loading

The reported percentage samples the force at the earlier of 10 ms and the
resolved peak. This prevents a peak before 10 ms from appearing gentle merely
because force would later decrease. **511 resolved cases** peak before 10 ms and
report 100%. Actual sample time and the early-peak flag are saved separately from
the raw exact-10-ms force. Unresolved peaks have no percentage.

The percentage is not an objective to minimize. On the nominal 25 mm target,
Soft HR 70 mm reports **23.71%**, compared with **98.48%** for Qualux 70 mm, yet its
peak is **5.394 kN rather than 3.537 kN**. Normalizing by a larger later peak can
produce a smaller percentage without making the overall loading preferable.

### Impulse and fist speed

For every resolved fixed-plate case, loading impulse is **19.9969 N*s** and fist
speed at peak is zero. For every resolved default-bag case, these values are
**18.8057 N*s** and **0.4587 m/s**. Conservation and the matched masses/speed fix
these endpoint quantities; they do not distinguish foam compositions once
compression completes. They remain useful diagnostics, especially for incomplete
cases. They exclude unloading and rebound, so this is not total contact impulse.

## Verification and practical use

All 9,855 CSV rows passed independent checks of identifiers, case coverage,
incident inputs, target parameters, sample mass, missing-value rules and balances.
The maximum energy residual was **5.76e-11 J**. Numerical balance does not measure
material-model error.

Selected rankings were repeated with 48 x 40 contact sampling and 480 trace steps,
compared with 24 x 20 and 240: **126 solves and 322 checks**. Across the 63 matched
cases, maximum changes were **0.060% in peak force**, **0.076% in early percentage**,
**0.0033% in time**, and **0.035% in thickness left**. The selected winner ordering
and the 27-condition dominance example survived refinement. The complete frontier
and all near-ties were not revalidated.

A useful experimental shortlist is Qualux 70 mm, Soft HR 70 mm, a mixed Soft
HR/Qualux stack, and a thinner Qualux reference. Measuring these across both EVA75
coverings would test the predicted rank reversal. A matched bag test would then
show whether its apparent masking of foam differences is real. These are test
candidates, not final glove specifications. Dynamic loading/unloading curves,
cover confinement, anatomical hand compliance and repeatability remain the most
consequential missing evidence.

## Artifacts and reproduction

- [Numbered CSV](adult-parameter-study.csv): every input and all seven requested outcomes.
- [Complete plan](adult-parameter-study-plan.json): exact grid, geometry and numerical settings.
- [Summary](adult-parameter-study-summary.json): frontier and nominal design results.
- [Independent validation](adult-parameter-study-validation.json).
- [Machine-readable analysis](adult-parameter-study-analysis.json).
- [Refinement results](refinement-checks.json).

Run `npm run study:foam` from the repository root to reproduce the full grid.
Run `node foam-stack/analysis/run_refinement.cjs` for the selected refinement.
The in-app button repeats the grid with the current bag settings, downloads the
CSV and updates its analysis. The initial in-app analysis uses this saved study.
