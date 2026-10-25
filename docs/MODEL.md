# Mathematical model

> **Document purpose:** Build the model in small, reviewable steps. Settle the
> physical meaning of each part before adding its equations.

## 1. Model setup and scope

> **Section question:** What are we modeling, why is it useful, and where does it
> stop?

### Mechanical setup

- A punch presses the glove foam into a fixed plate covered with foam.
- The punch travels horizontally, so the model ignores gravity.
- Two values describe the incoming punch: its speed and its striking mass. The
  research literature calls this striking mass the effective mass.
- The punch receives no extra push after first contact.

```mermaid
flowchart LR
    M["Moving mass<br/>striking mass and speed"] --> S["Hand spring<br/>hand and wrist give"]
    S --> D(["Rigid dome<br/>contact shape"])
    D --> G["Glove foam<br/>one or more layers"]
    G --> T["Target foam"]
    T --> P["Fixed plate"]
```

### Why use a rigid dome

- The dome stands in for the rounded front of the fist inside the glove.
- It touches the centre first. More foam comes into contact as the dome presses
  farther in.
- Rigid means the dome keeps its shape. It does not squash, tilt, or rotate.
- This gives every stack the same growing contact area while allowing the centre
  and edges to compress by different amounts.
- It leaves out individual knuckles, uneven fist shapes, local hand deformation,
  and off-centre contact.
- The hand spring adds overall hand and wrist give. It does not reproduce those
  local effects.

### Basis for the setup

- The foam-covered plate follows the broad setup used by [Perkins et al.
  (2018)](https://doi.org/10.4236/wjet.2018.63037). The dome shape comes from the
  [SATRA summary of EN 13277](https://www.satra.com/spotlight/article.php?id=423).
- Punch mass and speed come from [Walilko et al.
  (2005)](https://pubmed.ncbi.nlm.nih.gov/16183766/) and [Adamec et al.
  (2021)](https://pubmed.ncbi.nlm.nih.gov/33057792/). The hand spring is a model
  assumption.

### Required inputs

- Striking mass and speed
- Dome size and shape
- Thickness and compression curve for each glove foam layer
- Thickness and compression curve for the target foam
- Hand-spring stiffness

### Required outputs

- Force through the loading phase
- Movement and work in the glove, target, and hand spring
- Summary measures derived from those histories

### Current scope

- Compare foam stacks under the same punch, geometry, and target.
- Follow one loading phase, from first contact to maximum compression.
- Compare mechanical response, not injury or subjective feel.

## 2. How the parts behave

> **Section question:** What role does each part play during the impact?

### Striker

- The moving mass represents the part of the boxer that contributes to the
  punch.
- After first contact, contact force is the only force slowing it.

### Hand and wrist

- A massless spring sits between the moving mass and the rigid dome.
- It carries the total contact force and represents overall hand and wrist give.

### Foam stack

- Each layer has a starting thickness and a pressure-versus-compression curve.
- At one location, all layers carry the same pressure but can compress by
  different amounts.
- Their shortenings add.
- A typical curve has an initial response, a main region of compression travel,
  and a steep rise as easy travel runs out.

### Target

- The plate does not move.
- Its foam cover compresses in series with the glove layers and contributes to
  the force response.

## 3. How the foam curves are built

> **Section question:** How do sparse supplier values become complete curves the
> model can use?

- Supplier data usually give only one or two compression values.
- The model needs pressure at every compression level reached during the impact.
- The curve construction follows this rule:

> We convert the available supplier data to a common pressure-versus-strain
> scale, then use published family curves to estimate the missing response. This
> lets the model compare foam grades consistently, although the resulting curves
> remain estimates until the materials are tested under the same conditions.

- The family shapes come from [Alzoubi et
  al.](https://oiccpress.com/jsm/article/download/12454/14012/38722) for PU and
  latex and [Wu et al.](https://doi.org/10.3390/polym15234514) for EVA.
- PU and latex indentation loads are converted to average pressure. EVA data
  already report compression pressure, so the source tests remain different.
- One chosen loading curve represents the brief impact. The curve does not
  change with compression rate during the calculation.

## 4. Calculation in plain English

> **Section question:** How does the model turn the inputs into a force history?

1. Set the punch, dome, foam, target, and hand-spring inputs.
2. Move the dome a small distance toward the plate.
3. Use the dome shape to find which locations are in contact and how far the
   foam must shorten at each one.
4. Use the compression curves to find the local pressure.
5. Add local pressure across the contact area to obtain total force.
6. Use total force to find hand-spring compression and total striker movement.
7. Calculate compression work, remaining speed, and elapsed time.
8. Continue until the striker reaches zero speed.

## 5. Equations and interpretation

> **Section question:** How does each physical relationship become part of the
> calculation?

### The incoming punch

- Let $m$ be striking mass in kg and $v_0$ be speed at first contact in m/s.
- Together they set the starting kinetic energy $E_0$, in J:

$$
E_0=\frac{1}{2}mv_0^2
$$

- **Interpretation:** More mass brings proportionally more energy. Speed has a
  larger effect because it is squared. Doubling speed gives four times the
  starting energy.
- This energy sets how much compression work the system must take on before the
  striker stops.

### Foam response

- For any foam, compression strain $\varepsilon$ is the fraction of its starting
  thickness that has been compressed.
- Its loading curve $\sigma$ gives pressure $p$, in Pa, at that strain:

$$
p=\sigma(\varepsilon)
$$

- **Interpretation:** Each curve tells us how much pressure is needed to reach a
  given compression. A steep part of the curve means a small additional
  compression requires a large pressure increase.
- Every glove layer and the target foam has its own version of this curve.
- The calculation also runs the relationship backward: for a given pressure,
  find how much each foam compresses.

### Dome contact

- The dome is circularly symmetric. Distance $r$, in m, is measured from its
  centre. Its spherical curvature radius is $R$, in m, and its face ends at
  footprint radius $a$, in m, with $0<a<R$.
- Let $q$ be how far the dome advances into the glove and target foam at the
  centre, in m.
- At radius $r$, the dome surface starts a distance $b(r)$, in m, behind the
  dome tip. The spherical shape gives:

$$
b(r)=R-\sqrt{R^2-r^2},\qquad 0\leq r\leq a
$$

- The gap is zero at the centre and largest at the edge of the face.
- The geometry therefore requires a local stack shortening $c(r)$, in m:

![Cross-section of the rigid dome pressing into glove and target foam, showing central movement and local stack shortening.](../diagrams/dome-contact.svg)

The bracket shows the contact footprint in cross-section. In the full model,
that footprint is the circular area $A(q)$ around the centreline.

$$
c(r)=\max\left[0,q-b(r)\right]
$$

- **Interpretation:** A location carries no load while $b(r)$ is greater than
  $q$. Once $q$ exceeds that gap, the dome contacts the foam there and begins
  to compress the local stack.
- Increasing $q$ therefore compresses the centre farther and brings more of the
  dome footprint into contact.
- Contact is restricted to $0\leq r\leq a$ where $q>b(r)$. The circular
  contact region is $A(q)$; its area cannot exceed $\pi a^2$.
- Once $q$ reaches $b(a)$, the whole face is in contact. Further advance
  increases compression without increasing the footprint.

### How the layers share local compression

- Index $i$ covers every glove foam layer and the target foam. Each layer has
  a starting thickness $h_i$, in m.
- At radius $r$, every layer carries the same local pressure $p(r)$.
- The shortening of each layer is $h_i\varepsilon_i\!\left[p(r)\right]$.
- Their shortenings must add to the required local stack shortening:

$$
c(r)=\sum_i h_i\varepsilon_i\!\left[p(r)\right]
$$

- **Interpretation:** The pressure at that location determines how the required
  shortening is divided. Softer layers use more of it; firmer layers use less.
- For a fixed central movement $q$, the model solves this equation for $p(r)$
  at every radius. This produces the pressure distribution across the contact
  area.
- Moving a layer from the hand side to the striking side does not change the
  modeled result when the materials and thicknesses stay the same.
- A soft-inside, firm-outside stack is therefore treated as identical to the
  same layers in the reverse order. The model cannot tell which arrangement
  performs better.

### From local pressure to total force

- The dome-contact diagram above shows how the contact area $A(q)$ grows with
  central movement $q$.
- At each value of $q$, the preceding calculation gives the local pressure
  $p(r)$ across that area.
- Total force $F$, in N, is the integral of local pressure over the contact
  area:

$$
F(q)=\int_{A(q)}p(r)\,\mathrm{d}A
=2\pi\int_0^a p(r)r\,\mathrm{d}r
$$

- Here, $\mathrm{d}A$ is an element of contact area, and
  $p(r)\,\mathrm{d}A$ is its contribution to total force.
- The radial form adds circular rings of area $2\pi r\,\mathrm{d}r$ in the
  plane of the target. Pressure is zero wherever the dome has not made contact.
- **Interpretation:** Force can rise because pressure increases, because the
  contact area grows, or both. The dome geometry and foam curves jointly
  determine the result.

### Hand and wrist give

- Hand-spring stiffness $k_h$, in N/m, is a model input.
- The spring is linear and carries the total contact force $F$. Its compression
  $q^{\mathrm{HAND}}$, in m, follows the spring law:

$$
q^{\mathrm{HAND}}=\frac{F}{k_h}
$$

- **Interpretation:** Spring compression $q^{\mathrm{HAND}}$ is calculated from
  the current force. At the same force, a stiffer hand spring moves less.
- Stored spring energy $U_h$, in J, is the work required to compress the spring
  from zero to its current compression $q^{\mathrm{HAND}}$.
  Because the spring is elastic, that work is stored as spring energy.
- Work is the area under the force-versus-movement line. The force rises
  linearly from zero to $F$, so this area is a triangle:

$$
U_h=\frac{1}{2}Fq^{\mathrm{HAND}}
$$

- **Interpretation:** The contact force determines spring compression
  $q^{\mathrm{HAND}}$, which determines stored spring energy $U_h$. As the foam
  becomes harder to compress, more stopping movement and energy can shift into
  the hand spring.
- The spring adds travel. It does not impose a force limit.

### Where the movement occurs

- Dome movement $q$ includes the shortening of the glove and target foam.
- The hand spring behind the dome compresses by an additional distance
  $q^{\mathrm{HAND}}$.
- Striking-mass movement $q^{\mathrm{MASS}}$, in m, includes both:

$$
q^{\mathrm{MASS}}=q+q^{\mathrm{HAND}}
$$

### Work, speed, and time

- Compressing the foam takes work, just as compressing the hand spring does.
  Work is the area under the force-versus-shortening curve.
- For each foam layer, the model adds this work across the contact area, where
  pressure and shortening vary.
- The calculation first follows dome movement $q$. Accumulated work $W(q)$,
  in J, is the work done by the time the dome reaches that position.
- Glove compression work $U_{\mathrm{glove}}$ and target compression work
  $U_{\mathrm{target}}$, both in J, combine with stored spring energy $U_h$ to
  give total compression work at that position:

$$
W(q)=U_{\mathrm{glove}}(q)+U_{\mathrm{target}}(q)+U_h(q)
$$

- This work comes from the punch's starting kinetic energy $E_0$. The energy
  left for motion is $E_0-W(q)$.
- The incoming punch used the kinetic-energy relation $E=\frac12 mv^2$.
  Solving the same relation for speed, using the remaining energy, gives
  striking-mass speed $v(q)$, in m/s:

$$
v(q)=\sqrt{\frac{2\left[E_0-W(q)\right]}{m}}
$$

- **Interpretation:** As compression work builds, the striking mass slows.
  It stops when compression work equals the starting energy.
- Elapsed time $t$, in s, follows from distance divided by speed. For a small
  advance of the striking mass $\mathrm{d}q^{\mathrm{MASS}}$, the time taken is:

$$
\mathrm{d}t=\frac{\mathrm{d}q^{\mathrm{MASS}}}{v(q)}
$$

- **Interpretation:** The same distance takes longer as the striking mass
  slows. Adding these time increments gives elapsed time through compression.
- This assigns a time to each dome position. The same results can then be
  expressed as work over time $W(t)$ and speed over time $v(t)$.
- With the same geometry, foam curves, target, and hand spring, equal starting
  energy gives the same maximum compression and peak force.
- Timing can still differ: a heavier, slower punch takes longer to reach
  maximum compression than a lighter, faster punch with the same energy.

### Where the calculation starts and stops

- The calculation starts at first contact, with elapsed time $t=0$ and the
  striking mass moving at incoming speed $v_0$.
- The foam and hand spring start uncompressed. Dome movement $q$ and
  accumulated work $W(q)$ are both zero.
- As the dome advances toward the plate, movement is positive, compression
  work builds, and the striking mass slows.
- The calculation stops when accumulated work $W(q)$ equals starting energy
  $E_0$. Speed $v(q)$ is then zero, and compression is at its maximum.
- The chosen foam curves give increasing force as compression grows, so this
  stopping point also gives peak force.
- This completes the loading phase. Unloading and rebound are outside the
  model's scope.
- If the numerical material range ends before the striker stops, the
  calculation is incomplete. Report the force, speed, and time reached;
  maximum compression and peak force remain unresolved. Section 7 distinguishes
  this numerical boundary from the assumed foam compression limit.

## 6. Building and anchoring the foam curves

> **Section question:** How do published curve shapes and supplier values become
> the pressure-versus-strain curves used above?

### Slow tests and fast impacts

- Foam can resist more when compressed quickly: there is less time for its
  structure to relax or for trapped air to escape.
- We use two versions of each curve. The slow version connects the reference
  tests to supplier firmness values. The fast version represents impact loading.
- First, fit the slow curve to the supplier anchors. Then carry that pressure
  adjustment into the fast version of the reference equation.
- The supplier points constrain the slow curve. The increase under fast loading
  comes from the borrowed model and needs separate review, especially for PU/latex.
- The impact calculation uses one fixed fast curve throughout loading. It does
  not change the curve as the striker slows down.

#### What the source papers mean by loading rate

- Strain rate measures the fraction of starting thickness compressed per second,
  in $\mathrm{s}^{-1}$. It differs from the incoming fist speed in m/s.
- [Alzoubi et al., Section 4 and table 3](https://www.researchgate.net/publication/266854162_Modeling_of_Compression_Curves_of_Elexible_Polyurethane_Foam_with_Variable_Density_Chemical_Formulations_and_Strain_Rates)
  describe quasi-static tests at about $0.0333\,\mathrm{s}^{-1}$, at 25 °C,
  through 70% compression. These tests supply our PU/latex coefficients.
  At that constant rate, reaching 50% compression takes about 15 s.
- [Wu et al.](https://pubmed.ncbi.nlm.nih.gov/38231925/) tested EVA at
  $0.0017$, $0.033$, and $0.17\,\mathrm{s}^{-1}$, with constant compression
  speed in each test. They associate increasing resistance with a declining
  ratio of air leakage to compression rate. Even the fastest test takes about
  3 s to reach 50% compression.
- Our fast curve is a limiting case of the borrowed equations. The source
  tests above do not measure the selected retail foams at punch-like rates.

### Start with a family curve

- A family curve supplies the response between the few points a supplier gives.
  Its coefficients come from a published reference specimen.
- We keep those coefficients fixed for each reference fit. Manufacturer data
  supply the anchors used to adjust the curve's pressure scale afterward.
- Write reference pressure as $s(\varepsilon)$, in Pa, to distinguish it from
  the calibrated grade curve $\sigma(\varepsilon)$.
- Pressure coefficients are already converted to Pa.

#### PU and latex

- The curve combines resistance that can relax during slow compression,
  a linear contribution, and a steep rise at large strain.
- The reference values below follow
  [Alzoubi et al., equation 23 and table 3](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/).
  PU55, HR40, and Latex85 identify specimens with densities of 55, 40, and
  85 kg/m³. The last row is the reference test rate.

| Parameter or variable | Meaning and units | PU55 | HR40 | Latex85 |
| --- | --- | --- | --- | --- |
| $\eta$ | Resistance to relaxation, $\mathrm{Pa}\times\mathrm{s}$ | 48,000 | 130,000 | 9,000 |
| $k^{\mathrm{RELAX}}$ | Stiffness of the relaxing contribution, Pa | 33,000 | 1,200,000 | 100,000 |
| $k^{\mathrm{BASE}}$ | Linear stiffness, Pa | 1,600 | 1,800 | 6,800 |
| $k^{\mathrm{RISE}}$ | Scale of the steep rise, Pa | 2,450 | 14,000 | 14,000 |
| $n$ | Shape of the steep rise, dimensionless | 4 | 2 | 4 |
| $\dot{\varepsilon}$ | Compression strain per second, $\mathrm{s}^{-1}$ | 0.0333 | 0.0333 | 0.0333 |

$$
\begin{aligned}
s(\varepsilon)
&=\eta\dot{\varepsilon}
  \left[1-\exp\left(-\frac{k^{\mathrm{RELAX}}\varepsilon}
  {\eta\dot{\varepsilon}}\right)\right]\\
&\quad+k^{\mathrm{BASE}}\varepsilon
  +k^{\mathrm{RISE}}\varepsilon\left(e^\varepsilon-1\right)^n
\end{aligned}
$$

- **Interpretation:** Faster compression leaves less time for the first
  contribution to relax. The other two terms set resistance that depends
  only on how far the foam has compressed.
- For the proposed fast curve, allow no time for relaxation. The first term
  becomes $k^{\mathrm{RELAX}}\varepsilon$; the other terms stay unchanged.

#### EVA

- This curve combines a response that levels off with increasing resistance
  from air compressed inside the foam.
- The reference values follow
  [Wu et al., equation 16 and table 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/),
  using their 35 kg/m³ EVA specimen at 0.0017 $\mathrm{s}^{-1}$.

| Parameter or variable | Meaning and units | EVA35 reference value |
| --- | --- | --- |
| $p^{\mathrm{PLATEAU}}$ | Pressure scale of the flatter region, Pa | 12,900 |
| $\alpha$ | Shape of the initial rise, dimensionless | 20 |
| $p^{\mathrm{AIR}}$ | Initial air pressure, Pa | 101,325 |
| $\lambda$ | Air-leakage rate divided by compression rate, dimensionless | 0.19308 |

$$
s(\varepsilon)=p^{\mathrm{PLATEAU}}\tanh(\alpha\varepsilon)
  +p^{\mathrm{AIR}}(1-\lambda)\frac{\varepsilon}{1-\varepsilon}
$$

- **Interpretation:** The first term approaches the plateau pressure. The air
  contribution grows as strain increases; a smaller leakage ratio makes it larger.
- For the proposed fast curve, assume no air escapes during compression:
  set $\lambda=0$. The first term stays unchanged.

### Why we use the fast curve

- Rapid loading is appropriate to represent a punch. We use the fast limit of
  the published equations as a working approximation; the amount by which each
  selected foam becomes firmer remains uncertain.
- A brief loading phase leaves less time for relaxation. For PU/latex, compare
  its duration with the reference model's characteristic relaxation time
  $\tau$, in s:

$$
\tau=\frac{\eta}{k^{\mathrm{RELAX}}}
$$

- [Alzoubi et al., Section 5.2 and table 3](https://www.researchgate.net/publication/266854162_Modeling_of_Compression_Curves_of_Elexible_Polyurethane_Foam_with_Variable_Density_Chemical_Formulations_and_Strain_Rates)
  report this ratio as a characteristic time. Using the coefficients above:

| Reference foam | Characteristic relaxation time |
| --- | --- |
| PU55 | About 1,455 ms |
| HR40 | About 108 ms |
| Latex85 | 90 ms |

- When loading is much shorter than this time, the relaxing contribution stays
  close to its fast limit, $k^{\mathrm{RELAX}}\varepsilon$. Within these
  equations, the foam has little time to relax during a similarly brief punch.
- We use the study foam's relaxation time for the chosen grade. Supplier
  anchors do not establish whether that time or the fast stiffness also
  describes the purchased material.
- For EVA, the fast choice sets leakage to zero. The borrowed fit does not
  supply an air-leakage timescale for a comparable duration check, so that
  assumption has less support from this timing argument.
- We use the fast curve because the punch calls for a rapid-loading response.
  How much resistance increases depends on the borrowed equations and our
  pressure adjustment. Slow supplier measurements cannot confirm that increase.

### What comes from the manufacturer

| Supplier input | Use in this model |
| --- | --- |
| IFD/ILD force or compression pressure at a stated compression percentage | Sets the first pressure anchor |
| Up to two additional values at stated compression percentages | Set further anchors when available |
| Foam density | Used for the compression limit in Section 7; it does not set firmness by itself |
| Available sheet thicknesses | Guide layer-thickness choices; thickness sets how much a layer shortens at a given strain |

- The anchors set the pressure scale below. They do not separately
  identify the reference curve's stiffness, relaxation, or air-leakage coefficients.
- Choosing a reference fit and a rapid-loading approximation remains a model
  choice. Supplier firmness values alone do not determine either.

### Put the supplier anchors on the same scale

- To fit a foam's curve, we need points that say how much pressure produces
  how much compression. These are our anchors.
- Supplier values come in different forms. Here we turn them into pressure
  at a stated strain, ready for the scaling step below.

#### When the supplier gives a force

- PU and latex firmness is often given as IFD or ILD: the force needed to
  press a test tool into the foam by a stated percentage of its thickness.
- For example, [HD36-HQ](https://canada.foambymail.com/hd36-hq-foam-sheet.html)
  lists 35 lbf at 25% compression. That is about 155.7 N of force.
- To get average pressure, divide that force by the test tool's contact area.
  The [PFA guide, page 2](https://pfa.org/wp-content/uploads/2022/05/InTouchv4.2new.pdf)
  describes a 50 in² tool, equivalent to 0.032258 m².

$$
\text{Average pressure}
=\frac{155.7\,\mathrm{N}}{0.032258\,\mathrm{m}^{2}}
\approx4.83\,\mathrm{kPa}
$$

- Our anchor is therefore 4.83 kPa at 25% strain: one point on the foam's curve.
- We assume the 50 in² test area for our PU/latex inputs unless the supplier
  specifies another area. This is the supplier's test tool, not our dome.

#### When the supplier gives a pressure

- EVA data already give pressure at a stated compression.

#### What this lets us compare

- Each supplier value now has the same form: pressure at a stated strain.
  We use these points to adjust the published family curve to the chosen grade.
- The conversion puts the units on the same scale. Test differences remain,
  including sample thickness and support from surrounding foam. Treating these
  points as equivalent inputs to the model is an approximation.

### Fit the curve to the supplier points

- Treat the supplier measurements as data for estimating one smooth curve.
  Use all available points to estimate an overall pressure scale and a skew
  that changes how strongly pressure grows with compression.
- Keep the study coefficients and compression axis fixed. The adjustment
  preserves the study curve's general form while allowing a gradual change
  in its pressure multiplier. It introduces no joins or kinks.
- The fitted curve may miss individual measurements. Those differences show
  how well this two-parameter adjustment describes the supplier data.

#### Define the curve and the observations

- Let $s^{\mathrm{SLOW}}(\varepsilon)$ be the slow study pressure at strain
  $\varepsilon$, and $\sigma^{\mathrm{SLOW}}(\varepsilon)$ the fitted
  pressure for our foam, both in Pa. Strain is dimensionless.
- Use the study's slow settings: $\dot{\varepsilon}=0.0333\,\mathrm{s}^{-1}$
  for PU/latex, or $\lambda=0.19308$ for EVA.
- Let $a>0$ be the pressure scale and $b$ the skew, both dimensionless.
  Before the tail treatment in Section 7, use:

$$
\sigma^{\mathrm{SLOW}}(\varepsilon)
=a\,e^{b\varepsilon}\,s^{\mathrm{SLOW}}(\varepsilon)
$$

- With $b=0$, the multiplier is constant. Positive $b$ increases the multiplier
  with compression; negative $b$ decreases it.
- Let $n$ be the number of supplier observations. Observation $i$ gives pressure
  $p_i>0$ in Pa at dimensionless strain $\varepsilon_i>0$.
  The study pressure must also be positive at every fitted strain.
- A supplier's support factor gives the deeper pressure divided by the pressure
  at 25% compression. Use it to calculate the deeper observation before fitting.
  This derived observation is not an independent measurement of pressure.
- If a supplier gives a range or minimum, record it that way. Choosing a single
  pressure from it remains a model choice.
- Zero pressure at zero compression is preserved by the study curve. Exclude
  that origin from the fit because its pressure ratio and logarithm are undefined.

#### Estimate scale and skew from all points

- At each supplier strain, divide the supplier pressure by the study pressure.
  This ratio is the pressure multiplier requested by that observation.
- Define its dimensionless natural logarithm as $y_i$, and let $\alpha=\ln a$:

$$
y_i=\ln\!\left[\frac{p_i}{s^{\mathrm{SLOW}}(\varepsilon_i)}\right],
\qquad
y_i\approx\alpha+b\varepsilon_i
$$

- Estimate $\alpha$ and $b$ by ordinary least squares (OLS) using all $n$
  observations, then recover the pressure scale as $a=e^{\alpha}$.
  Each observation has equal weight; fitting in log space measures proportional
  pressure differences.
- With only one distinct observed strain, scale and skew cannot be estimated
  separately. Set $b=0$ and estimate scale alone. For a single observation,
  the scale is its supplier-to-study pressure ratio.
- More observations use the same two parameters. Two distinct observations can
  be matched exactly if physical constraints permit; additional observations
  generally leave residual differences.

#### Constrain and assess the fit

- Require pressure to remain nondecreasing over the full strain range where
  this fitted curve is used before the tail begins. Since $a\,e^{b\varepsilon}$
  is positive, this requires:

$$
\frac{d s^{\mathrm{SLOW}}(\varepsilon)}{d\varepsilon}
+b\,s^{\mathrm{SLOW}}(\varepsilon)\geq0
$$

- If the OLS estimates violate this condition, refit by least squares in log
  space subject to it. Apply the same check to the adjusted fast curve below,
  and require a strictly positive slope for both curves at the tail join in
  Section 7. Check the interval between observations and the extrapolated
  region as well as the observed strains.
- Report the supplier pressure, fitted pressure, and percentage difference at
  each observation. Matching observations used in the fit is not independent
  validation of the curve.
- Beyond the measured range, the fitted scale and skew remain an extrapolation
  assumption until the tail treatment begins. The observations do not establish
  that the adjusted shape remains accurate there.

#### Example: fitting and checking VA35

- [Wu et al., sections 2.1-2.2](https://www.mdpi.com/2073-4360/15/23/4514)
  tested commercial Jiexin EVA foam with an average density of 35 kg/m³.
- We use their test that compressed a 30 mm sample at 3 mm per minute:
  five minutes to reach half its thickness. This gives the slow-loading baseline,
  at about 0.0017 $\mathrm{s}^{-1}$.
- [Evazote VA35](https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A039-Evazote-VA35.pdf)
  has the same nominal density. Its supplier reports 52 kPa at 25% compression
  and 118 kPa at 50%.
- First fit scale alone using the 25% value, with skew set to zero. Keep the
  50% value aside to check the prediction. The study curve gives about
  40.15 kPa and 94.66 kPa at these strains:

$$
\sigma^{\mathrm{SLOW}}(0.50)
\approx52\times\frac{94.66}{40.15}\,\mathrm{kPa}
\approx122.6\,\mathrm{kPa}
$$

![The EVA35 study curve anchored to VA35 at 25% compression, shown over 0-100% and clipped at 1,500 kPa. Shading beyond 80% marks extrapolation. At 50%, the prediction is 122.6 kPa; the supplier value of 118 kPa was kept out of the fit.](../diagrams/foam-curve-anchors.svg)

- The prediction is about 4% above the unused supplier value. This is a useful
  check of pressure growth from 25% to 50% compression for this grade.
- Matching density does not establish identical foams. The supplier sheet also
  leaves the test speed unspecified, so we have not matched loading rates.
- This check covers the interval between these two points. It does not
  establish the full curve or impact behaviour.
- For the final fit, use both supplier values to estimate scale and skew,
  subject to the slope constraints. The second value asks for a smaller
  multiplier, giving negative skew in the unconstrained fit.
- Once both points are used to fit the curve, neither provides an independent
  check. That requires another measurement.

### Carry the anchors into the impact curve

- Estimate scale $a$ and skew $b$ from the slow supplier observations.
- For the punch, multiply the fast study pressure $s^{\mathrm{FAST}}(\varepsilon)$
  by the same strain-dependent factor. The adjusted fast pressure
  $\sigma^{\mathrm{FAST}}(\varepsilon)$ and study pressure are both in Pa.
  Before the tail begins:

$$
\sigma^{\mathrm{SLOW}}(\varepsilon)
=a\,e^{b\varepsilon}\,s^{\mathrm{SLOW}}(\varepsilon),
\qquad
\sigma^{\mathrm{FAST}}(\varepsilon)
=a\,e^{b\varepsilon}\,s^{\mathrm{FAST}}(\varepsilon)
$$

- Keep $a$ and $b$ the same for both curves. This preserves the study's ratio
  of fast to slow pressure at each positive strain before the tail begins.
- The fast curve will usually sit above the supplier points because it assumes
  greater resistance during quick compression. The supplier points still
  describe the slow response.
- The size of that increase comes from the study equations. Whether it describes
  our chosen foam during a punch remains an assumption, as does applying the
  same scale and skew to both loading conditions.

### How much confidence this gives us

- The method turns a few supplier measurements into a complete loading curve.
  For VA35, one supplier point predicts another within about 4%. That supports
  the curve between those points for that grade.
- The increase during fast loading remains an assumption. It can change which
  stack performs better in the calculation. We do not yet know how closely
  those predictions match real gloves.
- Section 7 defines how the curves continue at high compression and explains
  the assumptions needed there.

## 7. How we handle the high-compression tail

> **Section question:** How do we continue the curve beyond the measured range,
> and where does the calculation stop?

- As the spaces inside the foam close, it becomes harder to compress further.
  This steep rise in resistance is called densification.
- A punch may compress a layer farther than the measurements cover. We need
  to choose how the curve continues beyond those measurements.

### Where the measurements end

- Supplier points usually stop at 50% compression for EVA or 65% for PU/latex.
- The studies reach about
  [70% for PU/latex](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/)
  and [80% for EVA](https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/).
- Beyond the supplier points, we follow the study curve with our pressure
  adjustment. We assume its shape also describes the foam we have chosen.

### What we assume

- Beyond the study's range, we add a steep section called the tail.
- We use density to estimate how far the foam can compress before its internal
  space closes. This assumes the foam cannot spread sideways and its solid
  material does not lose volume.
- The tail joins smoothly onto the adjusted study curve and rises toward that
  estimated compression limit.
- We have no measurements for this part of the curve. Density helps set the
  limit, but does not tell us how steep the rise should be.

### Set the compression limit

- We estimate how much thickness would remain after all internal space closes.
  This depends on foam density and the density of its solid material.
- Let $\rho^{\mathrm{FOAM}}$ and $\rho^{\mathrm{SOLID}}$ be those densities,
  both in $\mathrm{kg/m^3}$. The estimated limiting strain
  $\varepsilon^{\mathrm{CAP}}$ is the fraction of starting thickness compressed:

$$
\varepsilon^{\mathrm{CAP}}
=1-\frac{\rho^{\mathrm{FOAM}}}{\rho^{\mathrm{SOLID}}}
$$

| Family | Solid-material density used | Basis |
| --- | --- | --- |
| PU | $1{,}200\,\mathrm{kg/m^3}$ | Value used by Alzoubi et al., Section 5.3 |
| Latex | $920\,\mathrm{kg/m^3}$ | Assumed value |
| EVA | $950\,\mathrm{kg/m^3}$ | Borrowed from other EVA formulations; assumed for these grades |

- For EVA75 at $75\,\mathrm{kg/m^3}$, the limit is about 92.1% compression.
  This follows from our assumptions about volume. It is not a measured failure
  point or the strain where densification begins.

### Choose where the tail starts

- Keep the adjusted study curve up to its measured range: strain
  $\varepsilon^{\mathrm{FIT}}=0.70$ for PU/latex and 0.80 for EVA.
- If the estimated limit is too close, start the tail sooner. Leave at least
  0.04 strain, or four percentage points of compression, before the limit.
- Call the starting strain $\varepsilon^{\mathrm{JOIN}}$ and the strain left
  before the limit $L$. These strain quantities are dimensionless:

$$
\varepsilon^{\mathrm{JOIN}}
=\min\left[\varepsilon^{\mathrm{FIT}},\varepsilon^{\mathrm{CAP}}-0.04\right],
\qquad L=\varepsilon^{\mathrm{CAP}}-\varepsilon^{\mathrm{JOIN}}
$$

- The four-percentage-point margin is a calculation choice. It has no measured
  physical meaning. Supplier anchors must be at or below the tail's start.

### Make resistance rise smoothly

- At the join, continue from the same pressure and slope so the curve has no
  sudden jump. Then make it rise more steeply toward the compression limit.
- Let $p^{\mathrm{JOIN}}$ be pressure at the join, in Pa, and
  $k^{\mathrm{JOIN}}$ the slope there, in Pa per unit strain.
  Calculate both after applying scale and skew. Write $s(\varepsilon)$ for the
  slow or fast study pressure being extended, in Pa:

$$
p^{\mathrm{JOIN}}
=a\,e^{b\varepsilon^{\mathrm{JOIN}}}\,s(\varepsilon^{\mathrm{JOIN}}),
\qquad
k^{\mathrm{JOIN}}
=a\,e^{b\varepsilon^{\mathrm{JOIN}}}
\left[
\frac{ds(\varepsilon)}{d\varepsilon}+b\,s(\varepsilon)
\right]_{\varepsilon=\varepsilon^{\mathrm{JOIN}}}
$$

- Require $k^{\mathrm{JOIN}}>0$ for both curves. A zero joining slope would
  make the tail below flat. Skew affects both the joining pressure and slope,
  so the supplier fit also influences resistance in the unmeasured tail.
- The dimensionless exponent $n^{\mathrm{TAIL}}$ controls how steeply the
  tail rises. We use 2. For strain above the join and below the limit:

$$
\sigma(\varepsilon)=p^{\mathrm{JOIN}}
+\frac{k^{\mathrm{JOIN}}L}{n^{\mathrm{TAIL}}}
\left[
\left(\frac{L}{\varepsilon^{\mathrm{CAP}}-\varepsilon}\right)^{n^{\mathrm{TAIL}}}-1
\right]
$$

- At the join, the added pressure is zero and the slope matches the curve
  before it. As compression approaches the limit, pressure grows without bound.
- A larger exponent makes the tail steeper while keeping the same starting
  pressure, starting slope, and compression limit.
- Apply the supplier adjustment first, then attach this tail. The slow and
  fast curves have their own starting pressures and slopes, but use the same
  density, join rule, and tail exponent.

### Stop if the calculation runs out of curve values

- The pressure lookup ends at $1\,\mathrm{GPa}$ local pressure, or an earlier
  endpoint of any component's material table. This keeps the calculation finite.
- The cutoff is a numerical setting. Predictions below it can still depend
  strongly on the unmeasured tail.
- If the striker is still moving at that point, report the force, speed, and
  time reached as an incomplete result. Peak force and maximum compression
  remain unresolved.

### What the choice can change

- If a layer reaches this part of the curve, our chosen tail can change peak
  force, how quickly force rises, and how much thickness remains.
- Would a gentler or steeper tail change which stack we prefer? We have not
  checked that yet.

## 8. Parameters for the worked example

> **Section question:** What stays fixed while we compare glove stacks?

- Four groups define the impact: the punch, the striker's shape, hand and wrist
  give, and the padded target.

### The punch

- We use a forceful punch by an adult without substantial punching training as
  our reference.
- [Adamec et al.](https://epub.ub.uni-muenchen.de/76042/1/76042.pdf)
  studied 50 adults, selecting each person's highest-impulse attempt from three.
- We use their dominant-fist group means: a striking mass of 2.597 kg and
  an incoming speed of 7.7 m/s.
- Striking mass describes how much mass contributes to the impact, including
  the arm's contribution. Speed describes how fast the fist arrives.
- Together, these values give a reference energy of about 77 J, calculated
  from the separate group means for mass and speed.

### The dome striker

- We follow the striker dimensions in
  [SATRA's description of the hand-protector test](https://www.satra.com/spotlight/article.php?id=423):
  an 80 mm wide domed face with a 100 mm curvature radius.

### Hand and wrist give

- **Why include it:** allow give between the effective striking mass and the
  rigid dome. Without the spring, that connection is perfectly rigid and all
  stopping movement must come from the glove and target.
- **Working assumption:** 1 kN/mm gives 1 mm of movement per kN of force.
  This represents combined give behind the fist; its stiffness has no measurement
  support yet.
- **Why it matters:** in the app's adult-punch example with the 40 mm Medium
  stack and a 25 mm EVA75 target, the spring moves about 7 mm and stores 24 J
  of the incoming 77 J at peak force. That is roughly 32% of the stopping work.
  This example uses the thinner target, not this section's 50 mm worked example.
- Those 7 mm describe modeled movement between the mass and dome. They do not
  establish 7 mm of local hand compression. The spring carries the same total
  force as the glove and does not measure force "felt" by the puncher.
- **Justification and limit:** retain the spring provisionally to represent
  possible compliance behind the fist. The 7 mm result demonstrates its
  influence, not its accuracy. Test whether stack comparisons survive changes
  in stiffness; measurements are needed to justify the chosen value and a
  plausible range.

### The padded target

- We follow the padded-force-plate idea in
  [Perkins et al.](https://www.scirp.org/pdf/wjet_2018072715333666.pdf), who compared
  glove impacts onto 25 and 50 mm of EVA75. Here we use the 50 mm condition:
  a fixed plate with foam that shares the compression work with the glove.
- Pressure at 25% compression anchors the target curve using the method in
  Section 6.
- The [Ultralon EVA75 sheet](https://www.ubuild.co.nz/wp-content/uploads/2022/10/properties-of-low-density-pe-eva-foams-feb-2022.pdf)
  gives a pressure range of 42-68 kPa at 25% compression. Both ends describe
  the same compression level, so this supplies one anchor with a pressure range.
- We choose 55 kPa, the midpoint, for that anchor. Likewise, we choose 75 kg/m³
  from the density range of 68-82 kg/m³. Both values are chosen midpoints
  of supplier ranges.
- This profile approximates an EVA75 target. Its relevance to the study's mat
  or a human body requires separate validation.

### Proposed values

- Lengths are shown in mm for readability and converted to m in the equations.

| Parameter | Parameter or variable | Proposed value | Basis |
| --- | --- | --- | --- |
| Striking mass | $m$ | 2.597 kg | Dominant-fist mean in [Adamec et al., table 2](https://epub.ub.uni-muenchen.de/76042/1/76042.pdf) |
| Incoming speed | $v_0$ | 7.7 m/s | Separate mean from the same study |
| Dome curvature radius | $R$ | 100 mm | Geometry described by [SATRA](https://www.satra.com/spotlight/article.php?id=423) |
| Maximum footprint radius | $a$ | 40 mm | Half of SATRA's 80 mm striker-face diameter |
| Hand-spring stiffness | $k_h$ | 1 kN/mm | Illustrative stiffness; 1 kN produces 1 mm of give |
| Target foam | $\sigma^{\mathrm{TARGET}}(\varepsilon)$ | EVA75 profile | One-anchor EVA-family curve |
| Target thickness | $h^{\mathrm{TARGET}}$ | 50 mm | One padding condition in [Perkins et al.](https://www.scirp.org/pdf/wjet_2018072715333666.pdf) |
| Target density | $\rho^{\mathrm{TARGET}}$ | 75 kg/m³ | Midpoint of 68-82 kg/m³ in the [Ultralon sheet](https://www.ubuild.co.nz/wp-content/uploads/2022/10/properties-of-low-density-pe-eva-foams-feb-2022.pdf) |
| Target pressure at 25% compression | $p_{25}^{\mathrm{TARGET}}$ | 55 kPa | Midpoint of 42-68 kPa in the same sheet |

- The target foam follows the same compression equations as the glove layers.
- Glove foam grades, layer thicknesses, and total thickness remain undecided.
- Keep each foam's reference curve, the fast-loading assumptions, and the
  high-compression extension rule unchanged across stack comparisons.
- Review those assumptions separately.

### Connect the dome dimensions to contact

- Dome curvature radius $R$ sets how rounded the face is. Footprint radius
  $a$ limits how far contact can spread.

![Side view of the dome: the face follows a circle with a 100 mm radius and spans 80 mm, with a 40 mm footprint radius. First contact occurs at the tip.](../diagrams/dome-dimensions.svg)

- A larger curvature radius would make the face flatter.
- The tip touches first. As the dome advances, contact spreads outward to
  the edge of the face.
- With these dimensions, $b(a)\approx8.35\,\mathrm{mm}$. At that central
  advance the whole face is in contact; the footprint then stays fixed.
- The worked example defines its own impact conditions using inputs from
  several sources.

## 9. What the model reports

> **Section question:** What does each measure tell us, and how is it defined?

- Compare stacks under the same punch, dome geometry, target, and hand spring.
- The assumed high-compression tails, fast-loading response, and hand stiffness
  can affect both the reported values and which stack performs better.
- Keep the force-over-time and force-against-glove-compression curves alongside
  the summary metrics. Similar summary values can hide different responses.
- All measures cover loading from first contact to stopping time
  $t^{\mathrm{END}}$, in s, when the striking mass first reaches zero speed.
- These endpoint measures require a completed loading phase. An incomplete
  calculation reports the reached state separately; its peak, peak-normalized
  loading rates, and final work shares remain unresolved.
- These measures describe force buildup and compression. They do not establish
  perceived "poppy" or "pillow" feel; rebound is outside this loading-only model.

### Metrics used for ranking

- **Keep:** Peak force and maximum glove compression, with lower values preferred.
- **Add:** Force at 5 ms, with lower values preferred for soft gloves and higher
  values preferred for responsive gloves.
- **Drop from ranking:** Both loading rates and glove loading work share. Continue
  reporting them alongside the other outputs.

### Compare the impact

- Peak force describes the largest load. The two loading rates describe its
  overall buildup and its sharpest short rise. Read all three together.

#### Peak force

- Peak force $F_{\max}$, in N, is the highest total contact force during loading:

$$
F_{\max}=\max_{0\leq t\leq t^{\mathrm{END}}}\left[F(t)\right]
$$

- **Interpretation:** Peak force does not describe how quickly the load develops.
- **Literature context:** [SATRA's EN 13277-7 summary](https://www.satra.com/spotlight/article.php?id=423)
  uses peak-force limits for specified hand-protector tests. Those limits
  do not apply to our padded-plate example or establish an injury threshold.

#### Force at 5 ms

- **Intent:** Compare the resistance developed early in the impact, using the
  same elapsed time from first contact for every stack.
- The sampling time is $t_5=0.005\,\mathrm{s}$. Early force $F_5$, in N, is the
  total contact force at that time:

$$
F_5=F(t_5)
$$

- **Interpretation:** At the same punch conditions, a lower value indicates a
  softer early response; a higher value indicates a firmer early response.
  Read it with peak force and maximum compression.
- The 5 ms sampling time is a comparison choice. Interpolate between adjacent
  force-time samples when needed.
- Report this measure as unavailable if loading stops or the calculation ends
  before 5 ms. Do not substitute peak force or extend the loading curve.

#### 10%-to-90% loading rate

- **Intent:** Compare how abruptly force builds through the main rise,
  excluding the first and last 10% of the force increase.
- Times $t_{10}$ and $t_{90}$, in s, are the first times satisfying:

$$
F(t_{10})=0.1F_{\max},
\qquad
F(t_{90})=0.9F_{\max}
$$

- Loading rate, in N/s, is the force increase divided by the elapsed time:

$$
\text{loading rate}_{10-90}=\frac{0.8F_{\max}}{t_{90}-t_{10}}
$$

- **Interpretation:** At the same peak force, a higher rate means a faster
  buildup. Read it alongside peak force, since a higher peak can also raise
  the rate.

#### Peak loading rate over 0.5 ms

- Find the largest force increase over any 0.5 ms interval during loading.
  This captures abrupt rises that the 10%-to-90% average can smooth over.
- Divide that increase by the interval duration
  $\Delta t=0.0005\,\mathrm{s}$ to obtain the largest rate, in N/s:

$$
\text{peak loading rate}_{0.5\,\mathrm{ms}}
=\max_{0\leq t\leq t^{\mathrm{END}}-\Delta t}
\left[\frac{F(t+\Delta t)-F(t)}{\Delta t}\right]
$$

- **Interpretation:** A higher value means a sharper rise somewhere in the
  impact, even when peak force or the overall loading rate is similar.
  The fixed window makes the same comparison across stacks.
- Only complete windows before the stopping time are included. If loading
  lasts less than 0.5 ms, report this measure as unavailable.
- **Literature context:** [Perkins et al., pp. 613-617](https://www.scirp.org/pdf/wjet_2018072715333666.pdf)
  used 0.5 ms windows advanced every 0.1 ms through contact. Their peak loading
  rate distinguished gloves with similar peak forces. We use the same window
  duration on our modeled loading phase; their measurements also included
  oscillations absent from this model.

### Explain the response

- Compression and work shares explain how the glove, target, and hand spring
  produce the force response. Higher or lower values alone do not indicate
  better cushioning.

#### Maximum glove compression at the centre

- **Intent:** Show how much glove thickness is used beneath the dome tip,
  where compression is greatest.
- Central shortening of layer $i$, written $q_i(t)$ in m, comes from its
  starting thickness and strain at central pressure $p(0;t)$:

$$
q_i(t)=h_i\varepsilon_i\!\left[p(0;t)\right]
$$

- Central glove shortening $q^{\mathrm{GLOVE}}(t)$ adds only the glove layers.
  Its largest value is $q^{\mathrm{GLOVE}}_{\max}$:

$$
q^{\mathrm{GLOVE}}(t)=\sum_{i\in\mathrm{glove}}q_i(t),
\qquad
q^{\mathrm{GLOVE}}_{\max}
=\max_{0\leq t\leq t^{\mathrm{END}}}\left[q^{\mathrm{GLOVE}}(t)\right]
$$

- Report in mm and as a percentage of starting glove thickness.

- **Interpretation:** A higher percentage means more central compression.
  Read it with the force curve to see the load required to use that travel.
- **Literature context:** [Chadli et al.](https://www.sciencedirect.com/science/article/abs/pii/S0263224118306316)
  found that similar glove compression could accompany different damping,
  supporting the need to read compression alongside force.

#### Layer compression and remaining thickness at the centre

- **Intent:** Identify which layers compress most and which have
  reached the steep part of their compression curves.
- Report central shortening $q_i(t)$ and central remaining thickness
  $h_i-q_i(t)$ through loading. In this model, layer compression increases
  until the striker stops, so remaining thickness is smallest then:

$$
\text{minimum central thickness of layer }i
=h_i-q_i\!\left(t^{\mathrm{END}}\right)
$$

- **Interpretation:** Interpret remaining thickness using the layer's starting
  thickness and compression curve.
- **Literature context:** [Wu et al., figure 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/)
  links declining energy-absorption efficiency to densification in its EVA35
  specimens. This supports checking each layer against its own compression curve.

#### Compression work by component

- Compression work is the energy transferred into a component as it compresses.
- Work shares show how that energy is divided between the glove layers,
  target foam, and hand spring.
- Foam work includes the whole contact area. At each location, integrate the
  layer's pressure-versus-strain curve up to its current strain, then multiply
  by starting thickness and integrate over the contact area.
- For foam layer $i$, loading pressure is $\sigma_i(\xi)$ in Pa, where $\xi$
  is the dimensionless strain variable inside the integral. Local pressure
  $p(r;t)$ determines the current strain $\varepsilon_i\!\left[p(r;t)\right]$.
  Layer work $U_i(t)$, in J, is:

$$
U_i(t)=h_i\int_{A\left[q(t)\right]}
\left[\int_0^{\varepsilon_i[p(r;t)]}\sigma_i(\xi)\,\mathrm{d}\xi\right]
\mathrm{d}A
$$

- **Interpretation:** The inner integral gives work per starting volume of
  foam. Thickness and area turn it into total layer work, including the
  different amounts of compression beneath the dome.
- Add the glove layers' work for the glove total. The target uses the same
  equation; hand-spring work is the stored energy $U_h$ defined earlier.
- For component $j$, accumulated work $U_j(t)$ is measured in J. Components
  are the individual glove layers, target foam, and hand spring.
- Report work at the stopping time and its percentage of starting energy:

$$
\text{component work}_j=U_j\!\left(t^{\mathrm{END}}\right),
\qquad
\text{work share}_j
=100\,\frac{U_j\!\left(t^{\mathrm{END}}\right)}{E_0}
$$

- In this model, the target is fixed, no extra push acts after contact, and
  all starting kinetic energy becomes compression work when the striker stops.
  The work shares therefore sum to 100%.
- A larger glove share means more work went into compressing the glove and
  less into the target and hand spring.
- This split depends on the chosen target and hand stiffness as well as the glove.
- Loading work includes energy that could return during rebound. It does not
  measure permanent energy absorption.
- **Literature context:** [Perkins et al.](https://www.scirp.org/pdf/wjet_2018072715333666.pdf)
  found that changing target padding thickness changed peak forces and
  glove comparisons. That motivates separating glove and target work here.

## 10. What the model can and cannot tell us

> **Section question:** What comparisons does this model support, and where do
> its assumptions limit the answer?

### What it can compare

- Compare foam grades and layer thicknesses under the same prescribed impact.
- Describe force buildup, compression, and how stopping work is shared between
  the glove, target, and hand spring.
- Explain how those results follow from the chosen foam curves and mechanical
  setup. Their accuracy for real gloves remains unestablished.

### What it leaves out

- Reversing layer order does not change the model's results.
- Each foam uses a fixed fast-loading curve. Its response does not adjust to
  the changing compression rate as the striker slows.
- The dome stays rigid and moves in one direction against a fixed padded plate.
  Foam columns compress independently; sideways deformation and foam and cover
  mass are omitted.
- Hand and wrist give is represented by a massless, linear, elastic spring.
  Its stiffness is assumed, and its work is stored elastically.
- The calculation ends at maximum compression. It gives no rebound, damage,
  or repeated-impact response, and does not establish perceived glove feel.

### Evidence status

- Predictions have not been checked against impact measurements of the selected
  retail foams or complete gloves. This remains a theoretical comparison under
  the stated assumptions.

## 11. Assumptions that could change a stack comparison

> **Section question:** Which uncertain choices could change our conclusion?

- **Increase in resistance during fast loading:** A foam that is soft in its
  supplier test may become much firmer in the borrowed fast curve. Different
  assumed increases can change which stack produces the lower force.
- **Resistance at high compression:** Two curves can match the same supplier
  points but rise differently beyond them. If a layer reaches that region,
  the chosen tail can determine its peak force and remaining thickness.
- **Give in the hand and target:** Softer or firmer responses outside the glove
  change how much stopping movement and work the glove must take on. The
  comparison therefore depends on the assumed hand stiffness and target curve.
- Keeping these choices fixed makes comparisons consistent. If reasonable
  alternative choices reverse a preference between stacks, that preference
  remains unresolved. Agreement would show stability only across the choices
  considered; it would not establish accuracy for real gloves.

## 12. Adapting the model to published test setups

> **Section question:** What can each test tell us, and what changes in the
> punch and target are needed to model it?

- Test our chosen foam stack under the published apparatus conditions.
- The published gloves' unknown foam properties prevent reproducing their
  measured results directly.
- Superscripts identify setup-specific values, such as $m^{\mathrm{SATRA}}$.
  The changes below are proposed adaptations; missing details remain open.

### Represent a drop as a horizontal impact

- Start at first contact, with the same moving mass, speed, geometry, and target.
  Use measured contact speed where available.
- Otherwise, calculate speed $v_0^{\mathrm{DROP}}$, in m/s, from drop height
  $H^{\mathrm{DROP}}$, in m, or contact energy $E_0^{\mathrm{DROP}}$, in J.
  Moving mass $m^{\mathrm{DROP}}$ is in kg; $g=9.81\,\mathrm{m/s^2}$:

$$
v_0^{\mathrm{DROP}}
=\sqrt{2gH^{\mathrm{DROP}}}
=\sqrt{\frac{2E_0^{\mathrm{DROP}}}{m^{\mathrm{DROP}}}}
$$

- The height relation assumes release from rest with negligible losses.
  Match mass as well as energy because mass affects timing.
- Remove the hand spring: $q^{\mathrm{HAND}}=0$, $U_h=0$, and
  $q^{\mathrm{MASS}}=q$. This is a rigid connection, not zero spring stiffness.
- **Simplest approximation:** use the existing horizontal equations, neglecting
  gravity during compression.
- **To retain gravity:** add a constant forward force $m^{\mathrm{DROP}}g$.
  Gravity then supplies work $m^{\mathrm{DROP}}gq$, and speed becomes:

$$
v^{\mathrm{DROP}}(q)
=\sqrt{\frac{2\left[E_0^{\mathrm{DROP}}
+m^{\mathrm{DROP}}gq-W(q)\right]}{m^{\mathrm{DROP}}}}
$$

- Stop when $W(q)=E_0^{\mathrm{DROP}}+m^{\mathrm{DROP}}gq$. With this correction,
  calculate work shares against that total supplied energy at stopping.
- State which treatment is used. Gravity adds about 0.49 J over 20 mm for a
  2.5 kg striker, so the difference can matter in a 3 J test.

### SATRA: a force-limit check

#### What we want to learn

- **Does the stack keep transmitted peak force at or below 2 kN?**
- [SATRA's summary](https://www.satra.com/spotlight/article.php?id=423) specifies
  3 J impacts for Class A and B hand protectors. Class B also receives 10 J
  impacts on its increased-protection zone, with the same limit.
- Report a separate peak and below/above-limit result for each energy, once the
  anvil-force measurement below is represented. Until then, leave the verdict
  unresolved. These calculations cannot establish whole-glove compliance.

#### Punch

- Change mass and speed. The dome dimensions already match our baseline.
  Use the rigid connection and drop treatment above.

| Punch input | Parameter or variable | SATRA value |
| --- | --- | --- |
| Moving mass | $m^{\mathrm{SATRA}}$ | 2.5 kg |
| Contact energy | $E_0^{\mathrm{SATRA}}$ | 3 or 10 J |
| Calculated incoming speed | $v_0^{\mathrm{SATRA}}$ | 1.55 or 2.83 m/s, respectively |
| Dome curvature radius | $R^{\mathrm{SATRA}}$ | 100 mm |
| Maximum footprint radius | $a^{\mathrm{SATRA}}$ | 40 mm |

#### Target

- Replace the padded plate with a bare rigid half-cylinder of radius
  $R^{\mathrm{SATRA,TARGET}}=45\,\mathrm{mm}$. Remove target foam from the layer
  sum. All compression work is now glove work:

$$
W^{\mathrm{SATRA}}(q)=U_{\mathrm{glove}}^{\mathrm{SATRA}}(q)
$$

- The cylinder curves in one direction, so replace circular rings with a
  two-dimensional contact footprint. Positions $x,y$ are measured in m.
- Define the initial gap $b^{\mathrm{SATRA}}(x,y)$, in m, from the dome and
  glove shape. Local shortening $c^{\mathrm{SATRA}}(x,y)$, in m, becomes:

$$
c^{\mathrm{SATRA}}(x,y)
=\max\left[0,q-b^{\mathrm{SATRA}}(x,y)\right]
$$

- Use the existing layer-compression rule with local starting thicknesses.
  Integrate pressure $p^{\mathrm{SATRA}}(x,y)$, in Pa, over projected contact
  area $A^{\mathrm{SATRA}}(q)$, in $\mathrm{m^2}$, to obtain force in N:

$$
F^{\mathrm{SATRA}}(q)
=\int_{A^{\mathrm{SATRA}}(q)}p^{\mathrm{SATRA}}(x,y)\,\mathrm{d}A
$$

- **Still needed:** define how the foam sits around the support, which sets its
  gap and local thickness. Review the
  [curved-support approximation](../legacy/METHODOLOGY.md#curved-contact-geometry-bag-and-satra-reference)
  as a starting point.
- **Measurement:** the test senses force through a central anvil; the equation
  above gives total contact force. Establish the anvil footprint and how load
  is shared with its surrounding support before applying the 2 kN limit.
  Conditioning and the full impact sequence also remain outside this model.

### Perkins: compare response across impacts and targets

#### What we want to learn

- **Does one stack reduce peak force or slow its buildup, and does that
  advantage persist when impact speed or target padding changes?**
- [Perkins et al.](https://www.scirp.org/pdf/wjet_2018072715333666.pdf) found that
  thicker target padding reduced peak force and peak loading rate, and changed
  the relative performance of the gloves.
- For each speed, report peak force and peak loading rate over 0.5 ms on both
  targets. Use Section 9's loading-phase measures and keep the force histories.
- Compare stacks under matched conditions. There is no pass/fail threshold;
  the result is how their differences change across speeds and targets.

#### Punch

- The study used a 3.046 kg mechanical fist. With its 0.278 kg glove, total
  moving mass is $m^{\mathrm{PERKINS}}=3.324\,\mathrm{kg}$.
- Drops run from 2.5 to 5.0 m in 0.5 m steps. Set incoming speed
  $v_0^{\mathrm{PERKINS}}$ from measurements or the drop relation above.
  Use the rigid connection.
- Hold total moving mass fixed across our stack comparisons. The reference
  mass does not establish the mass of our proposed glove.
- **Geometry assumption:** our dome approximates the mechanical fist. Closer
  reproduction needs its contact profile.

#### Target

- Use the fixed EVA75-covered plate with thickness
  $h^{\mathrm{PERKINS,TARGET}}=25$ or $50\,\mathrm{mm}$.
- Keep the baseline layer-sharing and force equations. Only target thickness
  changes between these two cases.
- **Material assumption:** our estimated EVA75 curve has not been validated
  against the study's mat.
- Full contact duration and rebound need unloading behavior. Reproducing the
  study's pneumatic gloves would also need air/bladder mechanics.

