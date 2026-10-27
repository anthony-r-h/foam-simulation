# Mathematical model

> **Document purpose:** Build the model in small, reviewable steps. Settle the physical meaning of each part before adding its equations.

## Model setup and scope

- Each comparison specifies the punch mass and speed, dome geometry, hand-spring stiffness, and the thickness and compression curve of every glove and target foam layer.
- From these inputs, the model calculates force through loading and tracks how movement and work are divided among the glove, target, and hand spring.
- Comparisons hold the punch, dome, and target fixed while the foam stack changes. They cover the loading phase from first contact to maximum compression and describe mechanical response.

### Mechanical setup

- A punch presses the glove foam into a fixed plate covered with foam.
- The punch travels horizontally, so the model ignores gravity.
- Two values describe the incoming punch: its speed and its striking mass. The research literature calls this striking mass the effective mass.
- The punch receives no extra push after first contact.

![The modeled impact path from the moving mass through the hand spring, rigid dome, glove foam, and target foam to the fixed plate.](../diagrams/system-overview.svg)

### Why use a rigid dome

- The dome stands in for the rounded front of the fist inside the glove.
- It touches the centre first. More foam comes into contact as the dome presses farther in.
- Rigid means the dome keeps its shape. It does not squash, tilt, or rotate.
- This gives every stack the same growing contact area while allowing the centre and edges to compress by different amounts.
- It leaves out individual knuckles, uneven fist shapes, local hand deformation, and off-centre contact.
- The hand spring adds overall hand and wrist give. It does not reproduce those local effects.

### Basis for the setup

- The foam-covered plate follows the broad setup used by [Perkins et al. (2018)](https://doi.org/10.4236/wjet.2018.63037). The dome shape comes from the [SATRA summary of EN 13277](https://www.satra.com/spotlight/article.php?id=423).
- Punch mass and speed come from [Walilko et al. (2005)](https://pubmed.ncbi.nlm.nih.gov/16183766/) and [Adamec et al. (2021)](https://pubmed.ncbi.nlm.nih.gov/33057792/). The hand spring is a model assumption.

## Construction of foam response curves

- Supplier data usually give only one or two compression values.
- The model needs pressure at every compression level reached during the impact.
- The curve construction follows this rule:

> We convert the available supplier data to a common pressure-versus-strain scale, then use published family curves to estimate the missing response. This lets the model compare foam grades consistently, although the resulting curves remain estimates until the materials are tested under the same conditions.

- The family shapes come from [Alzoubi et al.](https://oiccpress.com/jsm/article/download/12454/14012/38722) for PU and latex and [Wu et al.](https://doi.org/10.3390/polym15234514) for EVA.
- PU and latex indentation loads are converted to average pressure. EVA data already report compression pressure, so the source tests remain different.
- One chosen loading curve represents the brief impact. The curve does not change with compression rate during the calculation.

## Calculation sequence

1. Set the punch, dome, foam, target, and hand-spring inputs.
2. Move the dome a small distance toward the plate.
3. Use the dome shape to find which locations are in contact and how far the foam must shorten at each one.
4. Use the compression curves to find the local pressure.
5. Add local pressure across the contact area to obtain total force.
6. Use total force to find hand-spring compression and total striker movement.
7. Calculate compression work, remaining speed, and elapsed time.
8. Continue until the striker reaches zero speed.

## Equations and interpretation

### The incoming punch

- Let $m$ be striking mass in kg and $v_0$ be speed at first contact in m/s.
- Together they set the starting kinetic energy $E_0$, in J:

$$
E_0=\frac{1}{2}mv_0^2
$$

- **Interpretation:** More mass brings proportionally more energy. Speed has a larger effect because it is squared. Doubling speed gives four times the starting energy.
- This energy sets how much compression work the system must take on before the striker stops.

### Foam response

- For any foam, compression strain $\varepsilon$ is the fraction of its starting thickness that has been compressed.
- Its loading curve $\sigma$ gives pressure $p$, in Pa, at that strain:

$$
p=\sigma(\varepsilon)
$$

- **Interpretation:** Each curve tells us how much pressure is needed to reach a given compression. A steep part of the curve means a small additional compression requires a large pressure increase.
- Every glove layer and the target foam has its own version of this curve.
- The calculation also runs the relationship backward: for a given pressure, find how much each foam compresses.

### Dome contact

- The dome is circularly symmetric. Distance $r$, in m, is measured from its centre. Its spherical curvature radius is $R$, in m, and its face ends at footprint radius $a$, in m, with $0<a<R$.
- Let $q$ be how far the dome advances into the glove and target foam at the centre, in m.
- At radius $r$, the dome surface starts a distance $b(r)$, in m, behind the dome tip. The spherical shape gives:

$$
b(r)=R-\sqrt{R^2-r^2},\qquad 0\leq r\leq a
$$

- The gap is zero at the centre and largest at the edge of the face.
- The geometry therefore requires a local stack shortening $c(r)$, in m:

![Cross-section of the rigid dome pressing into glove and target foam, showing central movement and local stack shortening.](../diagrams/dome-contact.svg)

$$
c(r)=\max\left[0,q-b(r)\right]
$$

- **Interpretation:** A location carries no load while $b(r)$ is greater than $q$. Once $q$ exceeds that gap, the dome contacts the foam there and begins to compress the local stack.
- Increasing $q$ therefore compresses the centre farther and brings more of the dome footprint into contact.
- Contact is restricted to $0\leq r\leq a$ where $q>b(r)$. The circular contact region is $A(q)$; its area cannot exceed $\pi a^2$.
- Once $q$ reaches $b(a)$, the whole face is in contact. Further advance increases compression without increasing the footprint.

### How the layers share local compression

- Index $i$ covers every glove foam layer and the target foam. Each layer has a starting thickness $h_i$, in m.
- At radius $r$, every layer carries the same local pressure $p(r)$.
- The shortening of each layer is $h_i\varepsilon_i\left[p(r)\right]$.
- Their shortenings must add to the required local stack shortening:

$$
c(r)=\sum_i h_i\varepsilon_i\left[p(r)\right]
$$

- **Interpretation:** The pressure at that location determines how the required shortening is divided. Softer layers use more of it; firmer layers use less.
- For a fixed central movement $q$, the model solves this equation for $p(r)$ at every radius. This produces the pressure distribution across the contact area.
- Moving a layer from the hand side to the striking side does not change the modeled result when the materials and thicknesses stay the same.
- A soft-inside, firm-outside stack is therefore treated as identical to the same layers in the reverse order. The model cannot tell which arrangement performs better.

### From local pressure to total force

- The dome-contact diagram above shows how the contact area $A(q)$ grows with central movement $q$.
- At each value of $q$, the preceding calculation gives the local pressure $p(r)$ across that area.
- Total force $F$, in N, is the integral of local pressure over the contact area:

$$
F(q)=\int_{A(q)}p(r)~\mathrm{d}A
=2\pi\int_0^a p(r)r~\mathrm{d}r
$$

- Here, $\mathrm{d}A$ is an element of contact area, and $p(r)~\mathrm{d}A$ is its contribution to total force.
- The radial form adds circular rings of area $2\pi r~\mathrm{d}r$ in the plane of the target. Pressure is zero wherever the dome has not made contact.
- **Interpretation:** Force can rise because pressure increases, because the contact area grows, or both. The dome geometry and foam curves jointly determine the result.

### Hand and wrist give

- Hand-spring stiffness $k_h$, in N/m, is a model input.
- The spring is linear and carries the total contact force $F$. Its compression $q^{\mathrm{HAND}}$, in m, follows the spring law:

$$
q^{\mathrm{HAND}}=\frac{F}{k_h}
$$

- **Interpretation:** Spring compression $q^{\mathrm{HAND}}$ is calculated from the current force. At the same force, a stiffer hand spring moves less.
- Stored spring energy $U_h$, in J, is the work required to compress the spring from zero to its current compression $q^{\mathrm{HAND}}$. Because the spring is elastic, that work is stored as spring energy.
- Work is the area under the force-versus-movement line. The force rises linearly from zero to $F$, so this area is a triangle:

$$
U_h=\frac{1}{2}Fq^{\mathrm{HAND}}
$$

- **Interpretation:** The contact force determines spring compression $q^{\mathrm{HAND}}$, which determines stored spring energy $U_h$. As the foam becomes harder to compress, more stopping movement and energy can shift into the hand spring.
- Its stiffness determines the spring displacement at each transmitted force.

### Where the movement occurs

- Dome movement $q$ includes the shortening of the glove and target foam.
- The hand spring behind the dome compresses by an additional distance $q^{\mathrm{HAND}}$.
- Striking-mass movement $q^{\mathrm{MASS}}$, in m, includes both:

$$
q^{\mathrm{MASS}}=q+q^{\mathrm{HAND}}
$$

### Work, speed, and time

- Compressing the foam takes work, just as compressing the hand spring does. Work is the area under the force-versus-shortening curve.
- For each foam layer, the model adds this work across the contact area, where pressure and shortening vary.
- The calculation first follows dome movement $q$. Accumulated work $W(q)$, in J, is the work done by the time the dome reaches that position.
- Glove compression work $U_{\mathrm{glove}}$ and target compression work $U_{\mathrm{target}}$, both in J, combine with stored spring energy $U_h$ to give total compression work at that position:

$$
W(q)=U_{\mathrm{glove}}(q)+U_{\mathrm{target}}(q)+U_h(q)
$$

- This work comes from the punch's starting kinetic energy $E_0$. The energy left for motion is $E_0-W(q)$.
- The incoming punch used the kinetic-energy relation $E=\frac12 mv^2$. Solving the same relation for speed, using the remaining energy, gives striking-mass speed $v(q)$, in m/s:

$$
v(q)=\sqrt{\frac{2\left[E_0-W(q)\right]}{m}}
$$

- **Interpretation:** As compression work builds, the striking mass slows. It stops when compression work equals the starting energy.
- Elapsed time $t$, in s, follows from distance divided by speed. For a small advance of the striking mass $\mathrm{d}q^{\mathrm{MASS}}$, the time taken is:

$$
\mathrm{d}t=\frac{\mathrm{d}q^{\mathrm{MASS}}}{v(q)}
$$

- **Interpretation:** The same distance takes longer as the striking mass slows. Adding these time increments gives elapsed time through compression.
- This assigns a time to each dome position. The same results can then be expressed as work over time $W(t)$ and speed over time $v(t)$.
- With the same geometry, foam curves, target, and hand spring, equal starting energy gives the same maximum compression and peak force.
- Timing can still differ: a heavier, slower punch takes longer to reach maximum compression than a lighter, faster punch with the same energy.

### Where the calculation starts and stops

- The calculation starts at first contact, with elapsed time $t=0$ and the striking mass moving at incoming speed $v_0$.
- The foam and hand spring start uncompressed. Dome movement $q$ and accumulated work $W(q)$ are both zero.
- As the dome advances toward the plate, movement is positive, compression work builds, and the striking mass slows.
- The calculation stops when accumulated work $W(q)$ equals starting energy $E_0$. Speed $v(q)$ is then zero, and compression is at its maximum.
- The chosen foam curves give increasing force as compression grows, so this stopping point also gives peak force.
- This completes the loading phase. Unloading and rebound are outside the model's scope.
- If the numerical material range ends before the striker stops, the calculation is incomplete. Report the force, speed, and time reached; maximum compression and peak force remain unresolved. The [high-compression extrapolation](#high-compression-extrapolation) section distinguishes this numerical boundary from the assumed foam compression limit.

## Foam-curve construction and anchoring

### Slow tests and fast impacts

- Foam can resist more when compressed quickly: there is less time for its structure to relax or for trapped air to escape.
- We use two versions of each curve. The slow version connects the reference tests to supplier firmness values. The fast version represents impact loading.
- First, fit the slow curve to the supplier anchors. Then carry that pressure adjustment into the fast version of the reference equation.
- The supplier points constrain the slow curve. The increase under fast loading comes from the borrowed model.
- The impact calculation uses one fixed fast curve throughout loading. It does not change the curve as the striker slows down.
- Strain rate measures the fraction of starting thickness lost each second. A strain rate of 0.0333 means the foam loses 3.33% of its starting thickness each second. Punch speed measures distance travelled per second.
- [Alzoubi et al., Section 4 and table 3](https://www.researchgate.net/publication/266854162_Modeling_of_Compression_Curves_of_Elexible_Polyurethane_Foam_with_Variable_Density_Chemical_Formulations_and_Strain_Rates) compressed PU and latex specimens by about 3.33% of their starting thickness each second, at 25 °C, until they reached 70% compression. Reaching 50% compression took about 15 seconds. These tests supply our PU/latex coefficients.
- [Wu et al.](https://pubmed.ncbi.nlm.nih.gov/38231925/) compressed EVA at three constant rates. The foam lost about 0.17%, 3.3%, or 17% of its starting thickness each second, written as $0.0017$, $0.033$, and $0.17~\mathrm{s}^{-1}$. Reaching 50% compression took about five minutes, 15 seconds, or three seconds, respectively. The foam resisted more at the faster rates, which the authors linked to air having less time to escape.

### Reference family curves

- A family curve supplies the response between the few points a supplier gives. Its coefficients come from a published reference specimen.
- We keep those coefficients fixed for each reference fit. Manufacturer data supply the anchors used to adjust the curve's pressure scale afterward.
- Write reference pressure as $s(\varepsilon)$, in Pa, to distinguish it from the calibrated grade curve $\sigma(\varepsilon)$.
- Pressure coefficients are already converted to Pa.

#### PU and latex

- The curve combines resistance that can relax during slow compression, a linear contribution, and a steep rise at large strain.
- The reference values below follow [Alzoubi et al., equation 23 and table 3](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/). PU55, HR40, and Latex85 identify specimens with densities of $55~\mathrm{kg/m^3}$, $40~\mathrm{kg/m^3}$, and $85~\mathrm{kg/m^3}$. The last row is the reference test rate.

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

- **Interpretation:** Faster compression leaves less time for the first contribution to relax. The other two terms set resistance that depends only on how far the foam has compressed.
- For the proposed fast curve, allow no time for relaxation. The first term becomes $k^{\mathrm{RELAX}}\varepsilon$; the other terms stay unchanged.

#### EVA

- This curve combines a response that levels off with increasing resistance from air compressed inside the foam.
- The reference values follow [Wu et al., equation 16 and table 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/), using their slowest test of a $35~\mathrm{kg/m^3}$ EVA specimen. That test took about five minutes to reach 50% compression.

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

- **Interpretation:** The first term approaches the plateau pressure. The air contribution grows as strain increases; a smaller leakage ratio makes it larger.
- For the proposed fast curve, assume no air escapes during compression: set $\lambda=0$. The first term stays unchanged.

### Fast-loading approximation

- Represent the punch with the fast limit of the published equations.
- A brief loading phase leaves less time for relaxation. For PU/latex, compare its duration with the reference model's characteristic relaxation time $\tau$, in s:

$$
\tau=\frac{\eta}{k^{\mathrm{RELAX}}}
$$

- [Alzoubi et al., Section 5.2 and table 3](https://www.researchgate.net/publication/266854162_Modeling_of_Compression_Curves_of_Elexible_Polyurethane_Foam_with_Variable_Density_Chemical_Formulations_and_Strain_Rates) report this ratio as a characteristic time. Using the coefficients above:

| Reference foam | Characteristic relaxation time |
| --- | --- |
| PU55 | About 1,455 ms |
| HR40 | About 108 ms |
| Latex85 | 90 ms |

- When loading is much shorter than this time, the relaxing contribution stays close to its fast limit, $k^{\mathrm{RELAX}}\varepsilon$. Within these equations, the foam has little time to relax during a similarly brief punch.
- Assign the reference foam's relaxation time and fast stiffness to the selected grade.
- For EVA, the fast choice sets leakage to zero. The borrowed fit does not supply an air-leakage timescale for a comparable duration check.
- These fast curves are borrowed approximations. Supplier measurements constrain the slow response and cannot verify the selected foams' resistance during a punch.

### Supplier anchors

| Supplier input | Use in this model |
| --- | --- |
| IFD/ILD force or compression pressure at a stated compression percentage | Sets the first pressure anchor |
| Up to two additional values at stated compression percentages | Set further anchors when available |
| Foam density | Used for the compression limit in [high-compression extrapolation](#high-compression-extrapolation); it does not set firmness by itself |
| Available sheet thicknesses | Guide layer-thickness choices; thickness sets how much a layer shortens at a given strain |

- The anchors set the pressure scale below. They do not separately identify the reference curve's stiffness, relaxation, or air-leakage coefficients.
- Choosing a reference fit and a rapid-loading approximation remains a model choice. Supplier firmness values alone do not determine either.
- To fit a foam's curve, we need points that say how much pressure produces how much compression. These are our anchors.
- Supplier values come in different forms. Here we turn them into pressure at a stated strain, ready for the scaling step below.
- PU and latex firmness is often given as IFD or ILD: the force needed to press a test tool into the foam by a stated percentage of its thickness.
- For example, [HD36-HQ](https://canada.foambymail.com/hd36-hq-foam-sheet.html) lists 35 lbf at 25% compression. That is about 155.7 N of force.
- To get average pressure, divide that force by the test tool's contact area. The [PFA guide, page 2](https://pfa.org/wp-content/uploads/2022/05/InTouchv4.2new.pdf) describes a $50~\mathrm{in}^{2}$ tool, equivalent to $0.032258~\mathrm{m}^{2}$.

$$
\text{Average pressure}
=\frac{155.7~\mathrm{N}}{0.032258~\mathrm{m}^{2}}
\approx4.83~\mathrm{kPa}
$$

- Our anchor is therefore 4.83 kPa at 25% strain: one point on the foam's curve.
- We assume the $50~\mathrm{in}^{2}$ test area for our PU/latex inputs unless the supplier specifies another area.
- EVA data already give pressure at a stated compression.
- Each supplier value now has the same form: pressure at a stated strain. We use these points to adjust the published family curve to the chosen grade.
- The conversion puts the units on the same scale. Test differences remain, including sample thickness and support from surrounding foam. Treating these points as equivalent inputs to the model is an approximation.

### Curve fitting

- Treat the supplier measurements as data for estimating one smooth curve. Use all available points to estimate an overall pressure scale and a skew that changes how strongly pressure grows with compression.
- Keep the study coefficients and compression axis fixed. The adjustment preserves the study curve's general form while allowing a gradual change in its pressure multiplier. It introduces no joins or kinks.
- The fitted curve may miss individual measurements. Those differences show how well this two-parameter adjustment describes the supplier data.

#### Curve definition

- Let $s^{\mathrm{SLOW}}(\varepsilon)$ be the slow study pressure at strain $\varepsilon$, and $\sigma^{\mathrm{SLOW}}(\varepsilon)$ the fitted pressure for our foam, both in Pa. Strain is dimensionless.
- Use the study's slow settings: $\dot{\varepsilon}=0.0333~\mathrm{s}^{-1}$ for PU/latex, or $\lambda=0.19308$ for EVA.
- Let $\beta_0$ be the logarithm of the pressure scale and $\beta_1$ the skew, both dimensionless. Before the [high-compression extrapolation](#high-compression-extrapolation), the fitted curve uses their OLS estimates $\hat{\beta}_0$ and $\hat{\beta}_1$:

$$
\sigma^{\mathrm{SLOW}}(\varepsilon)
=e^{\hat{\beta}_0+\hat{\beta}_1\varepsilon}\times s^{\mathrm{SLOW}}(\varepsilon)
$$

- With $\hat{\beta}_1=0$, the multiplier is constant. Positive $\hat{\beta}_1$ increases the multiplier with compression; negative $\hat{\beta}_1$ decreases it.
- Let $N$ be the number of supplier observations. Observation $i$ gives pressure $p_i>0$ in Pa at dimensionless strain $\varepsilon_i>0$. The study pressure must also be positive at every fitted strain.
- A supplier's support factor gives the deeper pressure divided by the pressure at 25% compression. Use it to calculate the deeper observation before fitting. This derived observation is not an independent measurement of pressure.
- If a supplier gives a range or minimum, record it that way. Choosing a single pressure from it remains a model choice.
- Zero pressure at zero compression is preserved by the study curve. Exclude that origin from the fit because its pressure ratio and logarithm are undefined.

#### Scale and skew estimation

- At each supplier strain, divide the supplier pressure by the study pressure. The ratio is the fitted pressure multiplier at that strain.
- Define its dimensionless natural logarithm as $y_i$:

$$
y_i=\ln\left[\frac{p_i}{s^{\mathrm{SLOW}}(\varepsilon_i)}\right]
$$

- Fit $\beta_0$ and $\beta_1$ by ordinary least squares (OLS), treating $y_i$ as a linear function of $\varepsilon_i$ across all $N$ observations. The estimates are $\hat{\beta}_0$ and $\hat{\beta}_1$, and the fitted pressure scale is $e^{\hat{\beta}_0}$. Each observation has equal weight; fitting in log space measures proportional pressure differences.
- With only one distinct observed strain, scale and skew cannot be estimated separately. Set $\hat{\beta}_1=0$ and estimate $\hat{\beta}_0$ from the supplier-to-study pressure ratio.
- More observations use the same two parameters. Two distinct observations can be matched exactly if physical constraints permit; additional observations generally leave residual differences.

#### Fit constraints

- Require pressure to remain nondecreasing over the full strain range where this fitted curve is used before the tail begins. Since $e^{\hat{\beta}_0+\hat{\beta}_1\varepsilon}$ is positive, this requires:

$$
\frac{d s^{\mathrm{SLOW}}(\varepsilon)}{d\varepsilon}
+\hat{\beta}_1\times s^{\mathrm{SLOW}}(\varepsilon)\geq0
$$

- If the OLS estimates violate this condition, refit by least squares in log space subject to it. Apply the same check to the adjusted fast curve below, and require a strictly positive slope for both curves at the tail join in [high-compression extrapolation](#high-compression-extrapolation). Check the interval between observations and the extrapolated region as well as the observed strains.
- Report the supplier pressure, fitted pressure, and percentage difference at each observation. Matching observations used in the fit is not independent validation of the curve.
- Beyond the measured range, the fitted scale and skew remain an extrapolation assumption until the tail treatment begins. The observations do not establish that the adjusted shape remains accurate there.

#### VA35 example

- [Wu et al., sections 2.1-2.2](https://www.mdpi.com/2073-4360/15/23/4514) tested commercial Jiexin EVA foam with an average density of $35~\mathrm{kg/m^3}$.
- We use their slowest test, which compressed a 30 mm sample at 3 mm per minute. The foam lost about 0.17% of its starting thickness each second and took five minutes to reach 50% compression. This is the slow-loading baseline.
- [Evazote VA35](https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A039-Evazote-VA35.pdf) has the same nominal density. Its supplier reports 52 kPa at 25% compression and 118 kPa at 50%.
- First fit scale alone using the 25% value, with skew set to zero. Keep the 50% value aside to check the prediction. The study curve gives about 40.15 kPa and 94.66 kPa at these strains:

$$
\sigma^{\mathrm{SLOW}}(0.50)
\approx52\times\frac{94.66}{40.15}~\mathrm{kPa}
\approx122.6~\mathrm{kPa}
$$

![The EVA35 study curve anchored to VA35 at 25% compression, shown over 0-100% and clipped at 1,500 kPa. Shading beyond 80% marks extrapolation. At 50%, the prediction is 122.6 kPa; the supplier value of 118 kPa was kept out of the fit.](../diagrams/foam-curve-anchors.svg)

- The prediction is about 4% above the unused supplier value. This is a useful check of pressure growth from 25% to 50% compression for this grade.
- Matching density does not establish identical foams. The supplier sheet also leaves the test speed unspecified, so we have not matched loading rates.
- This check covers the interval between these two points. It does not establish the full curve or impact behaviour.
- For the final fit, use both supplier values to estimate scale and skew, subject to the slope constraints. The 50% value gives a smaller pressure multiplier than the 25% value, producing negative skew in the unconstrained fit.
- A third pressure measurement at another strain, withheld from the fit, would be needed to check the fitted curve independently.

### Impact curve

- Estimate $\hat{\beta}_0$ and $\hat{\beta}_1$ from the slow supplier observations.
- For the punch, multiply the fast study pressure $s^{\mathrm{FAST}}(\varepsilon)$ by the same strain-dependent factor. The adjusted fast pressure $\sigma^{\mathrm{FAST}}(\varepsilon)$ and study pressure are both in Pa. Before the tail begins:

$$
\begin{aligned}
\sigma^{\mathrm{SLOW}}(\varepsilon) &= e^{\hat{\beta}_0+\hat{\beta}_1\varepsilon}\times s^{\mathrm{SLOW}}(\varepsilon)\\
\sigma^{\mathrm{FAST}}(\varepsilon) &= e^{\hat{\beta}_0+\hat{\beta}_1\varepsilon}\times s^{\mathrm{FAST}}(\varepsilon)
\end{aligned}
$$

- Keep $\hat{\beta}_0$ and $\hat{\beta}_1$ the same for both curves. This preserves the study's ratio of fast to slow pressure at each positive strain before the tail begins.
- The fast curve will usually sit above the supplier points because it assumes greater resistance during quick compression. The supplier points still describe the slow response.
- The method turns a few supplier measurements into a complete loading curve. For VA35, one supplier point predicts another within about 4%. That supports the curve between those points for that grade.

### High-compression extrapolation

- As the spaces inside the foam close, it becomes harder to compress further. This steep rise in resistance is called densification.
- Supplier points usually stop at 50% compression for EVA or 65% for PU/latex.
- The studies reach about [70% for PU/latex](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/) and [80% for EVA](https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/).
- Beyond the supplier points, we follow the study curve with our pressure adjustment. We assume its shape also describes the foam we have chosen.
- Beyond the study's range, we add a steep section called the tail.
- We use density to estimate how far the foam can compress before its internal space closes. This assumes the foam cannot spread sideways and its solid material does not lose volume.
- The tail joins smoothly onto the adjusted study curve and rises toward that estimated compression limit.
- We have no measurements for this part of the curve. Density helps set the limit, but does not tell us how steep the rise should be.

- We estimate how much thickness would remain after all internal space closes. This depends on foam density and the density of its solid material.
- Let $\rho^{\mathrm{FOAM}}$ and $\rho^{\mathrm{SOLID}}$ be those densities, both in $\mathrm{kg/m^3}$. The estimated limiting strain $\varepsilon^{\mathrm{CAP}}$ is the fraction of starting thickness compressed:

$$
\varepsilon^{\mathrm{CAP}}
=1-\frac{\rho^{\mathrm{FOAM}}}{\rho^{\mathrm{SOLID}}}
$$

| Family | Solid-material density used | Basis |
| --- | --- | --- |
| PU | $1{,}200~\mathrm{kg/m^3}$ | Value used by Alzoubi et al., Section 5.3 |
| Latex | $920~\mathrm{kg/m^3}$ | Assumed value |
| EVA | $950~\mathrm{kg/m^3}$ | Borrowed from other EVA formulations; assumed for these grades |

- For EVA75 at $75~\mathrm{kg/m^3}$, the limit is about 92.1% compression. It estimates complete closure of the starting pore volume under our volume assumptions. Mechanical failure and the onset of densification require separate evidence.

- Keep the adjusted study curve up to its measured range: strain $\varepsilon^{\mathrm{FIT}}=0.70$ for PU/latex and 0.80 for EVA.
- If the estimated limit is too close, start the tail sooner. Leave at least 0.04 strain, or four percentage points of compression, before the limit.
- Call the starting strain $\varepsilon^{\mathrm{JOIN}}$ and the strain left before the limit $L$. These strain quantities are dimensionless:

$$
\begin{aligned}
\varepsilon^{\mathrm{JOIN}} &= \min\left[\varepsilon^{\mathrm{FIT}},\varepsilon^{\mathrm{CAP}}-0.04\right]\\
L &= \varepsilon^{\mathrm{CAP}}-\varepsilon^{\mathrm{JOIN}}
\end{aligned}
$$

- The four-percentage-point margin is a calculation choice. It has no measured physical meaning. Supplier anchors must be at or below the tail's start.

- At the join, continue from the same pressure and slope so the curve has no sudden jump. Then make it rise more steeply toward the compression limit.
- Let $p^{\mathrm{JOIN}}$ be pressure at the join, in Pa, and $k^{\mathrm{JOIN}}$ the slope there, in Pa per unit strain. Calculate both after applying scale and skew. Write $s(\varepsilon)$ for the slow or fast study pressure being extended, in Pa:

$$
\begin{aligned}
p^{\mathrm{JOIN}} &= e^{\hat{\beta}_0+\hat{\beta}_1\varepsilon^{\mathrm{JOIN}}}\times s(\varepsilon^{\mathrm{JOIN}})\\
k^{\mathrm{JOIN}} &= e^{\hat{\beta}_0+\hat{\beta}_1\varepsilon^{\mathrm{JOIN}}}\times
\left[
\frac{ds(\varepsilon)}{d\varepsilon}+\hat{\beta}_1\times s(\varepsilon)
\right]_{\varepsilon=\varepsilon^{\mathrm{JOIN}}}
\end{aligned}
$$

- Require $k^{\mathrm{JOIN}}>0$ for both curves. A zero joining slope would make the tail below flat. Skew affects both the joining pressure and slope, so the supplier fit also influences resistance in the unmeasured tail.
- The dimensionless exponent $n^{\mathrm{TAIL}}$ controls how steeply the tail rises. We use 2. For strain above the join and below the limit:

$$
\sigma(\varepsilon)=p^{\mathrm{JOIN}}
+\frac{k^{\mathrm{JOIN}}L}{n^{\mathrm{TAIL}}}
\left[
\left(\frac{L}{\varepsilon^{\mathrm{CAP}}-\varepsilon}\right)^{n^{\mathrm{TAIL}}}-1
\right]
$$

- At the join, the added pressure is zero and the slope matches the curve before it. As compression approaches the limit, pressure grows without bound.
- A larger exponent makes the tail steeper while keeping the same starting pressure, starting slope, and compression limit.
- Apply the supplier adjustment first, then attach this tail. The slow and fast curves have their own starting pressures and slopes, but use the same density, join rule, and tail exponent.
- If a layer reaches the tail, its chosen shape can change peak force, how quickly force rises, and how much thickness remains.

- The pressure lookup ends at $1~\mathrm{GPa}$ local pressure, or an earlier endpoint of any component's material table. This keeps the calculation finite.
- The cutoff is a numerical setting. Predictions below it can still depend strongly on the unmeasured tail.
- If the striker is still moving at that point, report the force, speed, and time reached as an incomplete result. Peak force and maximum compression remain unresolved.

## Parameters for the worked example

- Four groups define the impact: the punch, the striker's shape, hand and wrist give, and the padded target.

### The punch

- We use a forceful punch by an adult without substantial punching training as our reference.
- [Adamec et al.](https://epub.ub.uni-muenchen.de/76042/1/76042.pdf) studied 50 adults, selecting each person's highest-impulse attempt from three.
- We use their dominant-fist group means: a striking mass of 2.597 kg and an incoming speed of 7.7 m/s.
- Striking mass describes how much mass contributes to the impact, including the arm's contribution. Speed describes how fast the fist arrives.
- Together, these values give a reference energy of about 77 J, calculated from the separate group means for mass and speed.

### The dome striker

- We follow the striker dimensions in [SATRA's description of the hand-protector test](https://www.satra.com/spotlight/article.php?id=423): an 80 mm wide domed face with a 100 mm curvature radius.

### Hand and wrist give

- A linear spring allows movement between the effective striking mass and the rigid dome.
- Use a stiffness of $1~\mathrm{kN/mm}$, giving $1~\mathrm{mm}$ of spring displacement per kilonewton of transmitted force.
- This stiffness represents combined give behind the fist. It is an unmeasured model input and should be varied when testing whether stack comparisons depend on hand and wrist give.

### The padded target

- We follow the padded-force-plate idea in [Perkins et al.](https://www.scirp.org/pdf/wjet_2018072715333666.pdf), who compared glove impacts onto 25 and 50 mm of EVA75. Here we use the 50 mm condition: a fixed plate with foam that shares the compression work with the glove.
- Pressure at 25% compression anchors the target curve using the method in [foam-curve construction and anchoring](#foam-curve-construction-and-anchoring).
- The [Ultralon EVA75 sheet](https://www.ubuild.co.nz/wp-content/uploads/2022/10/properties-of-low-density-pe-eva-foams-feb-2022.pdf) gives a pressure range of 42-68 kPa at 25% compression. Both ends describe the same compression level, so this supplies one anchor with a pressure range.
- We choose 55 kPa, the midpoint, for that anchor. Likewise, we choose $75~\mathrm{kg/m^3}$ from the density range of $68~\mathrm{kg/m^3}$ to $82~\mathrm{kg/m^3}$. Both values are chosen midpoints of supplier ranges.
- This profile approximates an EVA75 target. Its relevance to the study's mat or a human body requires separate validation.

### Parameter values

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
| Target density | $\rho^{\mathrm{TARGET}}$ | $75~\mathrm{kg/m^3}$ | Midpoint of $68~\mathrm{kg/m^3}$ to $82~\mathrm{kg/m^3}$ in the [Ultralon sheet](https://www.ubuild.co.nz/wp-content/uploads/2022/10/properties-of-low-density-pe-eva-foams-feb-2022.pdf) |
| Target pressure at 25% compression | $p_{25}^{\mathrm{TARGET}}$ | 55 kPa | Midpoint of 42-68 kPa in the same sheet |

- The target foam follows the same compression equations as the glove layers.
- Glove foam grades, layer thicknesses, and total thickness remain undecided.
- Keep each foam's reference curve, the fast-loading assumptions, and the high-compression extension rule unchanged across stack comparisons.

### Dome contact

- Dome curvature radius $R$ sets how rounded the face is. Footprint radius $a$ limits how far contact can spread.

![Side view of the dome: the face follows a circle with a 100 mm radius and spans 80 mm, with a 40 mm footprint radius. First contact occurs at the tip.](../diagrams/dome-dimensions.svg)

- A larger curvature radius would make the face flatter.
- The tip touches first. As the dome advances, contact spreads outward to the edge of the face.
- With these dimensions, $b(a)\approx8.35~\mathrm{mm}$. At that central advance the whole face is in contact; the footprint then stays fixed.
- The worked example defines its own impact conditions using inputs from several sources.

## Reported outputs and comparison metrics

- Compare stacks under the same punch, dome geometry, target, and hand spring.
- Keep the force-over-time and force-against-glove-compression curves alongside the summary metrics. Similar summary values can hide different responses.
- All measures cover loading from first contact to stopping time $t^{\mathrm{END}}$, in s, when the striking mass first reaches zero speed.
- These endpoint measures require a completed loading phase. An incomplete calculation reports the reached state separately; its peak, peak-normalized loading rates, and final work shares remain unresolved.
- These measures describe force buildup and compression. They do not establish perceived "poppy" or "pillow" feel; rebound is outside this loading-only model.

### Peak force

- Peak force $F_{\max}$, in N, is the highest total contact force during loading:

$$
F_{\max}=\max_{0\leq t\leq t^{\mathrm{END}}}\left[F(t)\right]
$$

- **Interpretation:** Peak force does not describe how quickly the load develops.

### Force at 5 ms

- **Intent:** Compare the resistance developed early in the impact, using the same elapsed time from first contact for every stack.
- The sampling time is $t_5=0.005~\mathrm{s}$. Early force $F_5$, in N, is the total contact force at that time:

$$
F_5=F(t_5)
$$

- **Interpretation:** At the same punch conditions, a lower value indicates a softer early response; a higher value indicates a firmer early response. Read it with peak force and maximum compression.
- The 5 ms sampling time is a comparison choice. Interpolate between adjacent force-time samples when needed.
- Report this measure as unavailable if loading stops or the calculation ends before 5 ms. Do not substitute peak force or extend the loading curve.

### 10%-to-90% loading rate

- **Intent:** Compare how abruptly force builds through the main rise, excluding the first and last 10% of the force increase.
- Times $t_{10}$ and $t_{90}$, in s, are the first times satisfying:

$$
\begin{aligned}
F(t_{10}) &= 0.1F_{\max}\\
F(t_{90}) &= 0.9F_{\max}
\end{aligned}
$$

- Loading rate, in N/s, is the force increase divided by the elapsed time:

$$
\text{loading rate}_{10-90}=\frac{0.8F_{\max}}{t_{90}-t_{10}}
$$

- **Interpretation:** At the same peak force, a higher rate means a faster buildup. Read it alongside peak force, since a higher peak can also raise the rate.

### Peak loading rate over 0.5 ms

- Find the largest force increase over any 0.5 ms interval during loading. This captures abrupt rises that the 10%-to-90% average can smooth over.
- Divide that increase by the interval duration $\Delta t=0.0005~\mathrm{s}$ to obtain the largest rate, in N/s:

$$
\text{peak loading rate}_{0.5~\mathrm{ms}}
=\max_{0\leq t\leq t^{\mathrm{END}}-\Delta t}
\left[\frac{F(t+\Delta t)-F(t)}{\Delta t}\right]
$$

- **Interpretation:** A higher value means a sharper rise somewhere in the impact, even when peak force or the overall loading rate is similar. The fixed window makes the same comparison across stacks.
- Only complete windows before the stopping time are included. If loading lasts less than 0.5 ms, report this measure as unavailable.
- **Literature context:** [Perkins et al., pp. 613-617](https://www.scirp.org/pdf/wjet_2018072715333666.pdf) used 0.5 ms windows advanced every 0.1 ms through contact. Their peak loading rate distinguished gloves with similar peak forces. We use the same window duration on our modeled loading phase; their measurements also included oscillations absent from this model.

### Maximum glove compression at the centre

- **Intent:** Show how much glove thickness is used beneath the dome tip, where compression is greatest.
- Central shortening of layer $i$, written $q_i(t)$ in m, comes from its starting thickness and strain at central pressure $p(0;t)$:

$$
q_i(t)=h_i\varepsilon_i\left[p(0;t)\right]
$$

- Central glove shortening $q^{\mathrm{GLOVE}}(t)$ adds only the glove layers. Its largest value is $q^{\mathrm{GLOVE}}_{\max}$:

$$
\begin{aligned}
q^{\mathrm{GLOVE}}(t) &= \sum_{i\in\mathrm{glove}}q_i(t)\\
q^{\mathrm{GLOVE}}_{\max} &= \max_{0\leq t\leq t^{\mathrm{END}}}\left[q^{\mathrm{GLOVE}}(t)\right]
\end{aligned}
$$

- Report in mm and as a percentage of starting glove thickness.

- **Interpretation:** A higher percentage means more central compression. Read it with the force curve to see the load required to use that travel.
- **Literature context:** [Chadli et al.](https://www.sciencedirect.com/science/article/abs/pii/S0263224118306316) found that similar glove compression could accompany different damping, supporting the need to read compression alongside force.

### Layer compression and remaining thickness at the centre

- **Intent:** Identify which layers compress most and which have reached the steep part of their compression curves.
- Report central shortening $q_i(t)$ and central remaining thickness $h_i-q_i(t)$ through loading. In this model, layer compression increases until the striker stops, so remaining thickness is smallest then:

$$
\text{minimum central thickness of layer }i
=h_i-q_i\left(t^{\mathrm{END}}\right)
$$

- **Interpretation:** Interpret remaining thickness using the layer's starting thickness and compression curve.
- **Literature context:** [Wu et al., figure 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/) links declining energy-absorption efficiency to densification in its EVA35 specimens. This supports checking each layer against its own compression curve.

### Compression work by component

- Compression work is the energy transferred into a component as it compresses.
- Work shares show how that energy is divided between the glove layers, target foam, and hand spring.
- Foam work includes the whole contact area. At each location, integrate the layer's pressure-versus-strain curve up to its current strain, then multiply by starting thickness and integrate over the contact area.
- For foam layer $i$, loading pressure is $\sigma_i(\xi)$ in Pa, where $\xi$ is the dimensionless strain variable inside the integral. Local pressure $p(r;t)$ determines the current strain $\varepsilon_i\left[p(r;t)\right]$. Layer work $U_i(t)$, in J, is:

$$
U_i(t)=h_i\int_{A\left[q(t)\right]}
\left[\int_0^{\varepsilon_i[p(r;t)]}\sigma_i(\xi)~\mathrm{d}\xi\right]
\mathrm{d}A
$$

- **Interpretation:** The inner integral gives work per starting volume of foam. Thickness and area turn it into total layer work, including the different amounts of compression beneath the dome.
- Add the glove layers' work for the glove total. The target uses the same equation; hand-spring work is the stored energy $U_h$ defined earlier.
- For component $j$, accumulated work $U_j(t)$ is measured in J. Components are the individual glove layers, target foam, and hand spring.
- Report work at the stopping time and its percentage of starting energy:

$$
\begin{aligned}
\text{component work}_j &= U_j\left(t^{\mathrm{END}}\right)\\
\text{work share}_j &= 100~\frac{U_j\left(t^{\mathrm{END}}\right)}{E_0}
\end{aligned}
$$

- In this model, the target is fixed, no extra push acts after contact, and all starting kinetic energy becomes compression work when the striker stops. The work shares therefore sum to 100%.
- A larger glove share means more work went into compressing the glove and less into the target and hand spring.
- This split depends on the chosen target and hand stiffness as well as the glove.
- Loading work includes both recoverable and dissipated energy. Calculating permanent energy absorption requires unloading behaviour, which is outside this loading-only model.

## Model scope and limitations

### What it can compare

- Compare foam grades and layer thicknesses under the same prescribed impact.
- Describe force buildup, compression, and how stopping work is shared between the glove, target, and hand spring.
- Explain how those results follow from the chosen foam curves and mechanical setup. Their accuracy for real gloves remains unestablished.

### What it leaves out

- Reversing layer order does not change the model's results.
- Each foam uses a borrowed, fixed fast-loading curve. Its response does not adjust to the changing compression rate as the striker slows, and the assumed increase in resistance can affect stack comparisons.
- The high-compression tail is extrapolated beyond the measured curve. If a layer reaches the tail, its assumed shape can affect peak force and remaining thickness.
- The dome stays rigid and moves in one direction against a fixed padded plate. Foam columns compress independently; sideways deformation and foam and cover mass are omitted.
- Hand and wrist give is represented by a massless, linear, elastic spring. Its stiffness is assumed and can affect how movement and work are divided between the glove, target, and hand.
- The calculation ends at maximum compression. It gives no rebound, damage, or repeated-impact response, and does not establish perceived glove feel.

