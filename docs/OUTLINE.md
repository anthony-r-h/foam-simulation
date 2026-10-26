# Simulating the impact response of layered boxing-glove padding

## Working status

> **Document intent:** This document is an outline for a design investigation. We are making a boxing glove, investigating padding materials. The document should follow that problem from basic questions to useful tests. `METHODOLOGY.md` is source material only; its structure and current simulation choices are not settled here.

- Start with the glove we want to make, then work outward into the material science and impact mechanics needed to make sensible choices.
- Use plain language first. Add equations only after each idea makes sense without them.
- Treat existing gloves, product descriptions, and standards as clues, not as the subject of the project.
- Keep claims about protection narrow. Comparing foam does not tell us everything about injury or glove safety.
- This is not a boxing glove audit.
- Keep detailed model development in `MODEL.md` and completed simulation analysis in `ANALYSIS.md`.
- Treat `MODEL.md` and `ANALYSIS.md` as complete top-level sections. Preserve their internal heading hierarchy when combining the documents.
- Mark uncertain claims and missing evidence instead of smoothing over them.

## 1. Introduction

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
- End with a high-level map of the document:
  - define the mechanical role of padding;
  - identify the candidate foam families and available material data;
  - review the evidence and establish the remaining design gap;
  - construct the mathematical model and estimated foam-response curves;
  - compare foam families and stack architectures in the simulation;
  - draw practical conclusions for material and stack selection.

## 2. Mechanical role of glove padding

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

## 3. Candidate foam materials and data

> **Section intent:** Explain the foam families under consideration, why the response of each grade matters, and what must be measured before selecting materials.

- The working set covers flexible PU, including HR grades, latex, and EVA.
- The working set can change as grades are added or removed. It is not a fixed shortlist.
- Their use in commercial boxing gloves has not been established.
- Density and firmness are different properties.

### Foam families and material grades

- Flexible polyurethane, or PU, covers a wide range of densities and firmness levels.
  - High-resilience, or HR, is a type of flexible PU associated with stronger recovery and support.
  - Neither label defines a compression curve.
- Latex foam is known for a springy response and strong recovery.
  - Dunlop describes how the foam is made. It does not specify its firmness or curve.
- EVA is a closed-cell foam available across a wide range of densities and firmness levels.
  - A commercial grade name does not define how every EVA foam behaves.
- The grade and its measured response matter more than the family name.

### Available data and limitations

- Full loading and unloading curves for the purchased foams.
- Tests at glove-layer thicknesses and punch-like loading rates.
- Recovery and change after repeated impacts.
- Variation between samples and batches.

## 4. Evidence base and design gap

> **Section intent:** Rules, standards, and research answer different questions: may the glove be used, does it pass a protection test, and how does it respond during impact? Together they still do not connect measured foam curves to the response of a finished glove.

### Standards and competition rules

- Competition rules mostly answer: **may this glove be used?**
  - They specify weight, padding allowance, materials, dimensions, thumb attachment, closure, condition, and approval. ([World Boxing rules](https://worldboxing.org/wp-content/uploads/2024/11/World-Boxing-Competition-Rules-Nov-2024-Approved.pdf))
  - They do not describe the padding's compression curve, recovery, or impact feel.
- EN 13277-7 asks a narrower performance question: **does this hand protector keep transmitted peak force below a limit in a prescribed drop test?**
  - A 2.5 kg striker with an 80 mm domed face and 100 mm radius is dropped onto the glove. The glove rests on a rigid 90 mm half-cylinder with a load cell under its central anvil. ([SATRA summary of EN 13277](https://www.satra.com/spotlight/article.php?id=423))
  - Class A and B protectors receive 3 J impacts; the increased-protection zone of Class B also receives 10 J impacts. The stated peak-force limit is 2 kN. ([SATRA summary](https://www.satra.com/spotlight/article.php?id=423))
  - The standard concerns protection of the wearer's hand. It expressly excludes performance for the opponent. ([EN 13277-7:2009 preview](https://cdn.standards.iteh.ai/samples/26354/0e49f762fd014431939bb6888166baf2/SIST-EN-13277-7-2009.pdf))
- This is useful as a repeatable pass/fail screen. It does not describe the full force-time or compression response, so two passing gloves may still feel and behave very differently.

### Relevant impact and material research

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
  - Its curve shape provides a starting point for estimating profiles for the EVA grades under consideration.
  - Those estimates remain limited by the number and quality of supplier compression points for each grade.
- These are starting shapes, not measurements of our retail foams.
  - The published specimens were different products, and their test rates were below boxing-impact rates.
  - [Chen et al. (2024)](https://doi.org/10.3390/polym16010034) supports the broader finding that EVA density and loading rate matter, but its fitted curves are not used for our grades.

#### Human-punch studies

- Human studies give us plausible impact masses and speeds. ([Walilko et al. (2005)](https://pubmed.ncbi.nlm.nih.gov/16183766/); [Adamec et al. (2021)](https://pubmed.ncbi.nlm.nih.gov/33057792/))
- They do not isolate the glove. The boxer, hand and wrist, glove, target, and sensors all shape the measured response.

- Together, these studies show that glove response can be measured and foam curves can be modeled. They do not connect a disclosed foam stack to its complete impact response or perceived feel.

### Implications for the present study

- The research gives us useful test methods and starting shapes for foam curves. It does not give us measured curves for the exact foams we may buy.
- The model can compare stack changes under the same assumptions. It does not establish the performance or feel of a real glove.
- The main check is a physical test of a known stack at several impact energies.
  - Compare the measured and predicted force-time and compression histories without first tuning the model to match them.
  - Until that works, treat this as a screening model that produces testable predictions, not as a virtual glove test.

# Mathematical model

> **Section intent:** Use `MODEL.md` as the source for this section. It defines the mechanical setup, foam-curve construction, calculation, equations, worked example, reported measures, assumptions, limits, and adaptations to published tests.

# Simulation analysis

> **Section intent:** Use `ANALYSIS.md` as the authored source for this section. It states the simulation question and conditions, compares foam families and response types, develops soft and responsive recipes, and tests how the findings change with sample weight, thickness, and punch energy. Render its table directives before combining the documents.

# Conclusion

> **Section intent:** Summarize what the model contributed, the main material and stack-design implications, and the practical purpose of the exercise. Keep this as authored prose in the combined document.

## Design implications

- Explain why the foam grade and its full compression curve matter more than the family name alone.
- Summarize the useful roles and limits of conventional PU, HR PU, EVA, and latex.
- State the tradeoffs between density, firmness, weight, early response, peak force, and compression reserve.
- Compare the soft and responsive architectures across their useful impact ranges.
- Connect stack selection to punch range, thickness, weight, and desired feel.

## Practical interpretation

- Present the analysis as a structured basis for choosing materials when comparable foam data are limited.
- Connect the available data to explicit tradeoffs in response, force control, compression reserve, thickness, and weight.
- State its practical purpose: make the reasons for each material choice visible.

# References and source notes

> **Section intent:** Keep the overall citation list. For each source, record the key finding and why it is useful or relevant to this project.

## Standards and competition rules

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

## Test methods and supplier data

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

## Foam compression studies

- [Alzoubi, Al-Hallaj, and Abu-Ayyad (2014), modeling compression curves of flexible polyurethane foam](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/)
  - Reports compression tests and fitted curves for several PU foams and a latex foam at specified density, temperature, strain rate, and compression range.
  - The curve shapes give us somewhere to start with PU and latex. They are borrowed shapes, not measurements of the foam we may buy.
- [Wu et al. (2023), one-dimensional dynamic constitutive modeling of EVA foam](https://www.mdpi.com/2073-4360/15/23/4514)
  - Measures a 35 kg/m³ EVA foam at several compression rates and develops a rate-dependent model.
  - It gives us a full curve and a way to think about trapped gas and loading rate. It still covers only one EVA formulation and test shape.
- [Chen et al. (2024), mechanical behavior of closed-cell EVA foam under compression](https://www.mdpi.com/2073-4360/16/1/34)
  - Compares EVA foams across densities and compression rates, including energy-absorption and densification behavior.
  - It shows why density and loading rate matter. Its samples will not exactly match every EVA we consider.

## Punch and glove-impact studies

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

