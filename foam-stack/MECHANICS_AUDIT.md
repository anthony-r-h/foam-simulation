# Mechanics audit

Reviewed 15 September 2026 against the implementation, independent numerical benchmarks, supplier specifications, and the cited publications.

Updated for the Hand Spring model. Stored numeric examples, study counts,
rankings and earlier verification reports below predate that addition unless
explicitly stated otherwise; they are retained as historical records.

## Assessment

The equations are internally consistent for three study targets: fixed plates with 25 mm or 50 mm EVA75 padding, and a moving heavy bag. The 25 mm padded plate is the default. Study impacts are horizontal, with matched striker mass and speed; the original bare curved support remains available only to the backend SATRA checks and historical verification. Physical prediction of a real fist, glove, mat, or bag remains unvalidated.

| Component | What the model represents | Consequence |
| --- | --- | --- |
| Striker | Effective mass with prescribed initial speed; horizontal study motion | No rotation or continued muscular drive |
| Hand Spring | Fixed 1 kN/mm massless spring behind the glove for human/custom impacts | Assumed combined hand/wrist give; no anatomical calibration or pain prediction; omitted for mechanical glove-study and SATRA impacts |
| Glove foam | Massless independent columns; layers in series; monotone loading laws | Layer order has no effect; no lateral confinement, shear, cover, or wave propagation |
| Energy | Work accumulated during first compression | Recoverable energy and irreversible loss cannot be separated; no rebound or repeated-impact prediction |
| EVA target | Nonlinear target foam in series with the glove within each column, over a fixed plane | Target compression and work are distinct from glove outputs; no target inertia or tape compliance |
| Bag target | Moving mass and a uniform linear local compression element in series with the foam | Frozen initial curvature; no suspension impulse, rotation, viscous state, or fill-settling history |
| SATRA reference | Fixed bare curved support and prescribed vertical drop inputs | Zero target work; passive model pass/fail checks, not certification |

Foam provides compression travel through its loading curve. Conditional comparisons can identify tradeoffs among peak force, specimen mass, and thickness. They cannot establish fracture risk or permanent energy dissipation.

## Hand Spring

The series arrangement is **moving mass → Hand Spring → glove foam → target**.
The spring represents the remaining give of the hand and wrist as the foam
stiffens, analogous to a firm rubber cushion behind the glove. Its fixed stiffness
is an explicit assumption, not a measured human property:

$$
k_h=10^6\;\mathrm{N/m}=1\;\mathrm{kN/mm},\qquad
x_h=F/k_h,\qquad W_h=\tfrac12 k_hx_h^2=F^2/(2k_h).
$$

The spring carries total contact force from first contact and acts on every target
for the gentle, adult, Olympic and custom impact cases. It is omitted for both
commercial mechanical glove-study cases and the SATRA checks. There is no force
cap, bottom-out switch or newly invented compressed-foam law. The existing foam
curve and model-domain guards remain in force.

All series elements carry the same resultant force. Total striker/target closure
includes hand give; total loading work includes spring energy. This can stop the
striker before the old foam lookup boundary. A case that still reaches a model
boundary with residual relative energy remains incomplete. Results are labeled
**Peak force**; Methodology reports hand give, stored spring energy and the
assumption separately from foam quantities. The spring stores elastic energy; it adds no dissipation
or rebound model and does not predict pain or injury.

For scale, a spring alone taking the adult input of 76.988065 J would reach about
12.4 kN and 12.4 mm of give. This is a mathematical consequence of the chosen
stiffness with zero gravity, not a measured punch force. Foam and target work
reduce the energy available to this spring.

## Fixed padded targets

Perkins et al. used a 600 × 400 mm force plate covered with EVA75. The 50 mm condition comprised two 25 mm sheets joined with double-sided tape; the comparison condition used 25 mm. Figure 3 specifies Shore A hardness 30–35. The source supplies target construction, not a measured stress–strain law for the mat. [Perkins et al., methods and figure 3](https://researchsystem.canberra.edu.au/ws/portalfiles/portal/25347932/WJET_2018072715333666.pdf)

| Target parameter | Implemented value | Basis |
| --- | ---: | --- |
| Mat thickness | 25 or 50 mm | Experimental target constructions |
| Nominal density | 75 kg/m³ | Representative value within the supplier's 68–82 kg/m³ range |
| Slow 25% compression pressure | 55 kPa | Midpoint of the supplier's 42–68 kPa range |
| 50% pressure anchor | None | Not supplied; no second point is invented |
| Curve and continuation | EVA35 family, rapid baseline, tail power 2 | Assumed transfer to EVA75, not measured impact behavior |
| Target stress scale and thickness retention | 1 | Fixed across glove comparisons |
| Striker radius / projected face radius | 100 / 40 mm | Inherited model geometry; not a measurement of Perkins's mechanical fist |

The current Ultralon table lists Asker C hardness 27–35 for EVA75. This is a different hardness scale from the paper's Shore A specification and is not converted into a compression modulus. The slow 25% anchor calibrates the reference mapping; the assumed rapid curve need not pass through that same pressure. Target response remains fixed when glove stress scale, tail power, firmness, retained thickness, slow/rapid selection, or relaxation sensitivity changes. [Ultralon properties, February 2022](https://www.ubuild.co.nz/wp-content/uploads/2022/10/properties-of-low-density-pe-eva-foams-feb-2022.pdf)

The target plane has no curvature or thickness stretch. Over the central circular footprint, the local approach is

$$
g(r)=R_s-\sqrt{R_s^2-r^2},\qquad
q(r)=\max\{0,X-x_h-g(r)\}.
$$

At shared local pressure \(p\), glove and mat compression satisfy

$$
x_g(p)=\sum_i h_i\varepsilon_i(p),\qquad
x_t(p)=h_t\varepsilon_t(p),\qquad q=x_g+x_t.
$$

The corresponding work per unit area is

$$
u_g=\sum_i h_i\int_0^{\varepsilon_i}\sigma_i(e)\,de,\qquad
u_t=h_t\int_0^{\varepsilon_t}\sigma_t(e)\,de.
$$

Column forces and work contributions add over projected areas \(A_j\):

$$
F=\sum_j A_jp_j,\qquad W_g=\sum_j A_ju_{g,j},\qquad W_t=\sum_j A_ju_{t,j}.
$$

For the fixed horizontal target,

$$
\tfrac12mv^2+W_g+W_t+W_h=\tfrac12mv_0^2,\qquad J=m(v_0-v).
$$

Resolved first compression ends at \(v=0\). The plate is treated as laterally unbounded over the contact footprint; edge effects, shear, confinement, target inertia, adhesive mechanics, and unloading are omitted. The pressure lookup ends at the smaller of 1 GPa and the constituent curve endpoints. Reaching that domain with residual kinetic energy leaves the peak unresolved; it is not a prediction of physical bottom-out.

The solver's \(X\) is total central approach including hand give. Public result and trace `delta`, `es`, `ws`, and `fw` describe glove compression, layer strains, layer work, and total glove work. Target compression and work are `xt` and `tw`; hand give and energy are `xh` and `hw`, with `W=fw+tw+hw`. Without the Hand Spring, `xh=hw=0`. The glove-only diagnostic compilation remains separate from the coupled contact compilation, so its force at a given glove compression need not equal the coupled force.

Historical results before the Hand Spring, for the default 40 mm Medium stack and 53.892 J gentle impact:

| Study target | Peak force | Time to peak |
| --- | ---: | ---: |
| 25 mm EVA75 | 7.701 kN | 11.718 ms |
| 50 mm EVA75 | 2.693 kN | 16.216 ms |
| Default heavy bag | 1.648 kN | 17.251 ms |

These are conditional model outputs. They do not reproduce the source experiment or establish target equivalence.

## Moving-bag model

The bag target uses a centered horizontal strike through the center of mass of an initially stationary bag. During first compression, the bag translates freely and horizontal suspension impulse is neglected. Local indentation is represented separately from this translation.

| Bag input | Default | Provenance |
| --- | ---: | --- |
| Mass | 41 kg | Buśko et al.'s instrumented rigid-core padded bag |
| Initial radius | 0.21 m | Half the same study's 0.42 m outer diameter |
| Local stiffness | 40 kN/m | Analyst-chosen linear loading law |
| Local indentation limit | Radius/2; 105 mm by default | Model-domain guard, not measured bottom-out or usable capacity |

The source supports mass, diameter, and construction, but supplies no local bag stiffness calibration used here. [Buśko et al., 2016](https://actabio.pwr.edu.pl/fcp/HGBUKOQtTKlQhbx08SlkTUARAUWRuHQwFDBoIVURNWHhQFVZpCFghUHcKVigEQUw/302/public/publikacje/v18-1-2016/7.pdf)

The 80 mm striker face and 100 mm spherical radius are retained. Foam geometry uses the entered initial bag radius. The bag element adds a uniform series displacement without reconstructing deformation-dependent curvature or the bag pressure distribution. Changing the foam can change the contact footprint; transferring one equivalent bag stiffness across those footprints is an unvalidated approximation.

Let \(m\) and \(M\) be striker and bag masses, \(\delta_f\) and \(\delta_b\) the foam and local bag indentations, and \(q\) total relative approach. The implemented first-loading relations are

$$
\mu=\frac{mM}{m+M},\qquad
F=k_b\delta_b,\qquad q=\delta_f+\delta_b+x_h,
$$

$$
W=W_f+W_b+W_h,\qquad W_b=\frac12F\delta_b,\qquad
u=\sqrt{\frac{2(E_{\mathrm{rel}}-W)}{\mu}},\qquad
E_{\mathrm{rel}}=\frac12\mu v_0^2.
$$

With \(V=mv_0/(m+M)\), the laboratory speeds and displacements are

$$
v_f=V+\frac{M}{m+M}u,\qquad v_b=V-\frac{m}{m+M}u,
$$

$$
x_b=\frac{m}{m+M}(v_0t-q),\qquad x_f=x_b+q.
$$

Completion occurs at zero relative speed, with both bodies still moving at \(V\). Accordingly, `loadingComplete` is true for a completed bag case while `hasStopped` remains false. Total final kinetic energy includes both laboratory masses. At every sample,

$$
E_0=W_f+W_b+W_h+\frac12mv_f^2+\frac12Mv_b^2,\qquad
J=\mu(v_0-u).
$$

No horizontal gravity work is added. Bag work describes the assumed loading spring and cannot establish irreversible absorption. The existing foam loading curve also does not separate stored energy and dissipation. Neither model includes unloading or rebound. A future viscous bag model could make force and foam compression decrease before total relative compression peaks, so it would require an explicit foam unloading treatment.

The methodology compares half, the current value, and twice the entered bag stiffness, with all other inputs fixed. Default values are 20, 40, and 80 kN/m. These are analyst-selected sensitivity scenarios, not measured bag ranges or confidence bounds. A result reaching the foam domain boundary or the bag indentation guard before zero relative speed remains incomplete.

In the historical model before the Hand Spring, the default Medium stack and gentle impact on the default bag completed first compression at approximately 1647.53 N and 17.251 ms:

| Quantity | Model result |
| --- | ---: |
| Foam indentation | 33.519 mm |
| Local bag indentation | 41.188 mm |
| Bag-body movement | 2.170 mm |
| Striker and bag speed at completion | 0.383756 m/s each |
| Foam loading work | 16.752 J |
| Bag loading work | 33.929 J |
| Combined remaining kinetic energy | 3.210 J |
| Initial striker energy | 53.892 J |

Rounded work and kinetic-energy entries partition the initial energy; body movement and local indentation are distinct. These are numerical scenario outputs, not observations of a physical bag. All 21 canonical bag scenarios in the mechanics checks complete first compression under the selected defaults.

Equal striker energies need not give equal bag peaks when striker masses differ: \(E_{\mathrm{rel}}=E_0M/(m+M)\). Equal relative energies give the same compression endpoint for fixed bag and foam loading laws. The earlier equal-energy property applies to a fixed target with gravity disabled.

## Material parameterization

All seven retail grades' entered density and firmness values match the supplier sources checked on 15 September 2026. The limitations lie in interpretation and interpolation:

- ILD divided by 50 in² is a dimensionally correct nominal indentation pressure. It is not a measured thin-layer uniaxial stress law. PFA distinguishes thickness-dependent IFD from compression-force deflection. [PFA guide](https://pfa.org/wp-content/uploads/2022/05/InTouchv4.2new.pdf)
- PU support-factor minima are used as point estimates. Supplier tolerance, including Soft HR's 10 ± 3 lbf ILD, is not propagated.
- Reference coefficients match the papers, but their specimens differ from the retail grades. The PU/latex experiment also used indentation; the EVA reference was a 35 kg/m³ board, not Evazote. [Alzoubi et al.](https://oiccpress.com/jsm/article/download/12454/14012/38722), [Wu et al.](https://doi.org/10.3390/polym15234514)
- The default fast curve is an asymptotic loading assumption. It does not follow instantaneous strain rate or internal relaxation state. Its 25% pressure amplification is approximately 63× for Soft HR and 13× for latex.
- Density changes the packing cap and tail and determines the specimen-mass estimate; it does not generally scale stiffness or add to effective impact mass. The high-compression extension remains assumed.
- Fractions of work within supplier/family strain ranges are bookkeeping measures, not fractions of experimentally validated response.

### Supplier and reference refresh

The June 2026 manufacturer sheets replace the older distributor-hosted Evazote documents as the preferred sources. The values used by the model are unchanged: EV30 has nominal density 30 kg/m³ and compression stresses of 39 and 100 kPa at 25% and 50%; EV50 has nominal density 50 kg/m³ and corresponding stresses of 50 and 116 kPa. Both are typical production values, not a measured curve for a particular glove layer. The 2026 sheets cite ISO 7214:2012 but omit the explicit 25 mm cell-cell specimen description found in their December 2017 predecessors. [EV30, June 2026](https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A034-Evazote-EV30.pdf), [EV50, June 2026](https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A037-Evazote-EV50.pdf)

The currently published PU/latex supplier values also remain unchanged:

| Grade | Density (lb/ft³) | 25% ILD (lbf) | Deeper input | Source |
| --- | ---: | ---: | --- | --- |
| Soft HR | 2.50 | 10 ± 3 | Minimum support factor 2.7 | [FoamOnline](https://foamonline.com/soft-foam/) |
| HD36-HQ | 2.80 | 35 | Minimum support factor 1.9 | [Foam Factory](https://canada.foambymail.com/hd36-hq-foam-sheet.html) |
| Lux-HQ | 2.80 | 50 | Minimum support factor 1.9 | [Foam Factory](https://canada.foambymail.com/lux-hq-foam-sheet.html) |
| Qualux Firm | 3.10 | 65 | Minimum support factor 2.1 | [Foam Factory](https://canada.foambymail.com/qualux-firm-foam-sheet.html) |
| Dunlop latex | 4.60 | 29 | Not listed | [Foam Factory](https://canada.foambymail.com/latex-foam-dunlop-sheet.html) |

The Alzoubi coefficients in table 3 still match the model after conversion from MPa to kPa. Adamec's dominant-fist means remain 2.597 kg and 7.7 m/s; Walilko reports 2.9 kg and 9.14 m/s. Buśko's journal PDF confirms the 41 kg, 0.42 m bag construction. These references supply family curves or apparatus/input values, not validation of the commercial foam stack. [Alzoubi](https://oiccpress.com/jsm/article/download/12454/14012/38722), [Adamec](https://epub.ub.uni-muenchen.de/76042/1/76042.pdf), [Walilko](https://pubmed.ncbi.nlm.nih.gov/16183766/), [Buśko](https://actabio.pwr.edu.pl/fcp/HGBUKOQtTKlQhbx08SlkTUARAUWRuHQwFDBoIVURNWHhQFVZpCFghUHcKVigEQUw/302/public/publikacje/v18-1-2016/7.pdf)

For bibliographic accuracy, the PFA source is its laboratory-testing bulletin, *IN•TOUCH*, volume 4, number 2, revised 2022. Chen's paper belongs to the 2024 volume of *Polymers*, although it was published online in December 2023. The Perkins article's direct publisher PDF remains available when its article landing page cannot be retrieved. [PFA bulletin](https://pfa.org/wp-content/uploads/2022/05/InTouchv4.2new.pdf), [Chen publication record](https://www.mdpi.com/2073-4360/16/1/34/notes), [Perkins PDF](https://www.scirp.org/pdf/wjet_2018072715333666.pdf)

### Rapid baseline and relaxation sensitivity

First compression uses the rapid limit throughout. On the rigid support, the default stacks stop in 15–19 ms at 3 J and 10 J, compared with reference relaxation times of 1.45 s (PU55), 0.108 s (HR40), and 0.090 s (latex). This motivates suppressing relaxation within the reference laws for these brief impacts. It does not validate transfer to the retail grades or every custom impact. Both padded targets and the bag retain the rapid glove-loading assumption, including cases with longer compression durations. The EVA75 target law stays fixed during glove-only sensitivity calculations.

The nearby sensitivity uses a fixed 20 ms ramp-endpoint approximation for the PU/latex Maxwell contribution:

$$
K_{\mathrm{eff}}=K\frac{1-e^{-T/\tau}}{T/\tau},
\qquad \tau=C/K,\qquad T=20\,\mathrm{ms}.
$$

At zero duration the multiplier is exactly one, preserving the original rapid baseline. The endpoint map is frozen across compression; it is not the stress history or work of one Maxwell ramp. Work is integrated under the surrogate curve. Slow-test calibration, elastic terms, and tail construction are retained; EVA keeps its trapped-gas law. Both cases use identical layer inputs, mass, speed, target, geometry, and stress multipliers. The prescribed 20 ms duration is not a calculated loading time. The following historical comparison uses the rigid support.

| Impact | Stack | Rapid peak | 20 ms peak | Change |
| --- | --- | ---: | ---: | ---: |
| 3 J | Soft | 468.5 N | 453.0 N | −3.32% |
| 3 J | Medium | 460.7 N | 455.7 N | −1.08% |
| 3 J | Firm | 442.0 N | 437.5 N | −1.02% |
| 10 J | Soft | 925.0 N | 907.4 N | −1.91% |
| 10 J | Medium | 1032.7 N | 1027.7 N | −0.48% |
| 10 J | Firm | 1066.9 N | 1075.1 N | +0.77% |

All six cases stop and retain their ranking at each energy. A softer loading curve can allow deeper compression into the steep tail and increase peak force, as in Firm at 10 J. These are local sensitivity results, neither confidence intervals nor force bounds. Slow compression remains calibration evidence; the interface no longer offers it as an equally plausible rapid-impact scenario. The source retains legacy import handling, but the interface no longer provides a load control.

The presets remain conditional examples, not experimentally established optimum designs. Historically, all three default stacks remained unresolved for the five higher-energy presets on the bare rigid support. Identical force-at-cutoff values are a model boundary, not identical complete-hit performance. The supplied preset screening used only that rigid target. It is distinct from the new 9,855-case, three-target parameter study below.

## Impact provenance

SATRA supports the implemented rigid rig dimensions and the 3 J/10 J, 2 kN reference levels. Automatic checks remain fixed to that rig for all three selected study targets. The simulation does not reproduce central-anvil load sharing or the complete test procedure. [SATRA](https://www.satra.com/spotlight/article.php?id=423)

Adult and Olympic inputs are separate reported means of effective impact mass and speed. Their product does not give mean measured energy. The commercial 5 m input retains the supplied 10.01 m/s value for reproducibility; the publication supports approximately 10 m/s and 6.5 kN from figures, without establishing those earlier exact decimals. Its target was a 50 mm EVA75 mat. [Adamec, table 2](https://epub.ub.uni-muenchen.de/76042/1/76042.pdf), [Walilko](https://pubmed.ncbi.nlm.nih.gov/16183766/), [Perkins, figures 3 and 7](https://www.scirp.org/pdf/wjet_2018072715333666.pdf)

## Interface

Impact, Target, Layers, Results, Impact graphs, and Parameter study are stacked vertically, followed by Methodology. The target selector contains 25 mm EVA75, 50 mm EVA75, and Heavy bag. Impact descriptions separate energy, effective mass, and initial speed. Soft, Medium, and Firm are complete layer presets. The synthetic rigid-striker option and Save stack, Load stack, and Export trace controls are absent.

Changing total thickness scales every layer proportionally while retaining material parameters. Resulting layers must remain within 0.5–100 mm. Bag mass accepts 10–100 kg and diameter 25–80 cm; Softer, Medium, and Firmer mean assumed local stiffnesses of 20, 40, and 80 kN/m. These limits are interface choices, not measured uncertainty bounds.

Headline results are peak force, force reached by 10 ms relative to peak, time to peak, and first-compression impulse. An unresolved run instead reports force reached, time reached, and impulse so far. Secondary results contain specimen mass, foam thickness left, and fist speed. Impulse is displayed as N*s.

Graphs show contact force, central glove compression decomposed by layer, glove loading work, and fist speed. Human/custom impacts add a separate Hand give compression band and a separate hand spring energy line. Mat and bag compression are excluded from the compression graph; target work and kinetic energy are excluded from the Energy graph. Shared force and time still reflect the full coupled mechanics. Material and whole-stack diagnostics remain in Methodology. At resolved fixed-target compression the fist stops; on the bag it retains the common laboratory speed of fist and bag. Neither is a physical bottom-out metric.

SATRA outputs are passive 3 J and 10 J status summaries without force values or inspection controls. They preserve the fixed curved support, prescribed vertical inputs, and 2 kN model criterion. Legacy bare-rigid views map to the 25 mm study mat; legacy SATRA trace selections restore the gentle study impact. Apparatus and protocol limitations remain explicit.

### Specimen mass

“Foam weight” is the mass of a 30 × 30 mm specimen using the specified, uncompressed layer thicknesses:

$$
m_f=A\sum_i\rho_i h_i,\qquad A=(0.030\,\mathrm m)^2.
$$

With density in kg/m³ and thickness in metres, \(m_f\) is in kilograms; the interface reports grams. Density conversion is 1 lb/ft³ = 16.01846337396 kg/m³. The default Medium specimen weighs 1.710415 g. The estimate excludes covers, stitching, adhesive, target foam, and other glove components. It is independent of retained-thickness assumptions and does not change the prescribed impact mass or the contact geometry.

## Interpreting peak force

The peak guide uses four primary-source averages with apparatus context:

| Study | Mean peak force | Measurement context |
| --- | ---: | --- |
| [Adamec et al. (2021), table 2](https://epub.ub.uni-muenchen.de/76042/1/76042.pdf) | 1.523 kN | 50 untrained adults, dominant fist; 11 cm pad on a wall-mounted force plate; highest-impulse trial of three selected |
| [Liu et al. (2022)](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2022.1015154/full) | 1.508 kN | Elite boxers, lead straight; uniform boxing gloves, tripod-mounted Kistler target; best of three punches |
| [Walilko et al. (2005)](https://www.sportmedicine.ru/articles/biomechanics_of_the_head_for_olympic_boxer_punches_to_the_face.pdf) | 3.427 kN | 18 landed dominant-hand straights from seven Olympic boxers; gloved fist, deformable face, moving dummy head and neck; force from head acceleration and neck load |
| [Smith et al. (2000)](https://pubmed.ncbi.nlm.nih.gov/10902679/) | 4.800 kN | Seven elite boxers, rear straight; triaxial dynamometer with a boxing-manikin interface |

These are averages of measured peak forces, not time-average forces. Adamec's untrained adults and Liu's elite lead straights both average about 1.5 kN in different setups. Smith's novice rear straights average 2.381 kN on that study's apparatus. These overlaps do not support universal ordinary/trained/elite force boundaries, and an elite mean near 4.8 kN does not establish 5 kN as beyond normal human performance. The examples provide scale, not injury thresholds or simulator validation.

The interface omits dispersion for simplicity. Smith reports standard errors of the mean, whereas the other listed papers report standard deviations; these quantities must not be interchanged. Liu's printed impulse units are inconsistent, so the guide uses its consistently reported peak-force result only.

## Force reached by 10 ms

First contact defines time zero. The early-loading percentage samples the rising phase at 10 ms or at an earlier resolved peak:

$$
t_s=\min(0.010\,\mathrm s,t_{\mathrm{peak}}),\qquad
R_{10}=100\frac{F(t_s)}{F_{\mathrm{peak}}}\quad[\%].
$$

This is a capped instantaneous-force ratio, not an average or an integral. Force at 10 ms is interpolated on the nonuniform trace when that instant is covered. A resolved peak before 10 ms gives 100%, labeled “Peak reached before 10 ms,” with its actual sample force and time. The separate raw `forceAt10N` remains null if the trace ends before that instant. The calculation invents no unloading or rebound. If a supplied full trace extends beyond an earlier peak, the first occurrence of that peak supplies the capped sample while the actual force at 10 ms is retained separately.

A model limit before 10 ms leaves both sample and percentage unavailable. A trace extending beyond 10 ms with an unresolved peak retains the raw force but no percentage. Invalid, nonfinite, unordered, or inconsistent peak data are rejected. `sampleForceN`, `sampleTimeSeconds`, `peakBefore10`, and `definition` make the distinction explicit in result objects and CSV rows.

| Percentage of peak reached by 10 ms | Illustrative description |
| --- | --- |
| Below 50% | Gradual buildup |
| 50% to below 70% | Moderate buildup |
| 70% to 85%, inclusive | Sharp buildup |
| Above 85% | Very sharp buildup |

A resolved peak before 10 ms is classified as Very sharp buildup at 100%, with the separate explanation "Peak reached before 10 ms."

Time to peak describes the duration of force buildup from first contact, not full contact duration:

| Time to peak | Illustrative description |
| --- | --- |
| Below 10 ms | Abrupt buildup |
| 10 ms to below 12 ms | Quick buildup |
| 12 ms to 18 ms, inclusive | Moderate buildup |
| Above 18 ms | Gradual buildup |

The 10 to below 12 ms interval fills the gap between the user-specified time bands. Both guides use user-defined descriptions; preferences for glove feel differ, so the labels do not rank quality. They are not experimentally calibrated feel or injury classes. A higher later peak can lower the ratio without reducing force at 10 ms. Interpret both metrics alongside peak force under matched impact and target settings; neither description is a protection objective.

The cap prevents an already falling force from implying slow initial loading. Walilko reports a 3.737 kN peak at 5 ms during a 13 ms impact: an exact 10 ms force ratio alone would miss that earlier peak. The current solver still models first compression only. [Walilko, p. 714](https://www.sportmedicine.ru/articles/biomechanics_of_the_head_for_olympic_boxer_punches_to_the_face.pdf)

Historically, before the Hand Spring, Medium foam with the gentle impact and default bag had a peak force of 1.64753 kN and force at 10 ms of 1.12831 kN, giving 68.4849%. Time to peak was 17.2508 ms and loading impulse was 15.73399 N*s. The default 25 mm padded target gave 36.5626%, with a peak at 11.718 ms. These retained examples do not describe the current human-impact model.

## Parameter study

The completed study contains 365 designs: seven single materials, all 21 two-material combinations at 25/75, 50/50, and 75/25 shares, and three layer presets, each at 30, 40, 50, 60, and 70 mm. Every design is evaluated on all three targets under nine combinations of glove stress scale (0.8, 1.0, 1.2) and tail power (1.5, 2, 3). These are analyst scenarios, not measured tolerance distributions. The adult impact remains fixed at 2.597 kg and 7.7 m/s, with zero gravity component along impact. Target calibration is fixed.

The historical run without the Hand Spring processed all 9,855 numbered cases: 8,515 resolved, 1,340 model-limited, and zero calculation errors. Of 365 designs, 134 resolve every matched condition; 231 are excluded from dominance comparisons. Within the eligible set, 56 lie on the tested frontier and 78 are dominated. New runs include the adult-impact Hand Spring; these stored counts and rankings must be recomputed for that model. Dominance requires no greater specimen mass or thickness and no greater peak in every matched target/scenario, with at least one strict improvement. Early-loading percentage and impulse are not optimization objectives.

The lowest nominal grid peak is target-dependent: 70 mm Qualux on the 25 mm mat, and 70 mm Soft HR on the 50 mm mat and bag. These boundary-thickness results do not establish a practical glove thickness or a global optimum. The grid, complete CSV, interpretation, and limitations are documented in [Exploratory analysis](analysis/EXPLORATORY_ANALYSIS.md).

### Numerical refinement

Nine nominal cases for Qualux 70 mm, Soft HR 70 mm, and a 25/75 Soft HR/Qualux mix at 70 mm were recomputed with a 48 × 40 contact grid and 480 time intervals, compared with 24 × 20 and 240. Their selected ordering was unchanged. Refined winning values were 3.536931 kN for Qualux on the 25 mm target and 2.571938 / 1.635710 kN for Soft HR on the 50 mm target / bag.

A separate 54-case comparison checked a strongly separated pair across all 27 matched target/scenario conditions. At 70 mm, the 75/25 Soft HR/Qualux mix retained at least 13.56335% lower peak force than the 75/25 HD36-HQ/Qualux mix, while using 7.82609% less specimen mass. The minimum refined force margin was 284.698 N.

Across all 63 matched refinement cases, maximum relative changes were 0.06003% for peak force, 0.07636% for early-loading percentage, 0.00325% for time to peak, and 0.03509% for foam thickness left. Fist speed, loading impulse, and specimen mass were unchanged. These checks support the selected comparisons; they do not revalidate all frontier memberships or near-ties. [Refinement results](analysis/refinement-checks.json), [reproduction script](analysis/run_refinement.cjs).

## Verification

Recorded checks and analyses before the Hand Spring:

- **323 rigid mechanics checks:** original rig regressions, analytic spring dynamics, independent work integration, layer-work balance, and automatic SATRA input/verdict consistency.
- **457 bag mechanics checks:** series deformation/work, reduced-mass dynamics, energy and momentum, laboratory motion, and domain limits. The original 21 canonical bag cases retain maximum energy and momentum residuals of \(2.76\times10^{-12}\) J and \(7.11\times10^{-15}\) Ns; independently integrated impulse differs by at most 0.000344%.
- **705 padded-target and specimen-mass checks:** independent two-linear-springs benchmark, nonlinear shared-pressure columns, separate glove/mat work, force/work derivatives, energy and momentum, fixed target calibration, numerical refinement, and finite model limits.
- **812 early-loading checks:** exact-time interpolation, capped early peaks, full traces falling after an earlier peak, unresolved/invalid cases, analytic spring histories, and all four backend target configurations.
- **739 material checks:** anchors, inverse mappings, derivatives, continuous tails, density, relaxation sensitivities, validation, and cache separation.
- **10 layer-thickness checks:** proportional scaling, layer bounds, and preserved material inputs.
- **56 sweep checks:** deterministic plans, complete numbering, target and mass isolation, CSV fields, coverage requirements, and dominance behavior.
- **517 standalone and 520 hosted browser checks:** three target choices, passive SATRA summaries, legacy view normalization, capped early results, specimen weight, glove-only graphs, real Worker execution and a 27-row CSV download, cancellation, keyboard use, and desktop/mobile layout. Reports and screenshots: `output/playwright/foam-study-standalone/` and `foam-study-hosted/`.
- **Independent full CSV audit:** all 9,855 rows have sequential unique test numbers and matched inputs. Maximum energy residual is \(5.764\times10^{-11}\) J, impulse residual is zero, and specimen-mass residual is \(8.882\times10^{-16}\) g. Resolved status and capped early-sample fields agree with the underlying results.
- **322 refinement assertions:** 63 matched cases and 126 solves, recording all seven outcomes and the selected ranking/dominance checks above.
- **87 final browser smoke checks:** 44 standalone and 43 hosted checks of the complete embedded study, all targets, frontier filtering, point inspection, early peaks, rendered equations, and mobile layout. No runtime errors or page overflow were found. Reports are in `output/playwright/foam-study-final-smoke/`.

Historical verification remains in the source artifacts. The original bare-rigid 3 J/10 J peak changes under 24 × 20 to 96 × 80 contact refinement were below 0.02%; independent glove force–distance integration differed from work by less than \(9\times10^{-9}\) relative. Unresolved rigid-endpoint force changed by approximately 3%. These earlier figures concern the bare-rigid model, not the new EVA targets. The supplied 29,792-case bare-rigid screening was not rerun.

The Hand Spring has a separate `npm run test:foam:hand` suite, also included in
`npm run test:foam`, for analytic spring solutions, work and force balance,
scope exclusions, and model limits. Earlier numerical/browser reports and stored
study summaries describe the earlier model; they do not validate the new spring
assumption. Historical generated files included that earlier complete study.
Numerical consistency does not quantify material-model error or validate target
or hand stiffness. Repository-wide lint previously failed on existing application
formatting, including CRLF line endings; unrelated files were not mass-formatted.

## Measurements needed next

Measure loading and unloading of the chosen grades at relevant thicknesses and rates, including specimen variation. Then test a known stack with the modeled striker/target geometry and compare both force-time and displacement histories. For the EVA targets, measure loading curves for the actual 25 mm sheets, including rate dependence and the bonded 50 mm construction. For the bag, measure local force-indentation behavior at the relevant contact footprint, impact rates, and fill condition; track bulk translation separately and assess the effective moving mass. Those data are needed to replace the illustrative stiffness and domain guard, add unloading, and assess suspension and rotational effects. A compliant fist needs its own compliance and inertia measurements. Calibration against these measurements could change the design rankings.
