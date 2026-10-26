# Analysis

## 1. Simulation run

- The design question was whether the same glove thickness and foam-weight budget
  could provide similar peak-force protection with either a soft or responsive
  force curve.
- A 50 mm foam stack provided a plausible reference depth for a well-padded
  training glove. Published and commercial examples placed strike-area depths
  between about 35 and 50 mm. Fixing thickness held the available compression
  travel constant for the first comparison.
- The impact was held at 2.597 kg and 7.7 m/s, about 77 J, against 50 mm CutFoam
  EVA75. This represented one forceful adult reference punch. Holding the punch,
  target, dome geometry, hand spring, and material assumptions constant isolated
  differences between foam constructions.
- The analysis covered 2,206,920 complete stacks. Each stack combined four
  distinct foam grades within 50 mm.
- Final recipes were compared within a 2.50 +/- 0.05 g standardized foam-sample
  range. This represented a hypothetical glove-weight class and tested whether
  the same material budget and similar peak-force protection could produce two
  different response curves.
- After recipe selection, impact energy was varied and every layer was scaled
  proportionally to test whether the comparison survived beyond the original
  impact and 50 mm starting point.
- Layer order did not affect the modeled result. The layer labels below described
  the tested construction, so a winning "outer" grade supported including that
  foam, not placing it on the outside.

HR means high-resilience polyurethane foam; PU below means conventional polyurethane.

| Layer | Materials | Thickness |
| --- | --- | --- |
| Outer | PU, HR, or latex | 5, 10, 15, 20, or 25 mm |
| Main cushion | PU, HR, EVA, or latex | Remaining thickness, 15-39 mm |
| Support | EVA | 3, 4, or 5 mm |
| Comfort | PU or HR | 3, 4, or 5 mm |

## 2. Family characteristics

For each layer, the material family was fixed and the results were averaged
across compatible choices in the other three layers. This showed how each
family tended to behave in that role across the design space.

- **Outer:** HR reduced mean peak force and compression while producing a firmer
  early response than PU. PU was the better choice when a softer start was the
  priority. Latex improved modestly on PU's cushioning results, but added weight
  and remained behind HR.
- **Main cushion:** HR provided the strongest starting point for the core. It
  produced the lowest mean peak force and compression while developing
  resistance earlier than conventional PU. EVA sat between HR and PU on those
  outcomes, but carried the greatest mean weight. Latex offered no clear
  advantage over HR or EVA in this role.
- **Support:** increasing EVA firmness produced diminishing cushioning gains.
  Moving from soft to medium EVA captured most of the reduction in mean peak
  force and compression. Firm EVA added further weight with little additional
  change and no meaningful increase in early resistance.
- **Comfort:** family choice was a smaller adjustment than it was in the main
  cushion or outer layer. HR produced slightly lower mean peak force and
  compression, and slightly greater early resistance, than PU at similar mean
  weight.

Values are mean (SD).

### Outer

{% table "../figures/analysis1-outer.csv" %}

### Main cushion

{% table "../figures/analysis1-main-cushion.csv" %}

### Support

{% table "../figures/analysis1-support.csv" %}

### Comfort

{% table "../figures/analysis1-comfort.csv" %}

## 3. Responsiveness

- Force 5 milliseconds after first contact described how quickly each stack
  developed resistance. A lower force meant a gentler start; a higher force
  meant a firmer early response.
- Each stack was assigned to one of three response bands:

<!-- analysis2:start -->

| Response | Force at 5 ms (kN) |
| :--- | :--- |
| Soft | Below 0.50 |
| Neutral | 0.50 to below 0.70 |
| Responsive | 0.70 or higher |

<!-- analysis2:end -->

![Force at 5 ms by main-cushion family, with soft/neutral/responsive boundaries](../figures/figure2-force_at_5ms_n.png)

- The main cushion was the primary determinant of glove protection and
  response. Holding its family fixed and integrating over the other layers
  showed where complete gloves using each family tended to fall.
- PU produced soft gloves in 98.9% of its stacks and latex in 93.0%. Neither
  produced a responsive glove.
- EVA and HR produced broader, higher-response distributions. EVA placed 20.9%
  of its stacks in neutral and 5.9% in responsive. HR placed 37.8% in neutral
  and 18.3% in responsive.
- HR was the stronger base for creating different glove feels. Compared with
  EVA, it had lower mean peak force (3.64 versus 4.10 kN) and lower mean sample
  weight (2.09 versus 3.47 g).
- PU was a poor fit for the main cushion. Its low early force came with the
  highest mean peak force and compression. The glove felt soft because it gave
  way, at the cost of protection.
- Latex had the same problem without PU's weight advantage. It produced mostly
  soft gloves, but its mean peak force remained high and its mean sample weight
  exceeded both HR and PU.

## 4. Performance by sample weight

- Each 0.5 g band compared stacks of similar weight. The colored regions show
  the five outcome quintiles. The blue line marks the lowest peak force or
  compression; on the response graph, it marks the softest early response.
- Peak-force performance was best around 1.5-3 g. The lightest stacks lacked
  enough resistance to control the punch. Above 3 g, denser foams increased
  sample weight within the same 50 mm thickness, but peak force began to rise.
  Striking mass and speed remained fixed, so incoming impact energy did not
  increase with glove weight. The heavier stacks simply added weight without
  adding protection in this simulation.

![Peak force by sample weight](../figures/figure3-peak_force_n.png)

- The compression frontier changed abruptly at 3.5 g. Its minimum rose from
  38.7% in the 3.0-3.5 g band to 52.5% in the 3.5-4.0 g band. The peak-force
  frontier stepped up at the same point, from 2.65 to 2.75 kN.
- This step reflected a change in the available constructions. Below 3.5 g,
  long, firm HR main cushions defined the low-compression edge. Reaching the
  next weight band at the same total thickness required denser EVA in the main
  cushion, and minimum compression rose sharply.
- Peak force measured the greatest load transmitted during the punch.
  Compression measured how close the foam came to using all of its available
  travel. A useful stack had to limit peak force without compressing nearly flat.

![Compression by sample weight](../figures/figure3-maximum_glove_compression_percent.png)

- Weight did not determine glove feel. Around 2.5 g, early force spanned soft
  through responsive. Material composition, especially the main cushion,
  determined where a stack fell within that range.

![Early response by sample weight](../figures/figure3-force_at_5ms_n.png)

## 5. Protection and early response

Before selecting recipes, peak force was compared with force at 5 ms across
all 2,206,920 stacks. This established how far initial feel could change while
peak-force protection remained near its best result.

![Peak force against force at 5 ms, colored by sample weight](../figures/figure5-peak-force-vs-force-at-5ms.png)

- The lowest achievable peak force formed a U-shaped frontier across early
  response. Its minimum, 2.58 kN, occurred at 0.648 kN after 5 ms, within the
  neutral response band. Low peak force remained possible from upper-soft
  through responsive behavior, leaving room to tune initial feel around the
  protective region.
- Very soft stacks gave up too much resistance early in the impact. Below
  0.2 kN at 5 ms, even the best stack reached 4.33 kN peak force. Peak-force
  performance improved steadily as early response approached the neutral band.
- Beyond the neutral band, the frontier turned upward. Above 0.85 kN at 5 ms,
  no stack remained below 3.29 kN peak force; above 0.9 kN, the minimum rose to
  3.52 kN. A highly responsive feel therefore carried its own peak-force cost.
- Around the 2.5 g target weight, stacks below the 3.026 kN protection limit
  covered both response profiles needed for recipe selection. Soft candidates
  were concentrated near the upper edge of their band, at 0.475-0.500 kN,
  while responsive candidates covered 0.700-0.783 kN. The next section selected
  one high-performing family from each region.

## 6. Soft and responsive recipes

This section proposed two foam recipes that offered a high degree of protection
with different response profiles: one soft and one responsive. Both used the
same 50 mm thickness and foam-weight budget. Their materials, layer thicknesses,
compression, and loading curves showed how each response was produced.

A standardized sample weight around 2.50 g represented one hypothetical
glove-weight class. This point sat near the middle of the 1.5-3 g range where
the strongest peak-force results occurred, and it contained stacks spanning
soft through responsive behavior. Fixing the sample weight allowed the two
recipes to be compared within the same material-weight budget.

Selection started with the 2,206,920 complete simulation results and retained
the 72,202 stacks around 2.50 g. Each outcome was converted to a 0-100
percentile score based on the share of these stacks it outperformed, with half
credit for equal values.

| Metric | Weight |
| --- | ---: |
| Peak force | 60% |
| Maximum compression | 20% |
| Force at 5 ms | 20% |

Lower values scored higher for all three metrics. Response profile was applied
as a constraint: force at 5 ms had to remain below 0.5 kN for the soft recipe
and reach at least 0.7 kN for the responsive recipe. Within each group, lower
force at 5 ms scored higher, so the responsive recipe gained nothing from
exceeding its response threshold by more than necessary.

Candidates also had to remain below 3.026 kN peak force. This ceiling matched
the original 50 mm soft recipe and set the same minimum protection standard for
both groups. The top-scoring 10% of each group, including ties, defined the
recipe families. The highest-scoring stack in each family became the recipe
used for the response-curve comparison.

### Soft: compliant PU with a soft HR core

#### Top-scoring soft recipe family

The high-scoring soft recipes separated initial feel from protection.

- Compliance was concentrated in 10 mm of conventional PU and a thin Super
  Soft PU comfort layer. Most of the thickness remained a 33-34 mm HR Soft core
  that developed resistance later in the impact.
- Changing the outer or support grade barely changed performance. The division
  between a small compliant portion and a much larger HR core mattered more
  than the exact grade used in those secondary positions.
- This approach achieved a soft initial response while holding peak force near
  3.0 kN. The stacks compressed by 84.3% on average and had little unused
  travel at the reference impact, making behavior under stronger punches an
  important later test.

<!-- analysis4-soft:start -->

| Metric | Mean |
| --- | ---: |
| Sample weight (g) | 2.47 |
| Peak force (kN) | 3.00 |
| Force at 5 ms (kN) | 0.484 |
| Compression (%) | 84.3 |

<!-- analysis4-soft:end -->

#### Selected soft recipe

The highest-scoring stack was used for the response curves. Its sample weight
was 2.452 g.

| Layer | Foam | Thickness |
| --- | --- | --- |
| Outer | Foam Factory Lux-HQ | 10 mm |
| Main cushion | FoamOnline HR Soft | 34 mm |
| Support | CutFoam EVA240 | 3 mm |
| Comfort | Foam Factory Super Soft | 3 mm |

![Soft recipe: cumulative remaining layer thickness and force](../figures/table4-pillowy-response-compression-force.png)

- The response curve confirmed this division of work. At 5 ms, the compliant
  outer and comfort layers had used most of their travel while the HR core
  retained most of its thickness. Over the full punch, the core absorbed most
  of the glove's compression work. The thin PU layers created the soft feel;
  the HR core remained the protective structure.

![Soft recipe: glove work and striking speed](../figures/table4-pillowy-response-work-speed.png)

### Responsive: firmer HR cushioning throughout

#### Top-scoring responsive recipe family

The high-scoring responsive recipes developed resistance earlier while
improving both peak-force and compression performance.

- At essentially the same sample weight as the soft family, mean force at 5 ms
  rose from 0.484 to 0.738 kN. Mean peak force fell from 3.00 to 2.87 kN, and
  mean compression fell from 84.3% to 67.3%. The change in feel came with
  better protection and substantially more remaining thickness.
- Every leading stack used HR for both the outer and main cushion, together
  accounting for about 43 mm of the 50 mm stack. The long cushion converged on
  moderate HR grades with nearly identical modeled firmness, around 229-233
  kPa at 25% compression.
- The responsive family retained 32.7% of its starting thickness at maximum
  load, more than twice the 15.7% retained by the soft family. Earlier
  resistance prevented the glove from using most of its travel before peak
  force developed.

<!-- analysis4-responsive:start -->

| Metric | Mean |
| --- | ---: |
| Sample weight (g) | 2.51 |
| Peak force (kN) | 2.87 |
| Force at 5 ms (kN) | 0.738 |
| Compression (%) | 67.3 |

<!-- analysis4-responsive:end -->

#### Selected responsive recipe

The highest-scoring stack was used for the response curves. Its sample weight
was 2.482 g.

| Layer | Foam | Thickness |
| --- | --- | --- |
| Outer | FoamOnline High Resilience - Medium Soft | 25 mm |
| Main cushion | CutFoam HR36-160 | 19 mm |
| Support | Aortha EVA A50 | 3 mm |
| Comfort | FoamOnline HR Very Soft | 3 mm |

![Responsive recipe: cumulative remaining layer thickness and force](../figures/table4-poppy-response-compression-force.png)

- The two large HR layers compressed together. At 5 ms, each retained about
  81% of its starting thickness while force had already reached 0.744 kN.
  Together they absorbed 49.5% of the incoming energy over the full punch. The
  recipe developed resistance early and retained 32.7% of its starting
  thickness at peak force.

![Responsive recipe: glove work and striking speed](../figures/table4-poppy-response-work-speed.png)

### Design takeaway

- The simulation produced soft and responsive 50 mm recipes within the same
  sample-weight class around 2.5 g and below the same peak-force limit. Mean
  force at 5 ms differed clearly, 0.484 versus 0.738 kN, showing that response
  profile changed while weight remained fixed.
- Layer architecture created the difference. The soft family concentrated
  compliance in 13 mm of PU and relied on a thick HR core for later resistance.
  The responsive family used HR through about 43 mm of the stack so resistance
  developed earlier across most of the available thickness.
- The responsive family provided the stronger protection and compression
  result, with a 2.87 kN mean peak force and 67.3% compression. The soft family
  prioritized a gentler initial response, reaching 3.00 kN and 84.3%
  compression. The softer start required substantially more compression travel
  at the reference impact.
- Changing the score weights altered some grades and thicknesses while
  preserving the same two architectures: compliant PU around an HR core for
  soft response, and predominantly HR cushioning for responsive behavior.

## 7. Recipe sensitivity to thickness and punch energy

The two recipes were tested beyond the 50 mm, 77 J condition used for
selection. Every layer was scaled proportionally from 25 to 60 mm, and punch
energy was varied from 60 to 120 J. This showed whether each construction kept
the same protection and response as the impact moved away from its selection
point.

### Protection depended on the operating range

The Soft construction shaped the start of the impact by using compression
travel to delay force buildup. That worked only while travel remained. At
higher energy it effectively bottomed out: the load arrived later, but the
stack could no longer prevent a sharp peak. Here, bottoming out means entering
the steep high-compression region rather than reaching a rigid stop.

![Peak force, compression and early response as punch energy rises](../figures/figure6-energy-response.png)

- At 50 mm and 60 J, Soft had both the gentler response and slightly lower peak
  force: 0.406 versus 0.624 kN at 5 ms, and 2.29 versus 2.42 kN peak force.
  Responsive retained much more thickness, with 56.2% compression against
  77.5%, but that reserve had not yet improved peak protection.
- The protection crossover moved with both energy and thickness. At 60 J,
  Responsive had lower peak force only at 25-30 mm. At 70 J, that extended
  through 45 mm; at 80 J, through 55 mm; and from 90 J onward, Responsive was
  better at every tested thickness. Extra thickness delayed the Soft design's
  disadvantage, but stronger impacts progressively erased it.
- Responsive could trade firmness for substantially less thickness and weight.
  At 120 J, the 35 mm Responsive stack reached 6.16 kN peak force and 88.3%
  compression. The 50 mm Soft stack reached 6.54 kN and 91.4%, despite weighing
  2.45 g against 1.78 g. The thinner Responsive stack improved protection with
  27% less sample weight, but its force at 5 ms was 1.28 kN against 0.726 kN.
- Added thickness did not create the same reserve in both architectures. From
  25 to 60 mm at 120 J, Soft compression changed only from 93.2% to 90.2%, while
  Responsive improved from 90.7% to 77.9%. Proportional scaling added more of
  the compliant Soft construction without correcting its lack of late-impact
  resistance.
- The Soft construction was effectively bottoming out. At 50 mm, its last 10 J
  added about 2.6 times as much peak force as its first 10 J. Its compliant
  layers delayed the force, but once their travel was nearly exhausted,
  additional energy drove a much sharper peak.

### Each recipe had a response operating range

Early-force shaping mattered only while the stack could manage the rest of the
impact. Once the Soft construction approached bottoming out, its force at 5 ms
also rose out of the soft band. The map shows the impact range over which each
recipe retained its intended response.

![Force at 5 ms across the complete thickness and energy grid](../figures/figure6-force_at_5ms_n.png)

- Soft remained relatively softer at every matched thickness and energy, but
  did not remain in the soft response band. At 50 mm, it was soft at 60-70 J,
  neutral at 80-110 J, and responsive at 120 J. No tested thickness kept it soft
  at 100-120 J.
- Responsive was also condition-dependent. At 50 mm it was neutral at 60 J and
  crossed into the responsive band at 70 J. "Soft" and "Responsive" therefore
  described the recipes relative to each other near the selection condition;
  they were not permanent material classifications.

### The design has to match the use case

- Soft was the better fit for the lower-energy condition when a gentle initial
  response mattered. Responsive was firmer and carried reserve that was not yet
  needed, with a small peak-force penalty at thicker configurations.
- Soft did not scale to the high-energy condition by adding proportional
  thickness. Its compliant layers consumed too much travel, and its peak force
  rose rapidly once the stack reached high compression. Responsive converted
  its firmer early response into useful reserve and better high-energy
  protection.
- Recipe selection therefore needs a specified impact range, thickness limit,
  weight budget, and intended response. The next selection should score
  performance across that operating range rather than optimize one impact and
  treat the result as a universal ranking.
- The high-energy comparison depends on the assumed high-compression response
  of the foams. At 50 mm and 120 J, both cores exceeded their reference-fit
  range. Those curves need to be measured before treating the modeled separation
  as a verified impact limit.
