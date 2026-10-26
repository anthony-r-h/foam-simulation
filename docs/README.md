# Simulating the impact response of layered boxing-glove padding

## 1. Why this project exists

Most boxing gloves are sold by weight, closure type, colour, and price. These attributes help someone choose a product, but they do not describe how the padding compresses, builds resistance, recovers, or changes with repeated use. Two gloves with the same weight and similar construction can therefore behave very differently on the hand and during impact.

Boxing-glove padding is often a stack of different foams. Layering shapes the compression profile of the glove as a whole: the stack can give easily at first, build support as the punch gets harder, and use its available travel without reaching a sudden, harsh bottoming point. Individual layers can contribute surface softness, deeper support, recovery, or durability. The recipe is rarely published. Even when manufacturers name broad foam families, they generally do not disclose layer thicknesses, formulations, purchasable grades, or the compression curves needed to reproduce the stack.

Market descriptions such as "pillowy" and "poppy" do not close this gap. "Pillowy" suggests softness without saying how the padding supports deeper compression. "Poppy" may describe crisp feedback, rebound, or simply the sound of a punch on a bag. Neither term has a shared test method or numerical scale.

The design task is to build a complete foam solution for a boxing glove. A useful stack should use enough travel to soften initial loading without feeling vague, build resistance progressively, avoid bottoming out during harder impacts, spread load over the knuckles, and control how force develops at the target. It should behave well across a useful range of punches, recover through repeated use, fit the glove's limits on thickness, weight, shape, and construction, and give the boxer predictable feedback. These goals can conflict. The model and physical tests are intended to make those tradeoffs visible.

## 2. What foam is doing inside a glove

Foam gives the fist distance over which to slow when the glove meets the target. As the foam compresses, it pushes back. A useful layer compresses easily enough at first and then builds support. Foam that is too soft or too thin can exhaust its useful travel and become suddenly hard to compress; foam that is too firm can make force rise too quickly from first contact.

Combining layers lets the designer shape the response through the impact. A single firmness value cannot describe that response. The relevant description is a compression curve, and the objective is a stack that uses its available travel without becoming harsh or bottoming out too early.

A compression curve describes one foam under a defined test, not a complete glove. Connecting each layer's curve and thickness to the assembled stack requires three kinds of evidence: compression tests of the materials, impact tests of the complete glove, and realistic impact conditions for the boxer, hand, and target.

## 3. Foams under consideration

The working set includes flexible polyurethane foam, including high-resilience grades, latex, and ethylene-vinyl acetate. It can change as grades are added or removed, and the use of these particular grades in commercial boxing gloves has not been established. Density and firmness are separate properties.

### What the family names mean

Flexible polyurethane, or PU, spans a wide range of densities and firmness levels. High-resilience PU, or HR, is associated with stronger recovery and support, but neither label defines a compression curve. Latex foam is known for springy response and strong recovery. "Dunlop" describes its manufacturing process rather than its firmness or curve. EVA is a closed-cell foam available across a wide range of densities and firmness levels. A commercial grade name does not define the behavior of every EVA foam. In every family, the particular grade and its measured response matter more than the family name.

### What is still missing

Material selection still requires full loading and unloading curves for the purchased foams, tests at glove-layer thicknesses and punch-like loading rates, measurements of recovery and change after repeated impacts, and estimates of variation between samples and batches.

## 4. Why existing tests do not answer the design question

Rules, standards, and research address different questions: whether a glove may be used, whether a protector passes a prescribed test, and how a glove or foam responds during impact. Together they still do not connect measured curves for a disclosed foam stack to the response of a finished glove.

### What standards and rules cover

Competition rules primarily determine whether a glove may be used. They specify matters such as weight, padding allowance, materials, dimensions, thumb attachment, closure, condition, and approval, but they do not describe the padding's compression curve, recovery, or impact feel. ([World Boxing rules](https://worldboxing.org/wp-content/uploads/2024/11/World-Boxing-Competition-Rules-Nov-2024-Approved.pdf))

EN 13277-7 asks whether a hand protector keeps transmitted peak force below a limit in a prescribed drop test. A 2.5 kg striker with an 80 mm domed face and a 100 mm radius is dropped onto the glove. The glove rests on a rigid 90 mm half-cylinder with a load cell under its central anvil. Class A and B protectors receive 3 J impacts, and the increased-protection zone of Class B also receives 10 J impacts. The stated peak-force limit is 2 kN. ([SATRA summary of EN 13277](https://www.satra.com/spotlight/article.php?id=423)) The standard concerns protection of the wearer's hand and expressly excludes performance for the opponent. ([EN 13277-7:2009 preview](https://cdn.standards.iteh.ai/samples/26354/0e49f762fd014431939bb6888166baf2/SIST-EN-13277-7-2009.pdf))

This test provides a repeatable pass-or-fail screen. It does not describe the complete force-time or compression response, so two passing gloves may still feel and behave differently.

### What the research literature adds

Research measures parts of the response that rules leave out, although no one test answers the whole design question.

#### Finished-glove impact tests

Glove weight alone does not predict impact response. [Girodet et al. (2009)](https://doi.org/10.1080/10255840903080885) tested nine 10, 12, and 14 oz gloves at 3, 10, and 20 J. Gloves of the same weight produced different peak forces, and those differences grew at higher energy.

The target can change both the result and the comparison between gloves. [Perkins et al. (2018)](https://doi.org/10.4236/wjet.2018.63037) dropped gloves fitted to a mechanical fist onto a force plate covered by either 25 or 50 mm of EVA75. Target thickness changed peak force, loading rate, contact time, and the relative performance of the gloves. Their force-time curves also retained information that a peak-force limit would discard.

Compression and wear also matter. [Chadli et al. (2018)](https://doi.org/10.1016/j.measurement.2018.07.036) compared new and worn gloves at several impact energies and measured whole-glove compression and energy or acceleration attenuation as well as peak force. [Amauger (2022), chapter 7](https://theses.hal.science/tel-04105395) placed a 1.3 kg steel sphere inside a glove, dropped it onto a load cell, and filmed the deformation. Force and deformation were used to estimate a damping term for a simplified fist-glove model, rather than to make a standardized commercial-glove comparison.

These rigs are useful, but their results are not interchangeable. Striker shape, glove mounting, target, impact energy, and recorded measures differ.

#### Foam compression studies

One mathematical form can describe several kinds of foam response. [Alzoubi, Al-Hallaj, and Abu-Ayyad (2014)](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/) fitted the same compression model to HR foam, latex, and four flexible PU foams, with separate parameters for how each specimen built resistance through compression. This provides the concept of a material profile: the curve used to describe one foam grade.

EVA can be handled similarly. [Wu et al. (2023)](https://doi.org/10.3390/polym15234514) fitted a rate-dependent curve to one 35 kg/m³ closed-cell EVA foam. Its shape provides a starting point for estimating profiles for the EVA grades under consideration, although those estimates are limited by the number and quality of supplier compression points. The published specimens were different products, and their test rates were below boxing-impact rates. [Chen et al. (2024)](https://doi.org/10.3390/polym16010034) supports the broader finding that EVA density and loading rate matter, but its fitted curves are not used for these grades.

#### Human-punch studies

Human studies provide plausible impact masses and speeds. ([Walilko et al. (2005)](https://pubmed.ncbi.nlm.nih.gov/16183766/); [Adamec et al. (2021)](https://pubmed.ncbi.nlm.nih.gov/33057792/)) They do not isolate the glove because the boxer, hand and wrist, glove, target, and sensors all influence the measured response.

Together, these studies show that glove response can be measured and foam curves can be modeled. They do not connect a disclosed foam stack to its complete impact response or perceived feel.

### How far this evidence answers our questions

The literature supplies useful test methods and starting shapes for foam curves, but not measured curves for the exact foams under consideration. The model can compare changes in a stack under common assumptions; it cannot establish the performance or feel of a real glove.

The main validation should be a physical test of a known stack at several impact energies. Measured and predicted force-time and compression histories should first be compared without tuning the model to match them. Until that comparison succeeds, the model remains a screening tool that makes testable predictions and cannot substitute for a glove test.

## Mathematical model

### 1. Model setup and scope

#### Mechanical setup

The model represents a punch pressing glove foam into a fixed plate covered with foam. The punch travels horizontally, so gravity is omitted. Its two incoming properties are speed and striking mass, which the research literature calls effective mass. The punch receives no additional push after first contact.

![The modeled impact path from the moving mass through the hand spring, rigid dome, glove foam, and target foam to the fixed plate.](../diagrams/system-overview.svg)

#### Why use a rigid dome

The dome represents the rounded front of the fist inside the glove. Its centre touches first, and more foam enters contact as the dome presses farther inward. The dome retains its shape and does not squash, tilt, or rotate. Every stack therefore sees the same growing contact area while the centre and edges can compress by different amounts.

This simplification omits individual knuckles, uneven fist shapes, local hand deformation, and off-centre contact. The hand spring adds overall hand and wrist give but does not reproduce these local effects.

#### Basis for the setup

The foam-covered plate follows the broad arrangement used by [Perkins et al. (2018)](https://doi.org/10.4236/wjet.2018.63037), and the dome shape comes from the [SATRA summary of EN 13277](https://www.satra.com/spotlight/article.php?id=423). Punch mass and speed come from [Walilko et al. (2005)](https://pubmed.ncbi.nlm.nih.gov/16183766/) and [Adamec et al. (2021)](https://pubmed.ncbi.nlm.nih.gov/33057792/). The hand spring is a model assumption.

#### Required inputs

The required inputs are striking mass and speed; dome size and shape; thickness and compression curve for every glove layer and the target foam; and hand-spring stiffness.

#### Required outputs

The calculation produces force through the loading phase, movement and work in the glove, target, and hand spring, and summary measures derived from those histories.

#### Current scope

Its current scope is to compare stacks under the same punch, geometry, and target through one loading phase, from first contact to maximum compression. It compares mechanical response rather than injury or subjective feel.

### 2. How the parts behave

#### Striker

The striker is the moving mass that represents the part of the boxer contributing to the punch. After first contact, contact force is the only force slowing it.

#### Hand and wrist

A massless spring between the mass and the rigid dome carries the total contact force and represents overall hand and wrist give.

#### Foam stack

Each foam layer has a starting thickness and a pressure-versus-compression curve. At any one location, every layer carries the same pressure but can compress by a different amount, and the layer shortenings add. A typical curve contains an initial response, a main region of compression travel, and a steep rise as easy travel runs out.

#### Target

The fixed plate does not move. Its foam cover compresses in series with the glove and contributes to the force response.

### 3. How the foam curves are built

Supplier data usually provide only one or two compression values, while the model needs pressure at every compression level reached during impact. The available supplier data are first converted to a common pressure-versus-strain scale. Published family curves then estimate the missing response. This supports consistent comparison between grades, although the resulting curves remain estimates until the materials are tested under common conditions.

The family shapes come from [Alzoubi et al.](https://oiccpress.com/jsm/article/download/12454/14012/38722) for PU and latex and [Wu et al.](https://doi.org/10.3390/polym15234514) for EVA. PU and latex indentation loads are converted to average pressure. EVA data already report compression pressure, so the source tests remain different. One chosen loading curve represents the brief impact and does not change with compression rate during the calculation.

### 4. Calculation in plain English

The calculation begins by setting the punch, dome, foam, target, and hand-spring inputs. The dome then moves a small distance toward the plate. Its shape determines which locations are in contact and how far the foam must shorten at each location. The compression curves give local pressure, and local pressure is integrated over the contact area to obtain total force. Total force determines hand-spring compression and total striker movement. From these values, the model calculates compression work, remaining speed, and elapsed time. The process continues until the striker reaches zero speed.

### 5. Equations and interpretation

#### The incoming punch

Let $m$ be striking mass in kg and $v_0$ be speed at first contact in m/s. Together they set the starting kinetic energy $E_0$, in J:

$$
E_0=\frac{1}{2}mv_0^2
$$

Mass changes energy proportionally, while speed is squared, so doubling speed gives four times the starting energy. This energy sets how much compression work the system must take on before the striker stops.

#### Foam response

For any foam, compression strain $\varepsilon$ is the fraction of its starting thickness that has been compressed. Its loading curve $\sigma$ gives pressure $p$, in Pa, at that strain:

$$
p=\sigma(\varepsilon)
$$

A steep section means that a small additional compression requires a large pressure increase. Every glove layer and the target foam has its own curve. The calculation also uses the relationship in reverse to find strain at a specified pressure.

#### Dome contact

The dome is circularly symmetric. Distance $r$, in m, is measured from its centre. Its spherical curvature radius is $R$, in m, and its face ends at footprint radius $a$, in m, where $0<a<R$. Let $q$ be the dome's central advance into the glove and target foam, in m. At radius $r$, the dome surface begins a distance $b(r)$, in m, behind its tip:

$$
b(r)=R-\sqrt{R^2-r^2},\qquad 0\leq r\leq a
$$

The gap is zero at the centre and largest at the face edge. The geometry therefore requires local stack shortening $c(r)$, in m:

![Cross-section of the rigid dome pressing into glove and target foam, showing central movement and local stack shortening.](../diagrams/dome-contact.svg)

The bracket in the cross-section shows the contact footprint. In the full model, it is the circular area $A(q)$ around the centreline.

$$
c(r)=\max\left[0,q-b(r)\right]
$$

A location carries no load while $b(r)>q$. Once $q$ exceeds that gap, the dome contacts the foam and begins to compress the local stack. Increasing $q$ compresses the centre farther and brings more of the dome footprint into contact. Contact is restricted to $0\leq r\leq a$ where $q>b(r)$, and the contact area cannot exceed $\pi a^2$. Once $q=b(a)$, the full face is in contact and further advance increases compression without enlarging the footprint.

#### How the layers share local compression

Index $i$ covers every glove layer and the target foam, and $h_i$, in m, is the starting thickness of layer $i$. At radius $r$, all layers carry the same local pressure $p(r)$. The shortening of layer $i$ is $h_i\varepsilon_i\!\left[p(r)\right]$, so the layer shortenings must add to the local stack shortening:

$$
c(r)=\sum_i h_i\varepsilon_i\!\left[p(r)\right]
$$

Pressure determines how the required shortening is divided: softer layers use more of it, and firmer layers use less. For a fixed $q$, the model solves this equation for $p(r)$ at every radius to obtain the pressure distribution.

Layer order has no effect when the materials and thicknesses remain the same. The model therefore treats a soft-inside, firm-outside stack as identical to the reverse arrangement and cannot determine which ordering performs better.

#### From local pressure to total force

At each value of $q$, the local calculation gives pressure $p(r)$ across $A(q)$. Total force $F$, in N, is the integral of pressure over that area:

$$
F(q)=\int_{A(q)}p(r)\,\mathrm{d}A
=2\pi\int_0^a p(r)r\,\mathrm{d}r
$$

Here, $\mathrm{d}A$ is an element of contact area, and $p(r)\,\mathrm{d}A$ is its contribution to force. The radial form adds circular rings of area $2\pi r\,\mathrm{d}r$ in the plane of the target. Pressure is zero outside contact. Force can therefore rise through increasing pressure, growing contact area, or both.

#### Hand and wrist give

Hand-spring stiffness $k_h$, in N/m, is an input. The linear spring carries total force $F$, so its compression $q^{\mathrm{HAND}}$, in m, is:

$$
q^{\mathrm{HAND}}=\frac{F}{k_h}
$$

At a given force, a stiffer spring moves less. Stored spring energy $U_h$, in J, is the work required to compress the spring from zero to $q^{\mathrm{HAND}}$. Because force rises linearly from zero to $F$, that work is the triangular area under the force-movement line:

$$
U_h=\frac{1}{2}Fq^{\mathrm{HAND}}
$$

The force sets spring compression, which sets stored energy. As the foam becomes harder to compress, more stopping movement and energy can shift into the hand spring. The spring adds travel but does not impose a force limit.

#### Where the movement occurs

Dome movement $q$ includes shortening of the glove and target foam. The hand spring behind the dome compresses by the additional distance $q^{\mathrm{HAND}}$. Striking-mass movement $q^{\mathrm{MASS}}$, in m, includes both:

$$
q^{\mathrm{MASS}}=q+q^{\mathrm{HAND}}
$$

#### Work, speed, and time

Compressing the foam takes work. For each layer, the model integrates that work across the contact area, where pressure and shortening vary. Accumulated work $W(q)$, in J, combines glove compression work $U_{\mathrm{glove}}$, target compression work $U_{\mathrm{target}}$, and stored spring energy $U_h$:

$$
W(q)=U_{\mathrm{glove}}(q)+U_{\mathrm{target}}(q)+U_h(q)
$$

The work comes from starting kinetic energy $E_0$, leaving $E_0-W(q)$ for motion. Solving the kinetic-energy relation for striking-mass speed $v(q)$, in m/s, gives:

$$
v(q)=\sqrt{\frac{2\left[E_0-W(q)\right]}{m}}
$$

The mass slows as compression work grows and stops when the work equals the starting energy. Elapsed time $t$, in s, follows from distance divided by speed. For a small advance $\mathrm{d}q^{\mathrm{MASS}}$:

$$
\mathrm{d}t=\frac{\mathrm{d}q^{\mathrm{MASS}}}{v(q)}
$$

Adding these increments assigns a time to each dome position, so work and speed can also be expressed as $W(t)$ and $v(t)$. With common geometry, curves, target, and hand spring, punches with equal starting energy reach the same maximum compression and peak force. Their timing can differ because a heavier, slower punch takes longer to reach maximum compression than a lighter, faster punch with the same energy.

#### Where the calculation starts and stops

The calculation starts at first contact with $t=0$, incoming speed $v_0$, uncompressed foam and hand spring, $q=0$, and $W(q)=0$. As the dome advances, compression work grows and the mass slows. Loading ends when $W(q)=E_0$ and $v(q)=0$. Compression is then at its maximum. Because the chosen curves increase with compression, this point also gives peak force. Unloading and rebound are outside the model.

If the numerical material range ends while the striker is moving, the result is incomplete. The model reports the force, speed, and time reached, while maximum compression and peak force remain unresolved. Section 7 distinguishes this numerical boundary from the assumed physical compression limit.

### 6. Building and anchoring the foam curves

#### Slow tests and fast impacts

Foam can resist more when compressed quickly because its structure has less time to relax and trapped air has less time to escape. Each material therefore has a slow curve that connects reference tests to supplier firmness values and a fast curve for impact loading. The slow curve is fitted to supplier anchors, and the same pressure adjustment is then applied to the fast version of the reference equation. The supplier points constrain only the slow curve. The borrowed model supplies the increase under rapid loading, which needs separate review, especially for PU and latex. One fixed fast curve is used throughout loading even as the striker slows.

##### What the source papers mean by loading rate

Strain rate is the fraction of starting thickness compressed per second, in $\mathrm{s}^{-1}$, rather than incoming fist speed in m/s. [Alzoubi et al., Section 4 and table 3](https://www.researchgate.net/publication/266854162_Modeling_of_Compression_Curves_of_Elexible_Polyurethane_Foam_with_Variable_Density_Chemical_Formulations_and_Strain_Rates) describe quasi-static tests at about $0.0333\,\mathrm{s}^{-1}$ and 25 °C through 70% compression. These tests supply the PU and latex coefficients. At that constant rate, 50% compression takes about 15 s. [Wu et al.](https://pubmed.ncbi.nlm.nih.gov/38231925/) tested EVA at $0.0017$, $0.033$, and $0.17\,\mathrm{s}^{-1}$ with constant compression speed. They related greater resistance to a declining ratio of air leakage to compression rate. Even their fastest test took about 3 s to reach 50% compression. The fast curves used here are limiting cases of the borrowed equations, not measurements of the selected retail foams at punch-like rates.

#### Start with a family curve

A family curve supplies the response between the few points provided by a supplier. Its coefficients come from a published reference specimen and remain fixed for each reference fit. Manufacturer data anchor the pressure scale afterward. Reference pressure is written $s(\varepsilon)$, in Pa, to distinguish it from the calibrated grade curve $\sigma(\varepsilon)$. All pressure coefficients below are in Pa.

##### PU and latex

The PU and latex curve combines resistance that can relax during slow compression, a linear contribution, and a steep rise at large strain. The values follow [Alzoubi et al., equation 23 and table 3](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/). PU55, HR40, and Latex85 identify specimens with densities of 55, 40, and 85 kg/m³. The final row is the reference test rate.

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
  {\eta\dot{\varepsilon}}\right)\right] \quad+k^{\mathrm{BASE}}\varepsilon
  +k^{\mathrm{RISE}}\varepsilon\left(e^\varepsilon-1\right)^n
\end{aligned}
$$

Faster compression leaves less time for the first contribution to relax. The other terms depend only on compression. In the proposed fast curve, the first term becomes $k^{\mathrm{RELAX}}\varepsilon$, representing no time for relaxation, while the other terms are unchanged.

##### EVA

The EVA curve combines a response that levels off with increasing resistance from air compressed inside the foam. The values follow [Wu et al., equation 16 and table 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/) for their 35 kg/m³ EVA specimen at $0.0017\,\mathrm{s}^{-1}$.

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

The first term approaches the plateau pressure. The air contribution grows with strain, and a smaller leakage ratio makes it larger. The proposed fast curve assumes that no air escapes, setting $\lambda=0$ while leaving the first term unchanged.

#### Why we use the fast curve

Rapid loading is appropriate for a punch, but the fast limits remain working approximations. For PU and latex, the loading duration can be compared with the reference model's characteristic relaxation time $\tau$, in s:

$$
\tau=\frac{\eta}{k^{\mathrm{RELAX}}}
$$

[Alzoubi et al., Section 5.2 and table 3](https://www.researchgate.net/publication/266854162_Modeling_of_Compression_Curves_of_Elexible_Polyurethane_Foam_with_Variable_Density_Chemical_Formulations_and_Strain_Rates) report this ratio as a characteristic time. The coefficients above give:

| Reference foam | Characteristic relaxation time |
| --- | --- |
| PU55 | About 1,455 ms |
| HR40 | About 108 ms |
| Latex85 | 90 ms |

When loading is much shorter than these times, the relaxing contribution stays near its fast limit, $k^{\mathrm{RELAX}}\varepsilon$. The study foam's relaxation time is applied to the selected grade, although supplier anchors do not show whether that time or the fast stiffness describes the purchased material. The EVA fit supplies no comparable air-leakage timescale, so setting leakage to zero has less support from this timing argument. Slow supplier measurements cannot confirm the amount by which resistance increases under impact loading.

#### What comes from the manufacturer

| Supplier input | Use in this model |
| --- | --- |
| IFD/ILD force or compression pressure at a stated compression percentage | Sets the first pressure anchor |
| Up to two additional values at stated compression percentages | Set further anchors when available |
| Foam density | Used for the compression limit in Section 7; it does not set firmness by itself |
| Available sheet thicknesses | Guide layer-thickness choices; thickness sets how much a layer shortens at a given strain |

These anchors set the pressure scale. They do not identify the reference curve's stiffness, relaxation, or air-leakage coefficients. Reference-fit selection and the rapid-loading approximation remain model choices.

#### Put the supplier anchors on the same scale

##### When the supplier gives a force

Each anchor must state how much pressure produces a given strain. PU and latex firmness is often reported as IFD or ILD, the force needed to indent a sample by a stated percentage of its thickness. For example, [HD36-HQ](https://canada.foambymail.com/hd36-hq-foam-sheet.html) lists 35 lbf at 25% compression, or about 155.7 N. Dividing by the 50 in² tool area, equivalent to 0.032258 m², described by the [PFA guide, page 2](https://pfa.org/wp-content/uploads/2022/05/InTouchv4.2new.pdf), gives:

$$
\text{Average pressure}
=\frac{155.7\,\mathrm{N}}{0.032258\,\mathrm{m}^{2}}
\approx4.83\,\mathrm{kPa}
$$

The resulting anchor is 4.83 kPa at 25% strain. A 50 in² tool is assumed for PU and latex unless the supplier states otherwise; it is the supplier's tool rather than the model dome.

##### When the supplier gives a pressure

EVA data already provide pressure at stated compression.

##### What this lets us compare

The conversion gives every supplier value the same pressure-at-strain form, but differences in test method, sample thickness, and support from surrounding foam remain.

#### Fit the curve to the supplier points

All available supplier measurements are used to estimate an overall pressure scale and a skew that changes how the multiplier grows with compression. Study coefficients and the compression axis remain fixed, giving a smooth two-parameter adjustment without joins. Any mismatch at an observed point shows how well this adjustment describes the data.

##### Define the curve and the observations

Let $s^{\mathrm{SLOW}}(\varepsilon)$ be the slow study pressure and $\sigma^{\mathrm{SLOW}}(\varepsilon)$ the fitted pressure, both in Pa. The study settings are $\dot{\varepsilon}=0.0333\,\mathrm{s}^{-1}$ for PU and latex and $\lambda=0.19308$ for EVA. Pressure scale $a>0$ and skew $b$ are dimensionless. Before the high-compression tail begins:

$$
\sigma^{\mathrm{SLOW}}(\varepsilon)
=a\,e^{b\varepsilon}\,s^{\mathrm{SLOW}}(\varepsilon)
$$

When $b=0$, the multiplier is constant. Positive $b$ increases it with compression, and negative $b$ decreases it. For $n$ supplier observations, observation $i$ supplies pressure $p_i>0$ in Pa at dimensionless strain $\varepsilon_i>0$, where the study pressure must also be positive. A support factor supplies a deeper pressure divided by the pressure at 25% compression and is used to calculate the deeper observation, although that value is not independent. Supplier ranges and minimum values must remain identified as such; selecting one pressure from them is a model choice. The zero-pressure origin is excluded because its ratio and logarithm are undefined.

##### Estimate scale and skew from all points

At each observed strain, the ratio of supplier pressure to study pressure gives the requested multiplier. Define its natural logarithm as $y_i$, and let $\alpha=\ln a$:

$$
y_i=\ln\!\left[\frac{p_i}{s^{\mathrm{SLOW}}(\varepsilon_i)}\right],
\qquad
y_i\approx\alpha+b\varepsilon_i
$$

Ordinary least squares estimates $\alpha$ and $b$ in log space with equal weight for every observation, after which $a=e^\alpha$. With only one distinct observed strain, scale and skew cannot be separated, so $b=0$ and scale alone is fitted. Two distinct observations can be matched exactly when physical constraints allow, while additional points generally leave residuals.

##### Constrain and assess the fit

Pressure must remain nondecreasing throughout the fitted range before the tail:

$$
\frac{d s^{\mathrm{SLOW}}(\varepsilon)}{d\varepsilon}
+b\,s^{\mathrm{SLOW}}(\varepsilon)\geq0
$$

If the unconstrained fit violates this condition, it is refitted by least squares in log space subject to the constraint. The same check applies to the adjusted fast curve, and both curves require a strictly positive slope at the tail join. The interval between observations and the extrapolated region are checked as well as the observed strains. Supplier pressure, fitted pressure, and percentage difference should be reported at each observation. Agreement with data used in the fit is not independent validation, and the adjusted shape outside the measured range remains an assumption.

##### Example: fitting and checking VA35

[Wu et al., sections 2.1-2.2](https://www.mdpi.com/2073-4360/15/23/4514) tested commercial Jiexin EVA with an average density of 35 kg/m³. Their 30 mm sample compressed at 3 mm per minute, taking five minutes to reach half thickness and giving a slow-loading baseline near $0.0017\,\mathrm{s}^{-1}$. [Evazote VA35](https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A039-Evazote-VA35.pdf), at the same nominal density, reports 52 kPa at 25% compression and 118 kPa at 50%.

Scale alone can first be fitted to the 25% value with zero skew, leaving the 50% value as a check. The study curve gives about 40.15 kPa and 94.66 kPa at these strains:

$$
\sigma^{\mathrm{SLOW}}(0.50)
\approx52\times\frac{94.66}{40.15}\,\mathrm{kPa}
\approx122.6\,\mathrm{kPa}
$$

![The EVA35 study curve anchored to VA35 at 25% compression, shown over 0-100% and clipped at 1,500 kPa. Shading beyond 80% marks extrapolation. At 50%, the prediction is 122.6 kPa; the supplier value of 118 kPa was kept out of the fit.](../diagrams/foam-curve-anchors.svg)

The prediction is about 4% above the unused supplier value, supporting pressure growth between these two points for this grade. Matching density does not establish identical foams, and the supplier sheet does not state test speed. The check does not establish the full curve or impact behavior. The final fit uses both supplier values to estimate scale and skew subject to the slope constraints. Because the second point requests a smaller multiplier, the unconstrained skew is negative. Once both values enter the fit, neither is an independent check.

#### Carry the anchors into the impact curve

The scale $a$ and skew $b$ estimated from slow supplier observations are applied to the fast study pressure $s^{\mathrm{FAST}}(\varepsilon)$. Before the tail:

$$
\sigma^{\mathrm{SLOW}}(\varepsilon)
=a\,e^{b\varepsilon}\,s^{\mathrm{SLOW}}(\varepsilon),
\qquad
\sigma^{\mathrm{FAST}}(\varepsilon)
=a\,e^{b\varepsilon}\,s^{\mathrm{FAST}}(\varepsilon)
$$

Using the same adjustment preserves the study's fast-to-slow pressure ratio at each positive strain. The fast curve normally lies above the supplier points because they describe slow loading. The size of the increase comes from the study equations. Its applicability to a selected foam during a punch, and the use of the same scale and skew in both conditions, remain assumptions.

#### How much confidence this gives us

The method produces complete loading curves from sparse measurements. The VA35 check supports the curve only between its two measured points. Rapid-loading resistance can alter which stack performs better and still needs direct measurement.

### 7. How we handle the high-compression tail

Foam becomes harder to compress as its internal spaces close, a steep rise known as densification. Because a punch can exceed the measured range, the model must specify how each curve continues.

#### Where the measurements end

Supplier points usually end at 50% compression for EVA or 65% for PU and latex. The underlying studies reach about [70% for PU and latex](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/) and [80% for EVA](https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/). Between the supplier points and the end of the study range, the adjusted study shape is assumed to describe the selected foam. Beyond the study range, a steep tail is added.

#### What we assume

Beyond the study range, the model adds a steep tail. Density estimates how far the foam can compress before its internal space closes, assuming that the foam cannot spread sideways and that its solid material retains its volume. The tail joins the adjusted study curve smoothly and rises toward that estimated limit. Density does not determine the rise's steepness, and this part of the curve has no supporting measurements.

#### Set the compression limit

Let $\rho^{\mathrm{FOAM}}$ and $\rho^{\mathrm{SOLID}}$ be foam and solid density in $\mathrm{kg/m^3}$. The limiting strain $\varepsilon^{\mathrm{CAP}}$ is the fraction of starting thickness compressed when the estimated internal space closes:

$$
\varepsilon^{\mathrm{CAP}}
=1-\frac{\rho^{\mathrm{FOAM}}}{\rho^{\mathrm{SOLID}}}
$$

| Family | Solid-material density used | Basis |
| --- | --- | --- |
| PU | $1{,}200\,\mathrm{kg/m^3}$ | Value used by Alzoubi et al., Section 5.3 |
| Latex | $920\,\mathrm{kg/m^3}$ | Assumed value |
| EVA | $950\,\mathrm{kg/m^3}$ | Borrowed from other EVA formulations; assumed for these grades |

For EVA75 at $75\,\mathrm{kg/m^3}$, the limit is about 92.1% compression. This is a volume-based assumption rather than a measured failure point or measured onset of densification.

#### Choose where the tail starts

The adjusted study curve is kept through $\varepsilon^{\mathrm{FIT}}=0.70$ for PU and latex and 0.80 for EVA, unless the estimated cap is too close. At least 0.04 strain is reserved before the cap. Tail-start strain $\varepsilon^{\mathrm{JOIN}}$ and remaining interval $L$ are:

$$
\varepsilon^{\mathrm{JOIN}}
=\min\left[\varepsilon^{\mathrm{FIT}},\varepsilon^{\mathrm{CAP}}-0.04\right],
\qquad L=\varepsilon^{\mathrm{CAP}}-\varepsilon^{\mathrm{JOIN}}
$$

The four-percentage-point margin is a numerical choice without measured physical meaning, and all supplier anchors must lie at or below the join.

#### Make resistance rise smoothly

The tail continues from the same pressure and slope. Let $p^{\mathrm{JOIN}}$ be pressure in Pa and $k^{\mathrm{JOIN}}$ be slope in Pa per unit strain at the join, after applying scale and skew. For the slow or fast study pressure $s(\varepsilon)$:

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

Both curves require $k^{\mathrm{JOIN}}>0$. Skew changes the joining pressure and slope, so the supplier fit also affects the unmeasured tail. With the dimensionless tail exponent $n^{\mathrm{TAIL}}=2$, pressure above the join and below the cap is:

$$
\sigma(\varepsilon)=p^{\mathrm{JOIN}}
+\frac{k^{\mathrm{JOIN}}L}{n^{\mathrm{TAIL}}}
\left[
\left(\frac{L}{\varepsilon^{\mathrm{CAP}}-\varepsilon}\right)^{n^{\mathrm{TAIL}}}-1
\right]
$$

The added pressure and slope match at the join, while pressure grows without bound as strain approaches the cap. A larger exponent would steepen the tail without changing the starting pressure, slope, or cap. The supplier adjustment is applied first. Slow and fast curves then receive separate tails with their own joining pressures and slopes but the same density, join rule, and exponent.

#### Stop if the calculation runs out of curve values

The pressure lookup ends at $1\,\mathrm{GPa}$ local pressure or at an earlier endpoint in any component table. If the striker is still moving, the calculation reports the reached force, speed, and time as incomplete; peak force and maximum compression remain unresolved. This cutoff is numerical, and predictions below it can still depend strongly on the unmeasured tail.

#### What the choice can change

If a layer enters the tail, the assumed shape can change peak force, force buildup, remaining thickness, and potentially the preferred stack. The stability of stack rankings under gentler and steeper tails has not yet been tested.

### 8. Parameters for the worked example

The worked example fixes the punch, striker shape, hand and wrist give, and padded target while glove stacks are compared.

#### The punch

The reference represents a forceful punch by an adult without substantial punching training. [Adamec et al.](https://epub.ub.uni-muenchen.de/76042/1/76042.pdf) studied 50 adults and selected each person's highest-impulse attempt from three. The model uses their dominant-fist group means: a striking mass of 2.597 kg and incoming speed of 7.7 m/s. Striking mass includes the arm's contribution to the impact. Calculating energy from these separate group means gives about 77 J.

#### The dome striker

The dome follows [SATRA's description of the hand-protector test](https://www.satra.com/spotlight/article.php?id=423): an 80 mm wide face with a 100 mm curvature radius.

#### Hand and wrist give

The hand spring allows movement between the effective striking mass and the rigid dome. Without it, the connection is perfectly rigid and all stopping movement must occur in the glove and target. The working stiffness is 1 kN/mm, giving 1 mm of movement per kN of force. This combined hand and wrist stiffness has no direct measurement support.

Its influence is substantial. In the app's adult-punch example with the 40 mm Medium stack and a 25 mm EVA75 target, the spring moved about 7 mm and stored 24 J of the incoming 77 J at peak force, roughly 32% of the stopping work. That example used the thinner target rather than the 50 mm target below. The 7 mm result is modeled movement between the mass and dome, not evidence of 7 mm of local hand compression. The spring carries the same total force as the glove and does not measure force felt by the puncher. It is retained provisionally, and stack comparisons should be tested across plausible stiffness values once measurements can support that range.

#### The padded target

The target follows the padded-force-plate idea in [Perkins et al.](https://www.scirp.org/pdf/wjet_2018072715333666.pdf), who compared glove impacts on 25 and 50 mm of EVA75. The worked example uses the 50 mm condition. The target is a fixed plate whose foam shares compression work with the glove.

Pressure at 25% compression anchors the target curve using the method in Section 6. The [Ultralon EVA75 sheet](https://www.ubuild.co.nz/wp-content/uploads/2022/10/properties-of-low-density-pe-eva-foams-feb-2022.pdf) gives 42-68 kPa at 25% compression and density of 68-82 kg/m³. The model selects the midpoint values, 55 kPa and 75 kg/m³. This profile approximates an EVA75 target; its correspondence to the study mat or to a human body needs separate validation.

#### Proposed values

Lengths are shown in mm for readability and converted to m in the equations.

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

The target follows the same compression equations as the glove layers. Glove grades, layer thicknesses, and total thickness are the comparison variables. Every comparison keeps the reference curves, fast-loading assumptions, and high-compression extension rule fixed so their influence can be reviewed separately.

#### Connect the dome dimensions to contact

Dome curvature radius $R$ sets how rounded the face is, and footprint radius $a$ limits contact spread. A larger curvature radius would make the face flatter.

![Side view of the dome: the face follows a circle with a 100 mm radius and spans 80 mm, with a 40 mm footprint radius. First contact occurs at the tip.](../diagrams/dome-dimensions.svg)

The tip touches first and contact spreads to the face edge as the dome advances. With the proposed dimensions, $b(a)\approx8.35\,\mathrm{mm}$, so the full face is in contact after 8.35 mm of central advance. The footprint then remains fixed. The worked example combines inputs from several sources rather than reproducing one published apparatus.

### 9. What the model reports

Stacks are compared under the same punch, dome, target, and hand spring. Because fast-loading curves, high-compression tails, and hand stiffness can affect both values and rankings, the full force-time and force-versus-glove-compression curves remain alongside summary metrics. All measures cover loading from first contact to stopping time $t^{\mathrm{END}}$, in s, when the striking mass first reaches zero speed.

Endpoint measures require completed loading. An incomplete calculation reports only the reached state; peak force, peak-normalized loading rates, and final work shares remain unresolved. These measures describe force buildup and compression. They do not establish perceived "poppy" or "pillow" feel because rebound is absent.

#### Metrics used for ranking

Peak force and maximum glove compression are used for ranking, with lower values preferred. Force at 5 ms is also ranked, with lower values preferred for soft gloves and higher values preferred for responsive gloves. The two loading rates and glove work share are reported but excluded from ranking.

#### Compare the impact

##### Peak force

Peak force $F_{\max}$, in N, is the highest total contact force during loading:

$$
F_{\max}=\max_{0\leq t\leq t^{\mathrm{END}}}\left[F(t)\right]
$$

Peak force does not describe how quickly the load develops. [SATRA's EN 13277-7 summary](https://www.satra.com/spotlight/article.php?id=423) uses peak-force limits for specified hand-protector tests, but those limits do not apply to the padded-plate example or establish an injury threshold.

##### Force at 5 ms

Early force compares resistance at a common elapsed time from first contact. With $t_5=0.005\,\mathrm{s}$, force at 5 ms $F_5$, in N, is:

$$
F_5=F(t_5)
$$

Under common punch conditions, a lower value indicates a softer early response and a higher value a firmer response. It must be read with peak force and maximum compression. The 5 ms point is a comparison choice and is interpolated between adjacent force-time samples when necessary. If loading stops or the calculation ends before 5 ms, the value is unavailable; peak force is not substituted and the curve is not extended.

##### 10%-to-90% loading rate

This rate describes the main force rise while excluding the first and last 10%. Times $t_{10}$ and $t_{90}$, in s, are the first times satisfying:

$$
F(t_{10})=0.1F_{\max},
\qquad
F(t_{90})=0.9F_{\max}
$$

The loading rate in N/s is:

$$
\text{loading rate}_{10-90}=\frac{0.8F_{\max}}{t_{90}-t_{10}}
$$

At equal peak force, a higher rate indicates faster buildup. Peak force remains necessary for interpretation because a higher peak can itself raise the rate.

##### Peak loading rate over 0.5 ms

The peak 0.5 ms loading rate captures short rises that the 10%-to-90% average can smooth over. For $\Delta t=0.0005\,\mathrm{s}$:

$$
\text{peak loading rate}_{0.5\,\mathrm{ms}}
=\max_{0\leq t\leq t^{\mathrm{END}}-\Delta t}
\left[\frac{F(t+\Delta t)-F(t)}{\Delta t}\right]
$$

A higher value identifies a sharper rise somewhere in the impact. Only complete windows before stopping are included; the measure is unavailable when loading lasts less than 0.5 ms. [Perkins et al., pp. 613-617](https://www.scirp.org/pdf/wjet_2018072715333666.pdf) used 0.5 ms windows advanced every 0.1 ms through contact and found that peak loading rate distinguished gloves with similar peak forces. The model uses the same window duration, although their measured signals contained oscillations that this model omits.

#### Explain the response

Compression and work shares show how the glove, target, and hand spring produce the force response. Their magnitude alone does not rank cushioning quality.

##### Maximum glove compression at the centre

Central shortening of glove layer $i$, written $q_i(t)$ in m, follows from starting thickness and the strain at central pressure $p(0;t)$:

$$
q_i(t)=h_i\varepsilon_i\!\left[p(0;t)\right]
$$

Central glove shortening $q^{\mathrm{GLOVE}}(t)$ adds only the glove layers, and its maximum is $q^{\mathrm{GLOVE}}_{\max}$:

$$
q^{\mathrm{GLOVE}}(t)=\sum_{i\in\mathrm{glove}}q_i(t),
\qquad
q^{\mathrm{GLOVE}}_{\max}
=\max_{0\leq t\leq t^{\mathrm{END}}}\left[q^{\mathrm{GLOVE}}(t)\right]
$$

The result is reported in mm and as a percentage of starting glove thickness. A higher percentage means more central compression and must be interpreted with the force required to use that travel. [Chadli et al.](https://www.sciencedirect.com/science/article/abs/pii/S0263224118306316) found that similar glove compression could accompany different damping, supporting this paired interpretation.

##### Layer compression and remaining thickness at the centre

Central shortening $q_i(t)$ and remaining thickness $h_i-q_i(t)$ identify which layers compress most and which enter the steep part of their curves. In the model, compression rises until the striker stops, so the minimum remaining thickness is:

$$
\text{minimum central thickness of layer }i
=h_i-q_i\!\left(t^{\mathrm{END}}\right)
$$

Remaining thickness is interpreted relative to the layer's starting thickness and curve. [Wu et al., figure 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/) links declining energy-absorption efficiency to densification in EVA35, supporting the layer-by-layer check.

##### Compression work by component

Compression work is energy transferred into a component as it compresses. Work shares divide that energy among glove layers, target foam, and the hand spring. For a foam layer, pressure is integrated over strain at each location, multiplied by starting thickness, and integrated over the contact area. If $\sigma_i(\xi)$ is loading pressure in Pa and $\xi$ is the dimensionless strain variable, local pressure $p(r;t)$ sets current strain $\varepsilon_i[p(r;t)]$. Layer work $U_i(t)$, in J, is:

$$
U_i(t)=h_i\int_{A\left[q(t)\right]}
\left[\int_0^{\varepsilon_i[p(r;t)]}\sigma_i(\xi)\,\mathrm{d}\xi\right]
\mathrm{d}A
$$

The inner integral is work per starting volume. Thickness and area convert it to total layer work while retaining the varying compression beneath the dome. Glove-layer work is summed for the glove total. Target work uses the same equation, while hand-spring work is $U_h$.

For component $j$, work at stopping and its percentage of starting energy are:

$$
\text{component work}_j=U_j\!\left(t^{\mathrm{END}}\right),
\qquad
\text{work share}_j
=100\,\frac{U_j\!\left(t^{\mathrm{END}}\right)}{E_0}
$$

Because the target is fixed, no extra push follows contact, and all initial kinetic energy becomes compression work at stopping, the shares sum to 100%. A larger glove share means that more work went into glove compression and less into the target and hand spring. The split depends on target and hand stiffness as well as the glove. Loading work includes energy that could return during rebound and therefore does not measure permanent energy absorption. [Perkins et al.](https://www.scirp.org/pdf/wjet_2018072715333666.pdf) found that target thickness changed peak force and glove comparisons, motivating separate component work here.

### 10. What the model can and cannot tell us

#### What it can compare

The model can compare grades and layer thicknesses under one prescribed impact, describe force buildup and compression, divide stopping work between components, and connect those outcomes to selected curves and mechanics. Its accuracy for real gloves remains unestablished.

#### What it leaves out

Several simplifications bound that use. Reversing layer order has no effect. Each foam uses a fixed fast curve rather than responding to the changing compression rate. The dome remains rigid and moves in one direction against a fixed padded plate. Foam columns compress independently, with sideways deformation and the mass of foam and cover omitted. Hand and wrist give is a massless, linear, elastic spring with assumed stiffness. The calculation stops at maximum compression and therefore contains no rebound, damage, repeated-impact response, or established measure of perceived feel.

#### Evidence status

Predictions remain theoretical comparisons under the stated assumptions because they have not been checked against impact measurements of the selected retail foams or complete gloves.

### 11. Assumptions that could change a stack comparison

Three uncertain choices can alter rankings. First, the borrowed fast curves determine how much firmer a foam becomes under rapid loading; changing that increase can change which stack produces lower force. Second, curves that match the same supplier points can rise differently beyond those points, so the assumed tail can determine peak force and remaining thickness when a layer reaches high compression. Third, hand and target compliance determine how much stopping movement and work the glove must accept.

Holding these choices fixed makes comparisons internally consistent. If plausible alternatives reverse a preference, that preference remains unresolved. Agreement across tested alternatives would show stability only within that set, not accuracy for real gloves.

### 12. Adapting the model to published test setups

Published apparatus conditions can be applied to a chosen stack, although unknown foam properties prevent direct reproduction of published-glove results. Setup-specific quantities use descriptive superscripts, such as $m^{\mathrm{SATRA}}$.

#### Represent a drop as a horizontal impact

A drop calculation begins at first contact with the same moving mass, contact speed, geometry, and target. Measured contact speed is preferred. Otherwise, incoming speed $v_0^{\mathrm{DROP}}$, in m/s, follows from drop height $H^{\mathrm{DROP}}$, in m, or contact energy $E_0^{\mathrm{DROP}}$, in J. Moving mass $m^{\mathrm{DROP}}$ is in kg and $g=9.81\,\mathrm{m/s^2}$:

$$
v_0^{\mathrm{DROP}}
=\sqrt{2gH^{\mathrm{DROP}}}
=\sqrt{\frac{2E_0^{\mathrm{DROP}}}{m^{\mathrm{DROP}}}}
$$

The height relation assumes release from rest with negligible losses. Mass must be matched along with energy because it affects timing. The hand spring is removed by setting $q^{\mathrm{HAND}}=0$, $U_h=0$, and $q^{\mathrm{MASS}}=q$, representing a rigid connection rather than zero spring stiffness.

The simplest approximation uses the horizontal equations and neglects gravity during compression. Retaining gravity adds the constant forward force $m^{\mathrm{DROP}}g$ and work $m^{\mathrm{DROP}}gq$, giving:

$$
v^{\mathrm{DROP}}(q)
=\sqrt{\frac{2\left[E_0^{\mathrm{DROP}}
+m^{\mathrm{DROP}}gq-W(q)\right]}{m^{\mathrm{DROP}}}}
$$

Stopping occurs when $W(q)=E_0^{\mathrm{DROP}}+m^{\mathrm{DROP}}gq$. Work shares are then calculated against total supplied energy at stopping. The chosen treatment must be stated. Gravity adds about 0.49 J over 20 mm for a 2.5 kg striker, which can matter in a 3 J test.

#### SATRA: a force-limit check

##### What we want to learn

The proposed question is whether the stack keeps transmitted peak force at or below 2 kN. [SATRA's summary](https://www.satra.com/spotlight/article.php?id=423) specifies 3 J impacts for Class A and B protectors and 10 J impacts for the increased-protection zone of Class B, with the same limit. A separate peak and below-or-above result is needed for each energy after the anvil-force measurement is represented. Until then, the verdict remains unresolved, and the calculations cannot establish whole-glove compliance.

##### Punch

The punch uses a rigid connection and the drop treatment above. Its inputs are:

| Punch input | Parameter or variable | SATRA value |
| --- | --- | --- |
| Moving mass | $m^{\mathrm{SATRA}}$ | 2.5 kg |
| Contact energy | $E_0^{\mathrm{SATRA}}$ | 3 or 10 J |
| Calculated incoming speed | $v_0^{\mathrm{SATRA}}$ | 1.55 or 2.83 m/s, respectively |
| Dome curvature radius | $R^{\mathrm{SATRA}}$ | 100 mm |
| Maximum footprint radius | $a^{\mathrm{SATRA}}$ | 40 mm |

##### Target

The padded plate is replaced by a bare rigid half-cylinder of radius $R^{\mathrm{SATRA,TARGET}}=45\,\mathrm{mm}$, target foam is removed, and all compression work occurs in the glove:

$$
W^{\mathrm{SATRA}}(q)=U_{\mathrm{glove}}^{\mathrm{SATRA}}(q)
$$

Because the cylinder curves in one direction, circular rings are replaced by a two-dimensional footprint. Positions $x$ and $y$ are in m. Initial gap $b^{\mathrm{SATRA}}(x,y)$ is determined by dome and glove shape, and local shortening is:

$$
c^{\mathrm{SATRA}}(x,y)
=\max\left[0,q-b^{\mathrm{SATRA}}(x,y)\right]
$$

The existing layer-sharing rule applies using local starting thicknesses. Integrating pressure $p^{\mathrm{SATRA}}(x,y)$, in Pa, over projected contact area $A^{\mathrm{SATRA}}(q)$, in $\mathrm{m^2}$, gives force in N:

$$
F^{\mathrm{SATRA}}(q)
=\int_{A^{\mathrm{SATRA}}(q)}p^{\mathrm{SATRA}}(x,y)\,\mathrm{d}A
$$

The way foam sits around the support still needs definition because it sets local gap and thickness. The [curved-support approximation](../legacy/METHODOLOGY.md#curved-contact-geometry-bag-and-satra-reference) is a starting point. The test senses force through a central anvil, while the equation gives total contact force. Applying the 2 kN limit therefore requires the anvil footprint and load sharing with its surrounding support. Conditioning and the full impact sequence also remain outside the model.

#### Perkins: compare response across impacts and targets

##### What we want to learn

The Perkins adaptation asks whether one stack reduces peak force or slows buildup, and whether that advantage persists across impact speed and target padding. [Perkins et al.](https://www.scirp.org/pdf/wjet_2018072715333666.pdf) found that thicker padding reduced peak force and peak loading rate and changed relative glove performance. Each speed should therefore report peak force and peak 0.5 ms loading rate on both targets while retaining the force histories. There is no pass-or-fail threshold.

##### Punch

The study used a 3.046 kg mechanical fist and a 0.278 kg glove, for total moving mass $m^{\mathrm{PERKINS}}=3.324\,\mathrm{kg}$. Drops ran from 2.5 to 5.0 m in 0.5 m steps. Incoming speed $v_0^{\mathrm{PERKINS}}$ should come from measurements or the drop relation, with a rigid connection. Moving mass remains fixed across stack comparisons, and the dome is an assumed approximation of the mechanical fist until its contact profile is known.

##### Target

The target is the fixed EVA75-covered plate with $h^{\mathrm{PERKINS,TARGET}}=25$ or $50\,\mathrm{mm}$. Only target thickness changes between conditions; the baseline layer-sharing and force equations remain. The estimated EVA75 curve has not been validated against the study mat. Modeling full contact duration and rebound would require unloading behavior, while reproducing pneumatic gloves would also require air or bladder mechanics.

## Analysis

### 1. Simulation run

The simulation asked whether the same glove thickness and foam-weight budget could provide similar peak-force protection with either a soft or responsive force curve. A 50 mm stack served as a plausible reference depth for a well-padded training glove; published and commercial examples placed strike-area depths between about 35 and 50 mm. Fixing thickness held available compression travel constant in the first comparison.

The impact was fixed at 2.597 kg and 7.7 m/s, about 77 J, against 50 mm CutFoam EVA75. This represented one forceful adult reference punch. Common punch, target, dome, hand spring, and material assumptions isolated differences between foam constructions.

The analysis covered 2,206,920 complete stacks. Each contained four distinct foam grades within 50 mm. Final recipes were compared inside a 2.50 +/- 0.05 g standardized foam-sample range, representing a hypothetical glove-weight class. After selection, impact energy was varied and all layers were scaled proportionally to test whether the comparison held beyond the original impact and thickness.

Layer order did not affect the model. The labels below describe the tested construction, so a successful "outer" grade supports including that foam rather than placing it on the outside. HR means high-resilience polyurethane; PU means conventional polyurethane.

| Layer | Materials | Thickness |
| --- | --- | --- |
| Outer | PU, HR, or latex | 5, 10, 15, 20, or 25 mm |
| Main cushion | PU, HR, EVA, or latex | Remaining thickness, 15-39 mm |
| Support | EVA | 3, 4, or 5 mm |
| Comfort | PU or HR | 3, 4, or 5 mm |

### 2. Family characteristics

For each layer, the analysis fixed the material family and averaged results across compatible choices in the other three layers. This showed how each family tended to behave in that role across the design space.

HR in the outer layer reduced mean peak force and compression while producing a firmer early response than PU. PU gave a softer start. Latex modestly improved on PU's cushioning results but added weight and remained behind HR. In the main cushion, HR produced the lowest mean peak force and compression and developed resistance earlier than conventional PU. EVA fell between HR and PU on those outcomes but had the greatest mean weight. Latex offered no clear advantage over HR or EVA.

Increasing support-layer EVA firmness produced diminishing gains. Moving from soft to medium EVA captured most of the reduction in mean peak force and compression; firm EVA added weight with little further change and no meaningful increase in early resistance. The comfort layer mattered less than the outer layer or main cushion. HR provided slightly lower mean peak force and compression and slightly greater early resistance than PU at similar weight.

Values below are mean (SD).

#### Outer

| Material | Stacks | Peak force (kN) | Compression (%) | Force at 5 ms (kN) | Sample weight (g) |
| --- | ---: | ---: | ---: | ---: | ---: |
| PU | 1,403,480 | 4.90 (1.01) | 88.0 (10.3) | 0.34 (0.13) | 2.18 (1.26) |
| HR | 706,140 | 3.94 (0.69) | 78.5 (13.3) | 0.47 (0.18) | 2.35 (1.25) |
| Latex | 97,300 | 4.67 (0.93) | 85.6 (10.4) | 0.39 (0.13) | 2.88 (1.28) |

#### Main cushion

| Material | Stacks | Peak force (kN) | Compression (%) | Force at 5 ms (kN) | Sample weight (g) |
| --- | ---: | ---: | ---: | ---: | ---: |
| PU | 1,085,440 | 5.27 (0.85) | 91.8 (5.7) | 0.28 (0.08) | 1.77 (0.42) |
| HR | 558,480 | 3.64 (0.51) | 72.8 (12.9) | 0.54 (0.15) | 2.09 (0.39) |
| EVA | 485,640 | 4.10 (0.63) | 82.6 (10.9) | 0.44 (0.14) | 3.47 (2.12) |
| Latex | 77,360 | 4.77 (0.66) | 87.6 (5.9) | 0.38 (0.07) | 3.08 (0.54) |

#### Support

| Material | Stacks | Peak force (kN) | Compression (%) | Force at 5 ms (kN) | Sample weight (g) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Soft EVA | 1,103,460 | 4.66 (1.06) | 85.6 (12.0) | 0.38 (0.15) | 2.05 (1.29) |
| Medium EVA | 662,076 | 4.53 (0.99) | 84.6 (12.2) | 0.39 (0.16) | 2.35 (1.25) |
| Firm EVA | 441,384 | 4.50 (0.92) | 83.3 (12.2) | 0.39 (0.17) | 2.70 (1.08) |

#### Comfort

| Material | Stacks | Peak force (kN) | Compression (%) | Force at 5 ms (kN) | Sample weight (g) |
| --- | ---: | ---: | ---: | ---: | ---: |
| PU | 1,102,620 | 4.67 (1.04) | 85.2 (11.9) | 0.37 (0.15) | 2.23 (1.26) |
| HR | 1,104,300 | 4.50 (0.99) | 84.5 (12.3) | 0.40 (0.16) | 2.30 (1.27) |

### 3. Responsiveness

Force 5 milliseconds after first contact described how quickly each stack developed resistance. A lower force meant a gentler start, and a higher force meant a firmer early response. The bands were:

| Response | Force at 5 ms (kN) |
| :--- | :--- |
| Soft | Below 0.50 |
| Neutral | 0.50 to below 0.70 |
| Responsive | 0.70 or higher |

![Force at 5 ms by main-cushion family, with soft/neutral/responsive boundaries](../figures/figure2-force_at_5ms_n.png)

The main cushion was the primary determinant of protection and response. With its family fixed and the other layers integrated over, PU produced soft gloves in 98.9% of its stacks and latex in 93.0%. Neither produced a responsive glove. EVA and HR had broader, higher-response distributions. EVA placed 20.9% of its stacks in neutral and 5.9% in responsive; HR placed 37.8% in neutral and 18.3% in responsive.

HR was the stronger base for creating different responses. Relative to EVA, it had lower mean peak force, 3.64 versus 4.10 kN, and lower mean sample weight, 2.09 versus 3.47 g. PU's low early force coincided with the highest mean peak force and compression. In this model it felt soft because it gave way, at the cost of protection. Latex had a similar problem without PU's weight advantage: it produced mostly soft gloves, but mean peak force stayed high and mean sample weight exceeded HR and PU.

### 4. Performance by sample weight

Each 0.5 g band compared stacks of similar weight. The colored regions in the figures show the five outcome quintiles. The blue line marks the lowest peak force or compression and, on the response graph, the softest early response.

Peak-force performance was best around 1.5-3 g. The lightest stacks lacked enough resistance to control the punch. Above 3 g, denser foams raised sample weight within the same 50 mm thickness while peak force began to rise. Because striking mass and speed stayed fixed, incoming energy did not increase with glove weight. In this simulation, heavier stacks beyond that point added weight without adding protection.

![Peak force by sample weight](../figures/figure3-peak_force_n.png)

The compression frontier changed abruptly at 3.5 g. Its minimum rose from 38.7% in the 3.0-3.5 g band to 52.5% in the 3.5-4.0 g band. The peak-force frontier rose at the same point from 2.65 to 2.75 kN. Below 3.5 g, long, firm HR main cushions defined the low-compression edge. Reaching the next weight band at common total thickness required denser EVA in the main cushion, and minimum compression increased sharply.

Peak force measured the greatest transmitted load; compression showed how close the foam came to using all its travel. A useful stack had to limit peak force without compressing nearly flat.

![Compression by sample weight](../figures/figure3-maximum_glove_compression_percent.png)

Weight did not determine response. Around 2.5 g, early force ranged from soft through responsive. Composition, especially the main cushion, determined a stack's position in that range.

![Early response by sample weight](../figures/figure3-force_at_5ms_n.png)

### 5. Protection and early response

Peak force was compared with force at 5 ms across all 2,206,920 stacks before recipe selection. This showed how much initial response could change while peak-force protection stayed near its best value.

![Peak force against force at 5 ms, colored by sample weight](../figures/figure5-peak-force-vs-force-at-5ms.png)

The lowest achievable peak force formed a U-shaped frontier across early response. Its minimum of 2.58 kN occurred at 0.648 kN after 5 ms, within the neutral band. Low peak force remained possible from upper-soft through responsive behavior, allowing initial response to vary around the protective region.

Very soft stacks gave up too much early resistance. Below 0.2 kN at 5 ms, even the best stack reached 4.33 kN peak force. Performance improved steadily toward the neutral band. The frontier then rose again: above 0.85 kN at 5 ms, no stack remained below 3.29 kN peak force, and above 0.9 kN the minimum was 3.52 kN. A highly responsive feel therefore carried a peak-force cost.

Near the 2.5 g target, stacks below the 3.026 kN protection limit covered both profiles used for selection. Soft candidates clustered near the upper edge of their band at 0.475-0.500 kN, while responsive candidates covered 0.700-0.783 kN.

### 6. Soft and responsive recipes

Two recipes combined high modeled protection with different responses while sharing the same 50 mm thickness and foam-weight budget. A standardized sample weight near 2.50 g represented one hypothetical glove-weight class. This point lay near the middle of the 1.5-3 g range with the strongest peak-force results and contained stacks from soft through responsive.

Selection began with all 2,206,920 complete results and retained the 72,202 stacks near 2.50 g. Each outcome received a 0-100 percentile score based on the share of retained stacks it outperformed, with half credit for ties.

| Metric | Weight |
| --- | ---: |
| Peak force | 60% |
| Maximum compression | 20% |
| Force at 5 ms | 20% |

Lower values scored higher for all three metrics. Response was a constraint: force at 5 ms had to stay below 0.5 kN for the soft recipe and reach at least 0.7 kN for the responsive recipe. Within each group, lower force at 5 ms scored higher, so the responsive recipe received no benefit for exceeding its threshold by more than necessary.

Candidates also had to remain below 3.026 kN peak force, matching the original 50 mm soft recipe and establishing the same minimum protection standard. The top-scoring 10% of each group, including ties, defined the recipe families. The highest-scoring member of each family supplied the response-curve example.

#### Soft: compliant PU with a soft HR core

##### Top-scoring soft recipe family

The leading soft recipes separated initial response from protection. They concentrated compliance in 10 mm of conventional PU and a thin Super Soft PU comfort layer. A 33-34 mm HR Soft core occupied most of the thickness and developed resistance later. Changing the outer or support grade had little effect compared with the division between a small compliant portion and a much larger HR core.

The family held mean peak force near 3.0 kN while producing a soft start. Its mean compression of 84.3% left little unused travel at the reference impact, making stronger-punch behavior a necessary later test.

| Metric | Mean |
| --- | ---: |
| Sample weight (g) | 2.47 |
| Peak force (kN) | 3.00 |
| Force at 5 ms (kN) | 0.484 |
| Compression (%) | 84.3 |

##### Selected soft recipe

The highest-scoring stack, used for the response curves, had a sample weight of 2.452 g.

| Layer | Foam | Thickness |
| --- | --- | --- |
| Outer | Foam Factory Lux-HQ | 10 mm |
| Main cushion | FoamOnline HR Soft | 34 mm |
| Support | CutFoam EVA240 | 3 mm |
| Comfort | Foam Factory Super Soft | 3 mm |

![Soft recipe: cumulative remaining layer thickness and force](../figures/table4-pillowy-response-compression-force.png)

At 5 ms, the compliant outer and comfort layers had used most of their travel while the HR core retained most of its thickness. Across the full punch, the core accepted most of the glove's compression work. The thin PU layers created the soft early response, while the HR core provided later resistance.

![Soft recipe: glove work and striking speed](../figures/table4-pillowy-response-work-speed.png)

#### Responsive: firmer HR cushioning throughout

##### Top-scoring responsive recipe family

The leading responsive recipes developed resistance earlier while improving peak force and compression. At essentially the same sample weight as the soft family, mean force at 5 ms rose from 0.484 to 0.738 kN. Mean peak force fell from 3.00 to 2.87 kN, and mean compression fell from 84.3% to 67.3%.

Every leading stack used HR for both the outer and main cushion, together forming about 43 mm of the 50 mm stack. The long cushion converged on moderate HR grades with nearly identical modeled firmness around 229-233 kPa at 25% compression. The responsive family retained 32.7% of its starting thickness at maximum load, more than twice the soft family's 15.7%. Earlier resistance kept the glove from using most of its travel before peak force.

| Metric | Mean |
| --- | ---: |
| Sample weight (g) | 2.51 |
| Peak force (kN) | 2.87 |
| Force at 5 ms (kN) | 0.738 |
| Compression (%) | 67.3 |

##### Selected responsive recipe

The highest-scoring stack used for the response curves had a sample weight of 2.482 g.

| Layer | Foam | Thickness |
| --- | --- | --- |
| Outer | FoamOnline High Resilience - Medium Soft | 25 mm |
| Main cushion | CutFoam HR36-160 | 19 mm |
| Support | Aortha EVA A50 | 3 mm |
| Comfort | FoamOnline HR Very Soft | 3 mm |

![Responsive recipe: cumulative remaining layer thickness and force](../figures/table4-poppy-response-compression-force.png)

The two large HR layers compressed together. At 5 ms, each retained about 81% of its starting thickness while force had reached 0.744 kN. Together they accepted 49.5% of incoming energy over the full punch. The recipe developed resistance early and retained 32.7% of its starting thickness at peak force.

![Responsive recipe: glove work and striking speed](../figures/table4-poppy-response-work-speed.png)

#### Design takeaway

The simulation produced soft and responsive 50 mm recipe families in the same sample-weight class near 2.5 g and under the same peak-force ceiling. Their mean forces at 5 ms were 0.484 and 0.738 kN, respectively, showing that response changed while weight stayed nearly fixed.

Architecture created the separation. The soft family placed 13 mm of compliant PU around a thick HR core, while the responsive family used HR through about 43 mm so resistance developed earlier across most of the stack. The responsive family also had the stronger modeled protection and compression result, with 2.87 kN mean peak force and 67.3% compression. The soft family reached 3.00 kN and 84.3% compression in exchange for a gentler initial response.

Changing score weights altered some grades and thicknesses but retained the same two architectures: compliant PU around an HR core for soft response, and predominantly HR cushioning for responsive behavior.

### 7. Recipe sensitivity to thickness and punch energy

The two recipes were then tested beyond the 50 mm, 77 J selection condition. Every layer was scaled proportionally from 25 to 60 mm, and punch energy ranged from 60 to 120 J. This tested whether each construction retained its protection and response away from the original operating point.

#### Protection depended on the operating range

The Soft construction delayed force buildup by using compression travel early. That behavior lasted only while travel remained. At higher energy the stack effectively bottomed out, meaning that it entered the steep high-compression region rather than reaching a rigid stop. Load arrived later, but the stack could no longer prevent a sharp peak.

![Peak force, compression and early response as punch energy rises](../figures/figure6-energy-response.png)

At 50 mm and 60 J, Soft combined the gentler response with a slightly lower peak force: 0.406 versus 0.624 kN at 5 ms, and 2.29 versus 2.42 kN peak force. Responsive retained much more thickness, with 56.2% compression against 77.5%, but that reserve had not yet improved peak protection.

The protection crossover changed with energy and thickness. At 60 J, Responsive produced lower peak force only at 25-30 mm. At 70 J this advantage extended through 45 mm, and at 80 J through 55 mm. From 90 J onward, Responsive was better at every tested thickness. Additional thickness delayed the Soft design's disadvantage, while stronger impacts progressively erased it.

Responsive could exchange firmness for substantially less thickness and weight. At 120 J, the 35 mm Responsive stack reached 6.16 kN peak force and 88.3% compression. The 50 mm Soft stack reached 6.54 kN and 91.4%, even though it weighed 2.45 g against 1.78 g. The thinner Responsive stack improved protection with 27% less sample weight, while its force at 5 ms was 1.28 kN against 0.726 kN.

Thickness did not add equal reserve to the two architectures. From 25 to 60 mm at 120 J, Soft compression changed only from 93.2% to 90.2%, while Responsive improved from 90.7% to 77.9%. Proportional scaling added more compliant material to Soft without correcting its lack of late-impact resistance. At 50 mm, Soft's last 10 J added about 2.6 times as much peak force as its first 10 J. Once its compliant layers had almost exhausted their travel, additional energy produced a much sharper peak.

#### Each recipe had a response operating range

Early-force shaping remained useful only while the stack could manage the rest of the impact. As Soft approached bottoming out, its force at 5 ms also rose out of the soft band.

![Force at 5 ms across the complete thickness and energy grid](../figures/figure6-force_at_5ms_n.png)

Soft remained relatively softer at every matched thickness and energy but did not stay in the soft band. At 50 mm it was soft at 60-70 J, neutral at 80-110 J, and responsive at 120 J. No tested thickness kept it soft at 100-120 J. Responsive was also condition-dependent. At 50 mm it was neutral at 60 J and entered the responsive band at 70 J. The recipe names therefore describe their relationship near the selection condition rather than permanent material classifications.

#### The design has to match the use case

Soft fit the lower-energy condition when a gentle initial response mattered. Responsive was firmer and carried reserve that was not yet needed, with a small peak-force penalty at thicker configurations. Soft did not scale to high energy by proportional thickening because its compliant layers consumed too much travel. Responsive converted its firmer start into useful reserve and better high-energy protection.

Recipe selection therefore needs a specified impact range, thickness limit, weight budget, and intended response.

The high-energy comparison depends on the assumed high-compression foam response. At 50 mm and 120 J, both cores exceeded their reference-fit range. Those curves need measurement before the modeled separation can be treated as a verified impact limit.

## Conclusion

The model turned scattered supplier values and published foam-family curves into a common basis for comparing complete stacks. It connected estimated material response to layer thickness, glove geometry, and punch conditions. This made it possible to consider early feel, peak force, and remaining compression travel separately instead of treating softness as one property.

### Design implications

The particular foam grade and its compression curve mattered more than the family name alone. Conventional PU was useful where a compliant early response was wanted, but long sections of it consumed travel before the hardest part of the impact. HR PU was the strongest all-around main cushion in this comparison. It built support earlier, retained more thickness, and generally reduced peak force without the weight of dense EVA. EVA worked best as a thin support layer. Increasing its firmness produced diminishing gains, while using dense EVA through the main cushion added weight without improving the best results. Latex also added weight and offered no clear advantage over the tested PU, HR, and EVA choices.

Density, firmness, weight, and protection did not move together. A denser stack was not automatically firmer, and a heavier stack was not automatically more protective or more resistant to bottoming out. The useful balance sat between two failure modes. Too little resistance allowed the foam to use most of its travel early. Too much resistance made force build quickly and eventually increased peak force. Additional thickness helped when it added useful resistance, while simply adding more compliant foam did little once the stack was already operating near its compression limit.

The two selected recipes put that tradeoff into practical terms. The soft recipe used thin compliant PU layers around a thick HR core. It gave a gentler initial response and suited the lower-energy conditions, but it had less reserve as impact energy increased. The responsive recipe used HR through most of the stack. It felt firmer earlier, retained more thickness, and performed better as the impacts became harder. These descriptions depend on the operating condition: neither architecture is permanently soft or responsive at every thickness and punch energy.

Choose the architecture for the intended punch range, available thickness, weight budget, and desired feel. Family labels and a single firmness number are too crude to make that choice. The shape of the resistance curve and the amount of usable compression travel determine what each layer contributes.

### What this exercise is

At heart, this is a back-of-the-envelope engineering exercise with a much bigger envelope. It borrows from foam mechanics, impact biomechanics, and protective-equipment design because the comparison data do not exist in one usable form. It gives a person with a computer and an idea for a glove a reasoned starting point: a foam choice with the assumptions and tradeoffs attached, ready to change when a better option or better information appears.

## References and reading notes

### Standards, rules, and approval references

[SATRA, PPE for use in martial arts](https://www.satra.com/spotlight/article.php?id=423) summarizes EN 13277 controlled impacts and transmitted-force limits for some martial-arts hand protectors. It supplies the 3 J and 10 J pass-or-fail context used here. The standard concerns protection of the wearer's hand rather than the opponent, and its limit is not adopted as the glove design target.

[EN 13277-7:2009 preview, hand and foot protectors](https://cdn.standards.iteh.ai/samples/26354/0e49f762fd014431939bb6888166baf2/SIST-EN-13277-7-2009.pdf) defines the scope, classes, coverage, restraint, and impact-performance framework for martial-arts hand protectors, including boxing. The preview explicitly excludes performance for the opponent. Certification work would require the complete controlled standard.

[World Boxing Competition Rules, November 2024](https://worldboxing.org/wp-content/uploads/2024/11/World-Boxing-Competition-Rules-Nov-2024-Approved.pdf) specifies glove weight, the minimum share assigned to padding, condition, closure, materials, and thumb attachment. These requirements define competition eligibility and construction boundaries without supplying a padding-response curve or layer recipe.

[IBA, Guidelines for the Approval of Boxing Equipment](https://www.iba.sport/wp-content/uploads/2025/09/IBA_Equipment_Guidelines_FV.pdf) describes laboratory testing, field verification, approval, and periodic control at a high level. It helps separate equipment approval from the material data needed to model a foam stack.

### Foam measurements and datasheets

[ISO 2439:2008, indentation hardness of flexible cellular materials](https://www.iso.org/standard/42717.html) defines several indentation-hardness methods, including measurements at 25%, 40%, and 65% indentation and hysteresis-related information. It helps interpret IFD, ILD, and support factor without treating one value as a complete design answer.

[ASTM D3574, flexible urethane foam test methods](https://store.astm.org/d3574-25.html) collects tests used for flexible PU research, quality control, and specification. It helps connect supplier terminology to reported test conditions.

[ISO 3386-1:2025, compression stress-strain characteristics of low-density flexible cellular materials](https://www.iso.org/standard/89164.html) defines a method for measuring compression stress-strain response and provides a reference for what a directly measured curve represents.

[Polyurethane Foam Association, foam performance](https://pfa.org/foam-performance/) gives plain definitions of density, 25% IFD, support factor, and flex fatigue. It is a translation guide for flexible PU supplier language rather than a general description of every foam family.

[Polyurethane Foam Association, foam test methods](https://pfa.org/foam-test-methods/) maps common PU properties to ASTM and other test methods, allowing supplier terms to be traced to the tests that produced them.

[Polyurethane Foam Association, laboratory testing of flexible polyurethane foam](https://pfa.org/wp-content/uploads/2022/05/InTouchv4.2new.pdf) explains IFD and CFD procedures, the nominal 50 in² indentation area, and the effect of specimen thickness. It supports conversion of IFD or ILD force into an average-pressure anchor.

### Foam compression research

[Alzoubi, Al-Hallaj, and Abu-Ayyad (2014), modeling compression curves of flexible polyurethane foam](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/) reports tests and fitted curves for several PU foams and one latex foam at stated densities, temperatures, strain rates, and compression ranges. The shapes seed the PU and latex profiles but do not measure the foams considered for purchase.

[Wu et al. (2023), one-dimensional dynamic constitutive modeling of EVA foam](https://www.mdpi.com/2073-4360/15/23/4514) measures a 35 kg/m³ EVA foam at several compression rates and develops a rate-dependent model. It provides a full curve and a way to represent trapped gas and loading rate, while covering only one formulation and specimen shape.

[Chen et al. (2024), mechanical behavior of closed-cell EVA foam under compression](https://www.mdpi.com/2073-4360/16/1/34) compares EVA foams across densities and compression rates, including energy absorption and densification. It supports the relevance of density and rate, although its samples do not exactly match the grades considered here.

### Punch and glove-impact research

[Walilko, Viano, and Bir (2005), biomechanics of Olympic boxer punches](https://pubmed.ncbi.nlm.nih.gov/16183766/) reports hand speed, effective punch mass, force, energy transfer, and head response for straight punches delivered to a Hybrid III dummy. It supplies context for effective mass and controlled-impact inputs, with a small sample that cannot define every punch.

[Adamec et al. (2021), biomechanical assessment of punching techniques](https://pubmed.ncbi.nlm.nih.gov/33057792/) compares measured mechanics across techniques and provides another source for effective mass, speed, and force. Its values remain specific to its apparatus, protocol, and participants.

[Perkins et al. (2018), prototype boxing gloves under two target-padding conditions](https://doi.org/10.4236/wjet.2018.63037) tests several gloves on a mechanical fist and shows that target padding changes measured peak force and relative glove performance. The rig is repeatable but does not reproduce a boxer or human head.

[Girodet et al. (2009), damping characteristics of nine French boxing gloves](https://doi.org/10.1080/10255840903080885) compares 10, 12, and 14 oz gloves from three manufacturers at 3, 10, and 20 J. Same-weight gloves produced different peak forces, with differences growing at higher energy. The work shows why nominal weight and low-energy passing results cannot stand in for cushioning performance, although it cannot isolate individual layers.

[Chadli et al. (2018), quantification of boxing-glove damping](https://doi.org/10.1016/j.measurement.2018.07.036) uses a rotary impactor to compare six new and worn 10 oz gloves at 4, 18, and 44 J through damping and whole-glove compression measures. It informs energy-range and wear questions, while its aggregate results do not show which internal layer stiffens or approaches densification.

[Amauger (2022), thesis chapter 7](https://theses.hal.science/tel-04105395) places a 1.3 kg steel sphere inside a glove, drops it onto a load cell, and records force and deformation. It demonstrates how those measurements can calibrate a simplified fist-glove model.

[Lee and McGill (2014), striking dynamics of boxing and MMA gloves](https://doi.org/10.18002/rama.v9i2.1175) measures peak force and loading rate across 10,000 repeated impacts and shows that glove response changes with accumulated use. It supports durability testing and force-history measurement, but comparison of one boxing glove and one MMA glove cannot isolate a general material or layer effect.

[Smith et al. (2000), development of a boxing dynamometer](https://pubmed.ncbi.nlm.nih.gov/10902679/) measures punch force in a boxing-specific apparatus and compares boxer groups. Its values remain tied to that dynamometer, its instructions, and its participants.

[Buško et al. (2016), measuring punches and kicks with a modified punching bag](https://actabio.pwr.edu.pl/fcp/HGBUKOQtTKlQhbx08SlkTUARAUWRuHQwFDBoIVURNWHhQFVZpCFghUHcKVigEQUw/302/public/publikacje/v18-1-2016/7.pdf) reports the mass, diameter, and rigid-core padded construction of an instrumented bag. The moving-bag target uses its 41 kg mass and 0.42 m diameter.
