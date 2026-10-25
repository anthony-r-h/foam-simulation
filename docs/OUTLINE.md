# Choosing and characterizing foam for a boxing glove

## Working status

> **Document intent:** This document is an outline for a design investigation. We are making a boxing glove, investigating padding materials. The document should follow that problem from basic questions to useful tests. `METHODOLOGY.md` is source material only; its structure and current simulation choices are not settled here.

- Start with the glove we want to make, then work outward into the material science and impact mechanics needed to make sensible choices.
- Use plain language first. Add equations only after each idea makes sense without them.
- Treat existing gloves, product descriptions, and standards as clues, not as the subject of the project.
- Keep claims about protection narrow. Comparing foam does not tell us everything about injury or glove safety.
- This is not a boxing glove audit.
- Leave numerical simulation methods, parameter sweeps, rankings, and results out of this draft.
- Mark uncertain claims and missing evidence instead of smoothing over them.

## 1. Why this project exists

> **Section intent:** Start with the design gap: boxing gloves do not have a shared set of padding specifications in the way that laptops have specifications for their major components. A multilayer stack lets us shape how the glove compresses, but there is no published recipe to follow. The language used to describe glove feel is vivid but hard to design from. This section should turn "good foam" into a broader set of goals without pretending that one number can settle the choice.

- Most boxing gloves are sold using specifications such as weight, closure type, colour, and price.
- Those attributes help someone choose a product, but they do not describe the quality or performance of its padding.
- There is no standard, consumer-facing way to state how a glove's foam compresses, builds resistance, recovers, or changes with repeated use.
- Without those specifications, two gloves with the same weight and similar construction can behave very differently on the hand and during impact.

- Boxing-glove padding is often built as a stack of different foams.
- The point of layering is to shape the compression profile of the glove as a whole.
  - The stack can give easily at first, then build support as the punch gets harder.
  - It can provide useful compression travel without reaching a sudden, harsh bottoming point.
  - Different layers can contribute surface softness, deeper support, recovery, or durability.
- The recipe is not published.
  - Even when a glove's broad foam families are mentioned, the layer thicknesses, formulations, and purchasable foam grades usually are not.
  - We do not get the compression curves needed to reproduce or properly understand the stack.
- Market terms such as "pillowy" and "poppy" do not close that gap.
  - "Pillowy" suggests softness, but says nothing about support deeper into compression.
  - "Poppy" may refer to crisp feedback, rebound, or simply the sound of a punch on the bag.
  - Neither term has a shared test method or numerical scale.
- This leaves a wider design question: how do we build a foam solution that is good as a boxing glove, rather than merely impressive in one material test?
- A good solution should:
  - use enough travel to soften the initial loading without feeling vague or mushy;
  - build resistance progressively and avoid bottoming out during harder impacts;
  - spread load over the knuckles while controlling how force builds at the target;
  - behave well across a useful range of punches, not just one chosen impact;
  - recover its shape and remain consistent through repeated use;
  - fit within the glove's limits on thickness, weight, shape, and construction;
  - feel predictable enough that the boxer still gets clear feedback from a punch.
- Those goals may pull against each other. The job of the model and the physical tests is to make those tradeoffs visible.

## 2. What foam is doing inside a glove

> **Section intent:** Give the reader only the physical picture needed for the design problem. Foam provides stopping travel, and its resistance changes as it is compressed.

- Foam provides some distance over which the fist can slow as the glove meets the target.
- As the foam compresses, it pushes back.
- A useful layer compresses easily enough at first, then builds support as compression increases.
- If the foam is too soft or too thin, it can run out of useful travel and become suddenly hard to compress.
- If it is too firm, force can build too quickly from the start.
- Combining layers lets us shape how the glove responds through the impact.
- One firmness value cannot describe that full response. We need the compression curve.
- The goal is not the softest or hardest foam. It is a stack that uses its available travel without becoming harsh or bottoming out too early.
- A compression curve describes one foam under a defined test. It does not describe the complete glove.
- To understand the glove, we must connect each layer's curve and thickness to the response of the assembled stack during impact.
- We therefore need three kinds of evidence:
  - compression tests for the materials;
  - impact tests for the complete glove;
  - realistic impact conditions for the boxer, hand, and target.

## 3. Candidate foam grades

> **Section intent:** Identify the purchasable foams in the first comparison and the limits of their supplier data.

- The candidates cover flexible PU, including HR grades, latex, and EVA.
- They are reference materials for this project. Their use in commercial boxing gloves has not been established.
- Density and firmness are different properties.

### What the family names mean

- Flexible polyurethane, or PU, covers a wide range of densities and firmness levels.
  - High-resilience, or HR, is a type of flexible PU associated with stronger recovery and support.
  - Neither label defines a compression curve.
- Latex foam is known for a springy response and strong recovery.
  - Dunlop describes how the foam is made. It does not specify its firmness or curve.
- EVA is a closed-cell foam available across a wide range of densities and firmness levels.
  - EV30 and EV50 are specific commercial grades. They do not represent every EVA foam.
- The grade and its measured response matter more than the family name.

### Candidate grades

| Family | Grade | Density | Published compression data |
| --- | --- | ---: | --- |
| Flexible PU, HR | [Soft HR](https://foamonline.com/soft-foam/) | 2.50 lb/ft³ | 10 lbf at 25% ILD; minimum support factor 2.7 |
| Flexible PU | [HD36-HQ](https://canada.foambymail.com/hd36-hq-foam-sheet.html) | 2.80 lb/ft³ | 35 lbf at 25% ILD; minimum support factor 1.9 |
| Flexible PU | [Lux-HQ](https://canada.foambymail.com/lux-hq-foam-sheet.html) | 2.80 lb/ft³ | 50 lbf at 25% ILD; minimum support factor 1.9 |
| Flexible PU, HR | [Qualux Firm](https://canada.foambymail.com/qualux-firm-foam-sheet.html) | 3.10 lb/ft³ | 65 lbf at 25% ILD; minimum support factor 2.1 |
| Latex | [Dunlop latex](https://canada.foambymail.com/latex-foam-dunlop-sheet.html) | 4.60 lb/ft³ | 29 lbf at 25% ILD; no deeper point |
| EVA | [Evazote EV30](https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A034-Evazote-EV30.pdf) | 30 kg/m³ | 39 kPa at 25%; 100 kPa at 50% |
| EVA | [Evazote EV50](https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A037-Evazote-EV50.pdf) | 50 kg/m³ | 50 kPa at 25%; 116 kPa at 50% |

### Making the values comparable

- PU and latex use indentation force. Support factor is the 65% value divided by the 25% value.
- EVA uses stress from compression between plates. The two test methods are not directly comparable.
- The model divides ILD/IFD force by the 50 in² indenter area and treats it as average pressure.

> We convert the available supplier data to a common pressure-versus-strain scale, then use published family curves to estimate the missing response. This lets the model compare foam grades consistently, although the resulting curves remain estimates until the materials are tested under the same conditions.

### What is still missing

- Full loading and unloading curves for the purchased foams.
- Tests at glove-layer thicknesses and punch-like loading rates.
- Recovery and change after repeated impacts.
- Variation between samples and batches.
- Section 6 explains how provisional curves are built until these measurements exist.

## 4. Why existing tests do not answer the design question

> **Section intent:** Rules, standards, and research answer different questions: may the glove be used, does it pass a protection test, and how does it respond during impact? Together they still do not connect measured foam curves to the response of a finished glove.

### What standards and rules cover

- Competition rules mostly answer: **may this glove be used?**
  - They specify weight, padding allowance, materials, dimensions, thumb attachment, closure, condition, and approval. ([World Boxing rules](https://worldboxing.org/wp-content/uploads/2024/11/World-Boxing-Competition-Rules-Nov-2024-Approved.pdf))
  - They do not describe the padding's compression curve, recovery, or impact feel.
- EN 13277-7 asks a narrower performance question: **does this hand protector keep transmitted peak force below a limit in a prescribed drop test?**
  - A 2.5 kg striker with an 80 mm domed face and 100 mm radius is dropped onto the glove. The glove rests on a rigid 90 mm half-cylinder with a load cell under its central anvil. ([SATRA summary of EN 13277](https://www.satra.com/spotlight/article.php?id=423))
  - Class A and B protectors receive 3 J impacts; the increased-protection zone of Class B also receives 10 J impacts. The stated peak-force limit is 2 kN. ([SATRA summary](https://www.satra.com/spotlight/article.php?id=423))
  - The standard concerns protection of the wearer's hand. It expressly excludes performance for the opponent. ([EN 13277-7:2009 preview](https://cdn.standards.iteh.ai/samples/26354/0e49f762fd014431939bb6888166baf2/SIST-EN-13277-7-2009.pdf))
- This is useful as a repeatable pass/fail screen. It does not describe the full force-time or compression response, so two passing gloves may still feel and behave very differently.

### What the research literature adds

- Research measures parts of the response that rules leave out. No one test answers the whole design question.

#### Finished-glove impact tests

- Glove weight alone does not predict impact response.
  - [Girodet et al. (2009)](https://doi.org/10.1080/10255840903080885) tested nine 10, 12, and 14 oz gloves at 3, 10, and 20 J.
  - Gloves of the same weight produced different peak forces, and the differences grew at higher energy.
- The target can change the result and the comparison between gloves.
  - [Perkins et al. (2018)](https://doi.org/10.4236/wjet.2018.63037) dropped gloves fitted to a mechanical fist onto a force plate covered with either 25 or 50 mm of EVA75.
  - Target thickness changed peak force, loading rate, contact time, and the relative performance of the gloves.
  - Their force-time curves also retained information that a peak-force limit would discard.
- Compression and wear matter.
  - [Chadli et al. (2018)](https://doi.org/10.1016/j.measurement.2018.07.036) compared new and worn gloves at several impact energies.
  - They measured whole-glove compression and energy or acceleration attenuation, not only peak force.
- Force and deformation can be used to calibrate a simple glove model.
  - [Amauger (2022), chapter 7](https://theses.hal.science/tel-04105395) placed a 1.3 kg steel sphere inside a glove, dropped it onto a load cell, and filmed the deformation.
  - The experiment estimated a damping term for a simplified fist-glove model. It was not a standardized commercial-glove comparison.
- These rigs are useful, but their results are not interchangeable. The striker, glove mounting, target, impact energy, and recorded measures differ.

#### Foam compression studies

- One model form can describe different foam responses.
  - [Alzoubi, Al-Hallaj, and Abu-Ayyad (2014)](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/) fitted the same compression model to HR foam, latex, and four flexible PU foams.
  - Each foam had its own parameters for how resistance builds through compression.
  - This gives us the idea of a material **profile**: the curve used to describe one foam grade.
- EVA can be described in a similar way.
  - [Wu et al. (2023)](https://doi.org/10.3390/polym15234514) fitted a rate-dependent curve to one 35 kg/m³ closed-cell EVA foam.
  - We use that curve shape with supplier test points to estimate profiles for EV30, EV50, and the EVA75 target.
  - EV30 and EV50 have two supplier compression points. EVA75 has only one nominal point, so its estimated profile is less constrained.
- These are starting shapes, not measurements of our retail foams.
  - The published specimens were different products, and their test rates were below boxing-impact rates.
  - [Chen et al. (2024)](https://doi.org/10.3390/polym16010034) supports the broader finding that EVA density and loading rate matter, but its fitted curves are not used for our grades.

#### Human-punch studies

- Human studies give us plausible impact masses and speeds. ([Walilko et al. (2005)](https://pubmed.ncbi.nlm.nih.gov/16183766/); [Adamec et al. (2021)](https://pubmed.ncbi.nlm.nih.gov/33057792/))
- They do not isolate the glove. The boxer, hand and wrist, glove, target, and sensors all shape the measured response.

- Together, these studies show that glove response can be measured and foam curves can be modeled. They do not connect a disclosed foam stack to its complete impact response or perceived feel.

### How far this evidence answers our questions

- The research gives us useful test methods and starting shapes for foam curves. It does not give us measured curves for the exact foams we may buy.
- If we combine those curves with the stack, striker, hand, and target models, we can estimate:
  - peak force;
  - maximum compression;
  - loading work;
  - impulse;
  - time to peak and loading rate.
- These results follow from the model's inputs. That does not mean they are accurate measurements of a real glove.
- The model can help us compare stack changes under the same assumptions.
- It cannot yet support claims about real-world protection, impact feel, or which glove is better because:
  - the retail foam curves are estimated from limited supplier data;
  - boxing-rate behavior is extrapolated;
  - the hand, target, and contact are simplified;
  - unloading, rebound, recovery, and wear are not modeled.
- “Poppy,” “pillowy,” and “responsive” may relate to the measured response, but we have not tested that link.
- The main check is a physical test of a known stack at several impact energies.
  - Compare the measured and predicted force-time and compression histories without first tuning the model to match them.
  - Until that works, treat this as a screening model that produces testable predictions, not as a virtual glove test.

## 5. A punch in simple mechanical terms

> **Section intent:** Explain the two inputs that define the incoming strike and why impact force is an outcome, not an input.

- The model starts with hand speed and striking mass at first contact.
- Striking mass, often called effective mass in research, is the part of the hand, arm, and body that contributes to the impact.
  - It is not the literal weight of the fist or the boxer's full body mass.
- Together, mass and speed set the incoming kinetic energy:

$$
E=\frac{1}{2}mv^2
$$

- Force develops after contact as the glove and target deform and slow the strike.
- The foam stack changes the distance and time over which that slowing happens.
- The same incoming strike can therefore produce different force histories with different gloves or targets.
- A rigid plate, padded plate, heavy bag, and human body are different targets and will give different results.

## 6. The physical model

> **Section intent:** Show how the model turns a strike and a foam stack into force over time.

### Model inputs

- A rigid striker represents the incoming punch. It has the striking mass and speed from Section 5.
- Each foam layer has a thickness and a compression curve.
- The striker shape determines how much foam is in contact as it presses inward.
- For a human punch, a simple spring represents movement of the hand and wrist.
- The target can be a rigid support, a fixed padded plate, or a moving bag.
- A padded target also compresses. A moving bag compresses and moves away.
- The basic chain is: striker -> hand and wrist spring -> layered foam -> target.

### Foam profiles

- Supplier data give only a few points. The model needs a complete compression curve for each foam.
- One or two supplier values anchor each foam's curve.
- A published curve from the same broad foam family fills the gaps between those points.
- Beyond the published range, we provisionally use foam density to estimate where resistance rises sharply.
- Published rate data provide a provisional estimate of how faster compression changes the curve.
- Both the high-compression extension and the rate adjustment need testing on the chosen foams.

### Calculating the impact

- The striker presses the layered pad into the target.
- The model divides the contact surface into small areas.
- At each small patch of contact, the layers carry the same pressure but compress by different amounts according to their curves.
- In this model, the layers act in series, so changing their order does not change the result.
- The model multiplies the pressure in each small area by its area, then adds those forces.
- The model uses that force to calculate how the striker slows as the foam compresses.
- The result is force and compression over time through the modeled compression phase.

> **Possible extension:** Allow neighboring contact areas to affect each other.
>
> - This could represent sideways bulging and load spreading.
> - It could also make the response depend on layer order.
> - It requires evidence about sideways and shear stiffness, bonding or sliding between layers, cover tension, and changes in contact area.

## 7. What we compare

> **Section intent:** Compare how force builds and how each stack uses its available compression.

### Read the complete response

- Force over time shows how quickly force builds and where it peaks.
- Force against compression shows how the stack uses its available travel.
- Two stacks can reach a similar peak through very different buildup and compression paths.

### Core comparison measures

- Peak force $F_{\max}$, in N, is the highest force reached during compression under the chosen strike and target.
- The 10%-to-90% loading rate describes how quickly force rises through the main part of the impact.
- $t_{10}$ and $t_{90}$, in seconds, are the first times force reaches 10% and 90% of peak.
- Loading rate, in N/s, is:

$$
\text{loading rate}_{10-90}=\frac{0.8F_{\max}}{t_{90}-t_{10}}
$$

- At the same peak force, a higher loading rate means a faster buildup.
- Maximum stack compression is the greatest amount the foam stack shortens at the centre, beneath the striker tip.
- Reporting it in millimetres and as a percentage of starting thickness allows stacks of different thicknesses to be compared.
- Compression and remaining thickness for each layer are also measured at the centre. They show which layers compressed most and which entered the steep part of their curves.
- Loading work is the energy transferred into a component as it compresses.
- Work shares show how much energy goes into compressing each foam layer, the hand and wrist spring, and the target.
- Loading work includes energy that could return during rebound. It does not measure permanent energy absorption.

## 8. Results and discussion plan

> **Section intent:** Keep this as an empty scaffold until the experimental question and validation plan are settled. When results exist, organize the discussion around what was learned, what changed our expectations, and which conclusions survive uncertainty. Do not fill this section with current simulation rankings.

- State the final research question and comparison conditions before showing outcomes.
- Describe the tested materials and missing data.
- Show measured compression curves before modeled glove results.
- Compare material families without implying that one family is always better.
- Separate effects of thickness, density, curve shape, and loading rate.
- Report complete force-time and force-displacement behavior, not only one score.
- Discuss target dependence.
- Show repeatability and uncertainty.
- Identify where the simple model agrees with physical tests and where it fails.
- End with conclusions that are limited to the tested materials, glove geometry, impacts, and targets.

## 9. References and reading notes

> **Section intent:** Keep the overall citation list. For each source, record the key finding and why it is useful or relevant to this project.

### Standards, rules, and approval references

- [SATRA, PPE for use in martial arts](https://www.satra.com/spotlight/article.php?id=423)
  - This summary of EN 13277 includes controlled impacts and transmitted-force limits for some martial-arts hand protectors.
  - It gives us the 3 J and 10 J pass-or-fail benchmark discussed above. We use it as context, not as the target for the glove design, and note that the standard concerns protection of the wearer's hand rather than the opponent.
- [EN 13277-7:2009 preview, hand and foot protectors](https://cdn.standards.iteh.ai/samples/26354/0e49f762fd014431939bb6888166baf2/SIST-EN-13277-7-2009.pdf)
  - Defines the scope, classes, coverage, restraint, and impact-performance framework for martial-arts hand protectors, including boxing.
  - The preview explicitly excludes the protector's performance for the opponent. The complete controlled standard, rather than this preview, would be needed for certification work.
- [World Boxing Competition Rules, November 2024](https://worldboxing.org/wp-content/uploads/2024/11/World-Boxing-Competition-Rules-Nov-2024-Approved.pdf)
  - Specifies competition-glove weight, the minimum share assigned to padding, condition, closure, materials, and thumb attachment.
  - These requirements define competition eligibility and construction boundaries; they do not publish a padding response curve or layer recipe.
- [IBA, Guidelines for the Approval of Boxing Equipment](https://www.iba.sport/wp-content/uploads/2025/09/IBA_Equipment_Guidelines_FV.pdf)
  - Describes laboratory testing, field verification, approval, and periodic control at a high level.
  - It helps separate the equipment-approval process from the material data needed to model a foam stack.

### Foam measurements and datasheets

- [ISO 2439:2008, indentation hardness of flexible cellular materials](https://www.iso.org/standard/42717.html)
  - Defines several indentation-hardness methods, including measurements at 25%, 40%, and 65% indentation, plus hysteresis-related information.
  - This helps us decode IFD/ILD and support factor. It also warns us not to turn one test value directly into a design answer.
- [ASTM D3574, flexible urethane foam test methods](https://store.astm.org/d3574-25.html)
  - Collects standard tests used for flexible PU foam research, quality control, and specification.
  - It helps interpret the test names and conditions reported on PU supplier datasheets.
- [ISO 3386-1:2025, compression stress-strain characteristics of low-density flexible cellular materials](https://www.iso.org/standard/89164.html)
  - Defines a method for measuring compression stress-strain behavior in low-density flexible cellular materials.
  - It provides a reference for what a directly measured compression curve represents.
- [Polyurethane Foam Association, foam performance](https://pfa.org/foam-performance/)
  - Gives plain definitions of density, 25% IFD, support factor, and flex fatigue.
  - This is a useful translation guide for supplier language, though it is aimed at flexible PU rather than every foam family.
- [Polyurethane Foam Association, foam test methods](https://pfa.org/foam-test-methods/)
  - Maps common PU properties to ASTM and other test methods.
  - It helps trace supplier terminology back to the test that produced each value.
- [Polyurethane Foam Association, laboratory testing of flexible polyurethane foam](https://pfa.org/wp-content/uploads/2022/05/InTouchv4.2new.pdf)
  - Explains IFD and CFD procedures, the nominal 50 in² indentation area, and the effect of specimen thickness.
  - It supports the model's conversion of ILD/IFD force into an average-pressure anchor.

### Commercial foam and target data

- [FoamOnline, Soft HR foam](https://foamonline.com/soft-foam/)
  - Lists density of 2.50 lb/ft³, 10 lbf ILD with a stated tolerance, and a minimum support factor of 2.7.
  - These values anchor the Soft HR commercial foam profile.
- [Foam Factory, HD36-HQ foam](https://canada.foambymail.com/hd36-hq-foam-sheet.html)
  - Lists density of 2.80 lb/ft³, 35 lbf ILD, and a minimum support factor of 1.9.
  - These values anchor the HD36-HQ commercial foam profile.
- [Foam Factory, Lux-HQ foam](https://canada.foambymail.com/lux-hq-foam-sheet.html)
  - Lists density of 2.80 lb/ft³, 50 lbf ILD, and a minimum support factor of 1.9.
  - These values anchor the Lux-HQ commercial foam profile.
- [Foam Factory, Qualux Firm foam](https://canada.foambymail.com/qualux-firm-foam-sheet.html)
  - Lists density of 3.10 lb/ft³, 65 lbf ILD, and a minimum support factor of 2.1.
  - These values anchor the Qualux Firm commercial foam profile.
- [Foam Factory, Dunlop latex foam](https://canada.foambymail.com/latex-foam-dunlop-sheet.html)
  - Lists density of 4.60 lb/ft³ and 29 lbf ILD, with no deeper compression point.
  - These values provide the single anchor for the Dunlop latex profile.
- [Zotefoams, Evazote EV30 product information](https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A034-Evazote-EV30.pdf)
  - Lists nominal density of 30 kg/m³ and compression stresses of 39 kPa at 25% and 100 kPa at 50%.
  - These values provide two anchors for the EV30 profile.
- [Zotefoams, Evazote EV50 product information](https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A037-Evazote-EV50.pdf)
  - Lists nominal density of 50 kg/m³ and compression stresses of 50 kPa at 25% and 116 kPa at 50%.
  - These values provide two anchors for the EV50 profile.
- [Ultralon Foam Group (2022), properties of low-density PE/EVA foams](https://www.ubuild.co.nz/wp-content/uploads/2022/10/properties-of-low-density-pe-eva-foams-feb-2022.pdf)
  - Lists EVA75 density of 68–82 kg/m³ and compression pressure of 42–68 kPa at 25%.
  - The model uses the midpoint values to anchor the fixed padded target.

### Foam compression research

- [Alzoubi, Al-Hallaj, and Abu-Ayyad (2014), modeling compression curves of flexible polyurethane foam](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/)
  - Reports compression tests and fitted curves for several PU foams and a latex foam at specified density, temperature, strain rate, and compression range.
  - The curve shapes give us somewhere to start with PU and latex. They are borrowed shapes, not measurements of the foam we may buy.
- [Wu et al. (2023), one-dimensional dynamic constitutive modeling of EVA foam](https://www.mdpi.com/2073-4360/15/23/4514)
  - Measures a 35 kg/m³ EVA foam at several compression rates and develops a rate-dependent model.
  - It gives us a full curve and a way to think about trapped gas and loading rate. It still covers only one EVA formulation and test shape.
- [Chen et al. (2024), mechanical behavior of closed-cell EVA foam under compression](https://www.mdpi.com/2073-4360/16/1/34)
  - Compares EVA foams across densities and compression rates, including energy-absorption and densification behavior.
  - It shows why density and loading rate matter. Its samples will not exactly match every EVA we consider.

### Punch and glove-impact research

- [Walilko, Viano, and Bir (2005), biomechanics of Olympic boxer punches](https://pubmed.ncbi.nlm.nih.gov/16183766/)
  - Reports hand speed, effective punch mass, force, energy transfer, and head responses for straight punches delivered to a Hybrid III dummy.
  - It gives us a concrete way to think about effective mass and controlled-impact inputs. The sample is small and should not define every punch.
- [Adamec et al. (2021), biomechanical assessment of punching techniques](https://pubmed.ncbi.nlm.nih.gov/33057792/)
  - Compares measured punch mechanics across techniques and provides another source for effective mass, speed, and force.
  - It shows how much the punch input can change with technique. Its values still belong to that apparatus and protocol.
- [Perkins et al. (2018), prototype boxing gloves under two target-padding conditions](https://doi.org/10.4236/wjet.2018.63037)
  - Tests several gloves on a mechanical fist and shows that target padding changes measured peak force and glove comparisons.
  - The useful surprise is that changing the target can change how the gloves compare. The drop rig is repeatable, but it is not a boxer or a human head.
- [Girodet et al. (2009), damping characteristics of nine French boxing gloves](https://doi.org/10.1080/10255840903080885)
  - Compares 10, 12, and 14 oz gloves from three manufacturers at 3, 10, and 20 J. Gloves of the same nominal weight produced different peak forces, with the differences growing at higher energy.
  - It shows why glove weight and a low-energy pass test cannot stand in for cushioning performance. It reports finished-glove comparisons rather than controlled layer changes.
- [Chadli et al. (2018), quantification of boxing-glove damping](https://doi.org/10.1016/j.measurement.2018.07.036)
  - Uses a rotary impactor to compare six new and worn 10 oz gloves at 4, 18, and 44 J using damping and whole-glove compression measures.
  - It helps with energy-range and wear questions, but its aggregate measures do not reveal which internal layer is stiffening or approaching densification.
- [Amauger (2022), thesis chapter 7](https://theses.hal.science/tel-04105395)
  - Places a 1.3 kg steel sphere inside a glove, drops it onto a load cell, and records force and glove deformation.
  - It shows how force and deformation measurements can calibrate a simplified fist-glove model.
- [Lee and McGill (2014), striking dynamics of boxing and MMA gloves](https://doi.org/10.18002/rama.v9i2.1175)
  - Measures peak force and loading rate during 10,000 repeated impacts and shows that glove response changes with accumulated use.
  - It supports durability testing and force-history measurements, while the comparison between one boxing glove and one MMA glove cannot isolate a general material or layer effect.
- [Smith et al. (2000), development of a boxing dynamometer](https://pubmed.ncbi.nlm.nih.gov/10902679/)
  - Measures punch force in a boxing-specific apparatus and compares groups of boxers.
  - It gives us another picture of punch force, as long as we keep the values tied to that dynamometer, those instructions, and those participants.
- [Buško et al. (2016), measuring punches and kicks with a modified punching bag](https://actabio.pwr.edu.pl/fcp/HGBUKOQtTKlQhbx08SlkTUARAUWRuHQwFDBoIVURNWHhQFVZpCFghUHcKVigEQUw/302/public/publikacje/v18-1-2016/7.pdf)
  - Reports the mass, diameter, and rigid-core padded construction of an instrumented punching bag.
  - The model uses its 41 kg mass and 0.42 m diameter for the moving-bag target.

