# Adaptation to published test configurations

- Test our chosen foam stack under the published apparatus conditions.
- The published gloves' unknown foam properties prevent reproducing their measured results directly.
- Superscripts identify setup-specific values, such as $m^{\mathrm{SATRA}}$. The changes below are proposed adaptations; missing details remain open.

## Represent a drop as a horizontal impact

- Start at first contact, with the same moving mass, speed, geometry, and target. Use measured contact speed where available.
- Otherwise, calculate speed $v_0^{\mathrm{DROP}}$, in m/s, from drop height $H^{\mathrm{DROP}}$, in m, or contact energy $E_0^{\mathrm{DROP}}$, in J. Moving mass $m^{\mathrm{DROP}}$ is in kg; $g=9.81~\mathrm{m/s^2}$:

$$
v_0^{\mathrm{DROP}}
=\sqrt{2gH^{\mathrm{DROP}}}
=\sqrt{\frac{2E_0^{\mathrm{DROP}}}{m^{\mathrm{DROP}}}}
$$

- The height relation assumes release from rest with negligible losses. Match mass as well as energy because mass affects timing.
- Use a rigid connection by setting $q^{\mathrm{HAND}}=0$, $U_h=0$, and $q^{\mathrm{MASS}}=q$.
- The existing horizontal equations can approximate the drop by omitting gravity during compression.
- To retain gravity, add a constant forward force $m^{\mathrm{DROP}}g$. Gravity then supplies work $m^{\mathrm{DROP}}gq$, and speed becomes:

$$
v^{\mathrm{DROP}}(q)
=\sqrt{\frac{2\left[E_0^{\mathrm{DROP}}
+m^{\mathrm{DROP}}gq-W(q)\right]}{m^{\mathrm{DROP}}}}
$$

- Stop when $W(q)=E_0^{\mathrm{DROP}}+m^{\mathrm{DROP}}gq$. With this correction, calculate work shares against that total supplied energy at stopping.
- State which treatment is used. Gravity adds about 0.49 J over 20 mm for a 2.5 kg striker, so the difference can matter in a 3 J test.

## SATRA: a force-limit check

- **Does the stack keep transmitted peak force at or below 2 kN?**
- [SATRA's summary](https://www.satra.com/spotlight/article.php?id=423) specifies 3 J impacts for Class A and B hand protectors. Class B also receives 10 J impacts on its increased-protection zone, with the same limit.

### Punch

- Change mass and speed. The dome dimensions already match our baseline. Use the rigid connection and drop treatment above.

| Punch input | Parameter or variable | SATRA value |
| --- | --- | --- |
| Moving mass | $m^{\mathrm{SATRA}}$ | 2.5 kg |
| Contact energy | $E_0^{\mathrm{SATRA}}$ | 3 or 10 J |
| Calculated incoming speed | $v_0^{\mathrm{SATRA}}$ | 1.55 or 2.83 m/s, respectively |
| Dome curvature radius | $R^{\mathrm{SATRA}}$ | 100 mm |
| Maximum footprint radius | $a^{\mathrm{SATRA}}$ | 40 mm |

### Target

- Replace the padded plate with a bare rigid half-cylinder of radius $R^{\mathrm{SATRA,TARGET}}=45~\mathrm{mm}$. Remove target foam from the layer sum. All compression work is now glove work:

$$
W^{\mathrm{SATRA}}(q)=U_{\mathrm{glove}}^{\mathrm{SATRA}}(q)
$$

- The cylinder curves in one direction, so replace circular rings with a two-dimensional contact footprint. Positions $x,y$ are measured in m.
- Define the initial gap $b^{\mathrm{SATRA}}(x,y)$, in m, from the dome and glove shape. Local shortening $c^{\mathrm{SATRA}}(x,y)$, in m, becomes:

$$
c^{\mathrm{SATRA}}(x,y)
=\max\left[0,q-b^{\mathrm{SATRA}}(x,y)\right]
$$

- Use the existing layer-compression rule with local starting thicknesses. Integrate pressure $p^{\mathrm{SATRA}}(x,y)$, in Pa, over projected contact area $A^{\mathrm{SATRA}}(q)$, in $\mathrm{m^2}$, to obtain force in N:

$$
F^{\mathrm{SATRA}}(q)
=\int_{A^{\mathrm{SATRA}}(q)}p^{\mathrm{SATRA}}(x,y)~\mathrm{d}A
$$

- **Still needed:** define how the foam sits around the support, which sets its gap and local thickness. Review the [curved-support approximation](../legacy/METHODOLOGY.md#curved-contact-geometry-bag-and-satra-reference) as a starting point.
- **Measurement:** the test senses force through a central anvil; the equation above gives total contact force. Establish the anvil footprint and how load is shared with its surrounding support before applying the 2 kN limit. Conditioning and the full impact sequence also remain outside this model.

## Perkins: compare response across impacts and targets

- **Does one stack reduce peak force or slow its buildup, and does that advantage persist when impact speed or target padding changes?**
- [Perkins et al.](https://www.scirp.org/pdf/wjet_2018072715333666.pdf) found that thicker target padding reduced peak force and peak loading rate, and changed the relative performance of the gloves.
- For each speed, report peak force and peak loading rate over 0.5 ms on both targets. Use the [loading-phase measures](MODEL.md#reported-outputs-and-comparison-metrics) and keep the force histories.
- Compare stacks under matched conditions. Report how their differences change across speeds and targets.

### Punch

- The study used a 3.046 kg mechanical fist. With its 0.278 kg glove, total moving mass is $m^{\mathrm{PERKINS}}=3.324~\mathrm{kg}$.
- Drops run from 2.5 to 5.0 m in 0.5 m steps. Set incoming speed $v_0^{\mathrm{PERKINS}}$ from measurements or the drop relation above. Use the rigid connection.
- Hold total moving mass fixed across our stack comparisons. The reference mass does not establish the mass of our proposed glove.
- **Geometry assumption:** our dome approximates the mechanical fist. Closer reproduction needs its contact profile.

### Target

- Use the fixed EVA75-covered plate with thickness $h^{\mathrm{PERKINS,TARGET}}=25$ or $50~\mathrm{mm}$.
- Keep the baseline layer-sharing and force equations. Only target thickness changes between these two cases.
- **Material assumption:** our estimated EVA75 curve has not been validated against the study's mat.
- Full contact duration and rebound need unloading behavior. Reproducing the study's pneumatic gloves would also need air/bladder mechanics.
