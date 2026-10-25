# Analysis

## 1. Simulation run

- Compared 1,544,844 foam-stack combinations for force buildup, compression,
  and loading work.
- Each stack used four distinct grades from a pool of 59 in the
  [analytical catalog](../data/analytical-foams2.csv), totaling 50 mm.
- The punch was fixed at 2.597 kg and 7.7 m/s, against 50 mm CutFoam EVA75.
- Dome geometry, hand-spring stiffness, and foam-curve assumptions stayed fixed.
- Equivalent material-thickness combinations were counted once, regardless of
  layer order.

Layers run from the outside toward the hand. HR means high-resilience polyurethane foam.

| Layer | Materials | Grades available | Thickness |
| --- | --- | --- | --- |
| Outer | PU, HR, or latex | 46 | 5, 10, 15, 20, or 25 mm |
| Main cushion | PU, HR, EVA, or latex | 59 | Remaining thickness, 15-39 mm |
| Support | Aortha EVA A25, A35, A50; CutFoam EVA75, EVA240; Minicel T380, T600 | 7 | 3, 4, or 5 mm |
| Comfort | Foam Factory Super Soft PU or FoamOnline Very Soft HR | 2 | 3, 4, or 5 mm |

## 2. Family characteristics

### Outer

- Outer-layer family also showed substantial differences. Compared with stacks
  using PU outside, stacks using HR outside averaged 19.4% lower peak force,
  30.0% lower 10%-90% loading rate, and 42.1% lower peak loading rate. Their
  glove work share was 8.20 percentage points higher, while mean sample weight
  was 0.17 g higher.
- Stacks using latex outside fell between HR and PU on the three force measures
  and had the highest mean sample weight of the outer-layer families.

### Main cushion

- Main-cushion family showed the largest differences in overall stack response.
- Compared with stacks using PU in the main cushion, stacks using HR averaged
  30.5% lower peak force, 44.2% lower 10%-90% loading rate, and 58.6% lower
  peak loading rate. Their glove work share was 14.24 percentage points higher,
  while mean sample weight was 0.32 g higher.
- Stacks using EVA in the main cushion averaged lower forces and loading rates
  than stacks using PU or latex. Their mean sample weight was 3.52 g, compared
  with 2.21 g for stacks using HR in the main cushion.

### Support

- A moderately stiff EVA support appears sufficient. Moving from the soft,
  lower-density grade to the middle grade reduced mean peak loading rate by
  9.3%, peak force by 2.7%, and compression by 0.63 mm, while increasing mean
  stack sample weight by 18.4%.
- Moving from the middle grade to the stiffest grade produced little additional
  benefit: mean peak force was nearly unchanged, peak loading rate fell another
  1.8%, and compression fell another 0.46 mm, while sample weight rose a further
  10.0%.
- The support layer therefore appears to act mainly as a stabilizer: it should
  be firm enough to limit abrupt loading and compression, without being made
  maximally stiff. Firmness and density rise together across these grades, so
  their effects cannot be separated here.

### Comfort

- Comfort-family differences were smaller. Compared with stacks using PU for
  comfort, stacks using HR averaged 3.5% lower peak force, 8.6% lower 10%-90%
  loading rate, and 7.0% lower peak loading rate. Mean compression differed by
  less than one percentage point and mean sample weight by 0.07 g.

## 3. Responsiveness

- HR has a relatively narrow distribution concentrated at low loading rates,
  with a gentler force rise across both measures.
- EVA also concentrates at low rates, but its peak loading rate has a longer
  upper tail than HR.
- PU spans the broadest range and extends furthest toward high loading rates.
  Its response varies substantially within the family.
- Latex sits between the lower-rate families and PU in the overall rise.
  Its peak loading rate shows a lower-rate shoulder and a stronger higher-rate
  peak, revealing distinct concentrations that are less apparent in the
  10%-90% measure.

![10%-90% loading rate by main-cushion family](../figures/figure2-loading_rate_10_90_n_s.png)

![Peak loading rate over 0.5 ms by main-cushion family](../figures/figure2-peak_loading_rate_n_s.png)

- The 10%-90% loading rate describes the average force buildup through the
  main rise. A brief, sharp increase can be smoothed out by that average.
- Peak loading rate over 0.5 ms captures the sharpest part of the impact.
  It better represents the abrupt feedback meant by "responsive" here,
  including responses with a gradual buildup followed by a sharp rise.
- This gives a Pillowy-to-Poppy scale based on peak loading rate, with the
  same boundaries for every main-cushion family:

| Responsiveness | Peak loading rate over 0.5 ms, kN/ms |
| --- | --- |
| Pillowy (soft) | < 0.70 |
| Neutral | 0.70 to < 1.00 |
| Poppy (responsive) | >= 1.00 |

## 4. Performance by sample weight

- Table 3 compares five outcomes within 0.5 g weight buckets. Each plot shows
  quintile bands and the best outcome within each bucket.
- Lower force, loading rates, and compression are preferred; higher glove work
  share is preferred. Q5 is the best quintile within each weight bucket.
- The best values occur between 1.5 and 3 g. The lightest stacks perform poorly,
  while moving beyond these ranges generally worsens the best available outcomes.

| Outcome | Best value | Sample weight bucket |
| --- | --- | --- |
| Peak force | 2.58 kN | 2 to < 2.5 g |
| 10%-90% loading rate | 0.187 kN/ms | 1.5 to < 2 g |
| Peak loading rate over 0.5 ms | 0.221 kN/ms | 1.5 to < 2 g |
| Maximum glove compression | 38.1% | 2.5 to < 3 g |
| Glove loading work share | 58.0% | 2 to < 2.5 g |

- Low weight alone does not identify a good stack. Peak force spans
  2.58-6.61 kN at 2 to < 2.5 g, compared with 3.37-3.83 kN at 10 to < 10.5 g.
  The heavier bucket has a narrower spread but cannot match the lighter
  bucket's best result.
- Compression adds information beyond the force measures. Its best value
  occurs at a slightly higher weight, and its frontier is less smooth.
  Minimum compression rises from 38.1% at 2.5 to < 3 g to 52.5% at 3.5 to < 4 g.
  More weight does not consistently preserve more compression travel.
- Quintiles describe performance relative to similar-weight stacks. A heavy
  stack can reach Q5 while performing worse than a lighter stack. Later
  comparisons should retain weight and actual outcomes alongside quintile ranks.
- These are separate metric winners under the fixed impact conditions. The
  plots do not establish that one stack achieves all five best values or how
  rankings change under a stronger punch.

![Peak force by sample weight](../figures/figure3-peak_force_n.png)

![10%-90% loading rate by sample weight](../figures/figure3-loading_rate_10_90_n_s.png)

![Peak loading rate over 0.5 ms by sample weight](../figures/figure3-peak_loading_rate_n_s.png)

![Maximum glove compression by sample weight](../figures/figure3-maximum_glove_compression_percent.png)

![Glove loading work share by sample weight](../figures/figure3-glove_total_work_share_percent.png)

## 5. Pillowy and poppy recipes

- All comparisons below use 2.50 +/- 0.05 g samples at 50 mm total thickness.
- Top scoring means the 90th percentile and above within each style in that
  weight range, retaining the five equally weighted scores and cutoff ties.
- The outer and main-cushion foams distinguish the two recipes. Either tested
  very soft comfort foam can serve both.
- Performance tables summarize the top-scoring group. Response plots use one
  highest-scoring recipe, breaking ties by ascending stack ID formed from the
  ordered foam IDs and thicknesses.

### Pillowy

- Build around an HR main cushion: CutFoam HR36-160 or FoamOnline HR
  Medium Soft/Medium, at 36-44 kg/m3. These are the clearest candidates at
  this weight; HR accounts for nearly all top-scoring main cushions.
- An HR outer is also favored. The combination preserves more compression
  travel while limiting force buildup at the same sample weight.
- Aortha EVA A35 and CutFoam EVA240 are the leading support choices, around
  4 mm. A thinner A50 also fits; the response recipe below uses 3 mm.

![Mean outcomes for top-scoring pillowy stacks](../figures/table4-pillowy-performance.png)

Response recipe, sample weight 2.474 g:

| Layer | Foam | Thickness |
| --- | --- | --- |
| Outer | CutFoam HR36-160 | 20 mm |
| Main cushion | FoamOnline HR Medium Firm | 24 mm |
| Support | Aortha EVA A50 | 3 mm |
| Comfort | FoamOnline HR Very Soft | 3 mm |

![Pillowy recipe: cumulative remaining layer thickness and force over time](../figures/table4-pillowy-response-compression-force.png)

![Pillowy recipe: glove work and striking speed over time](../figures/table4-pillowy-response-work-speed.png)

### Poppy

- Pair a conventional PU outer with a firm PU or light EVA main cushion.
  Minicel T300/T380 are the clearest EVA candidates at this weight;
  Foam Factory Super Max, CutFoam H42-500, and N29-400 are the PU alternatives.
- Outer grades are less distinctive than the main-cushion choice. The sharper
  response still comes with higher peak force and little remaining compression
  travel, leaving less margin for a stronger punch.
- Dense EVA supports remain common. Aortha A50 loses share among top-scoring
  stacks, but A35 and EVA240 gain share. This favors considering alternatives
  to the stiffest grade, rather than prescribing the lightest support.

![Mean outcomes for top-scoring poppy stacks](../figures/table4-poppy-performance.png)

Response recipe, sample weight 2.453 g:

| Layer | Foam | Thickness |
| --- | --- | --- |
| Outer | CutFoam H35-200 | 10 mm |
| Main cushion | CutFoam N29-400 | 31 mm |
| Support | Aortha EVA A50 | 5 mm |
| Comfort | Foam Factory Super Soft PU | 4 mm |

![Poppy recipe: cumulative remaining layer thickness and force over time](../figures/table4-poppy-response-compression-force.png)

![Poppy recipe: glove work and striking speed over time](../figures/table4-poppy-response-work-speed.png)
