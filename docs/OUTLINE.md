Simulating the impact response of layered boxing-glove padding

# Introduction

- Most boxing gloves are sold using specifications such as weight, closure type, colour, and price.
- Those attributes help someone choose a product. Padding quality and performance remain unspecified.
- There is no standard, consumer-facing way to state how a glove's foam compresses, builds resistance, recovers, or changes with repeated use.
- Two gloves with the same weight and similar construction can therefore behave very differently on the hand and during impact.

- Boxing-glove padding is often built as a stack of different foams.
- The point of layering is to shape the compression profile of the glove as a whole.
  - The stack can give easily at first, then build support as the punch gets harder.
  - It can provide useful compression travel and delay a sudden, harsh bottoming point.
  - Different layers can shape initial compliance, deeper support, and bottoming behaviour.
- The recipe is not published.
  - Published descriptions may name broad foam families. Layer thicknesses, formulations, and commercial grades remain undisclosed.
  - Published descriptions also omit the compression curves needed to reproduce or understand the stack.
- Market terms such as "pillowy" and "poppy" leave the response undefined.
  - "Pillowy" suggests initial softness. Support deeper into compression remains unclear.
  - "Poppy" may refer to crisp feedback, rebound, or simply the sound of a punch on the bag.
  - Both terms lack a shared test method or numerical scale.
- This leaves the design question: how can simulation help us compare foam stacks and design boxing-glove padding?
- A good solution should:
  - use the available compression travel and delay bottoming;
  - build resistance progressively as impact energy rises;
  - spread load across the knuckle padding;
  - control how force builds across a useful range of punches;
  - fit within the glove's thickness and weight limits;
  - feel predictable enough that the boxer still gets clear feedback from a punch.
- Those goals may pull against each other. The job of the model and the physical tests is to make those tradeoffs visible.
- End with a high-level map of the document:
  - define the mechanical role of padding;
  - identify the candidate foam families and available material data;
  - review the evidence and establish the remaining design gap;
  - construct the mathematical model and estimated foam-response curves;
  - compare foam families and stack architectures in the simulation;
  - draw practical conclusions for material and stack selection.

# Mechanical role of glove padding

- Foam increases the distance and time over which the fist decelerates after contact.
- As the foam compresses, it pushes back.
- A useful layer compresses easily enough at first, then builds support as compression increases.
- If the foam is too soft or too thin, it can run out of useful travel and become suddenly hard to compress.
- If it is too firm, force can build too quickly from the start.
- Combining layers lets us shape how the glove responds through the impact.
- The compression curve shows how resistance changes as the foam compresses.
- The target is a stack that uses its available travel, builds resistance progressively, and delays bottoming.
- A compression curve records the response of one foam under a defined test.
- To understand the glove, we must connect each layer's curve and thickness to the response of the assembled stack during impact.
- We therefore need three kinds of evidence:
  - compression tests for the materials;
  - impact tests for the complete glove;
  - realistic impact conditions for the boxer, hand, and target.

# Candidate foam materials and data

- Foam-family names suggest broad tendencies. A grade's density, firmness, resilience, and compression curve determine its response.
- Conventional flexible polyurethane, or PU, ranges from soft and yielding to firm and supportive.
  - Softer grades can contribute initial compliance and comfort.
  - Firmer grades can provide transition support deeper in the stack.
- High-resilience PU, or HR PU, is a flexible PU formulated for greater resilience and faster recovery.
  - Its stronger rebound can produce a livelier feel.
  - Its support through compression can make it useful in a middle or backing layer.
- Latex foam is elastic, resilient, and relatively dense.
  - Its rebound is commonly perceived as springy or responsive.
  - Its mass and sustained resistance through compression affect where and how much of it can be used.
- EVA is a closed-cell foam that ranges widely in density and firmness.
  - It can provide firm early resistance and structural support in a thin layer.
  - Denser or firmer grades can feel crisp and direct.

# Evidence base and design gap

## Commercial data and limitations

- Commercial foam listings usually report density and one or more firmness values.
- Complete loading and unloading curves for specific commercial grades are rarely published.
- Loading-rate effects, thickness effects, fatigue, and variation between samples and batches are also seldom reported.
- Suppliers use different test methods, specimen dimensions, units, and compression levels, which limits direct comparison.
- Finished-glove specifications usually omit foam grades, layer thicknesses, and stack order.
- Finished-glove tests use different strikers, targets, impact energies, and reported measures.
- Few glove tests report force-time history, deformation, compression, and repeated-impact behavior together.
- These gaps prevent a full mechanical description of a commercial foam or finished glove from its published specifications.

## Standards and competition rules

- Competition rules mostly answer: **may this glove be used?**
  - They specify weight, padding allowance, materials, dimensions, thumb attachment, closure, condition, and approval. ([World Boxing rules](https://worldboxing.org/wp-content/uploads/2024/11/World-Boxing-Competition-Rules-Nov-2024-Approved.pdf))
  - Padding compression, recovery, and impact feel fall outside these requirements.
- EN 13277-7 asks a narrower performance question: **does this hand protector keep transmitted peak force below a limit in a prescribed drop test?**
  - A 2.5 kg striker with an 80 mm domed face and 100 mm radius is dropped onto the glove. The glove rests on a rigid 90 mm half-cylinder with a load cell under its central anvil. ([SATRA summary of EN 13277](https://www.satra.com/spotlight/article.php?id=423))
  - Class A and B protectors receive 3 J impacts; the increased-protection zone of Class B also receives 10 J impacts. The stated peak-force limit is 2 kN. ([SATRA summary](https://www.satra.com/spotlight/article.php?id=423))
  - The standard concerns protection of the wearer's hand. It expressly excludes performance for the opponent. ([EN 13277-7:2009 preview](https://cdn.standards.iteh.ai/samples/26354/0e49f762fd014431939bb6888166baf2/SIST-EN-13277-7-2009.pdf))
- The standard provides a repeatable pass/fail screen based on peak force. Full force-time and compression histories can distinguish gloves that receive the same result.

## Relevant impact and material research

- Each research method captures a different part of the response.

### Finished-glove impact tests

- Glove weight is an unreliable predictor of impact response.
  - [Girodet et al. (2009)](https://doi.org/10.1080/10255840903080885) tested nine 10, 12, and 14 oz gloves at 3, 10, and 20 J.
  - Gloves of the same weight produced different peak forces, and the differences grew at higher energy.
- The target can change the result and the comparison between gloves.
  - [Perkins et al. (2018)](https://doi.org/10.4236/wjet.2018.63037) dropped gloves fitted to a mechanical fist onto a force plate covered with either 25 or 50 mm of EVA75.
  - Target thickness changed peak force, loading rate, contact time, and the relative performance of the gloves.
  - Their force-time curves also retained information that a peak-force limit would discard.
- Compression and wear matter.
  - [Chadli et al. (2018)](https://doi.org/10.1016/j.measurement.2018.07.036) compared new and worn gloves at several impact energies.
  - They measured whole-glove compression, energy or acceleration attenuation, and peak force.
- Force and deformation can be used to calibrate a simple glove model.
  - [Amauger (2022), chapter 7](https://theses.hal.science/tel-04105395) placed a 1.3 kg steel sphere inside a glove, dropped it onto a load cell, and filmed the deformation.
  - The experiment estimated a damping term for a simplified fist-glove model.
- Differences in striker, glove mounting, target, impact energy, and recorded measures prevent direct comparison among the rigs.

### Foam compression studies

- One model form can describe different foam responses.
  - [Alzoubi, Al-Hallaj, and Abu-Ayyad (2014)](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/) fitted the same compression model to HR foam, latex, and four flexible PU foams.
  - Each foam had its own parameters for how resistance builds through compression.
  - This gives us the idea of a material profile: the curve used to describe one foam grade.
- EVA can be described in a similar way.
  - [Wu et al. (2023)](https://doi.org/10.3390/polym15234514) fitted a rate-dependent curve to one 35 kg/m³ closed-cell EVA foam.
  - Its curve shape provides a starting point for estimating profiles for the EVA grades under consideration.
  - Those estimates remain limited by the number and quality of supplier compression points for each grade.
- EVA response changes with density and loading rate.
  - [Chen et al. (2024)](https://doi.org/10.3390/polym16010034) compared EVA foams across several densities and compression rates.

### Human-punch studies

- Human studies provide plausible ranges for effective punch mass and hand speed. ([Walilko et al. (2005)](https://pubmed.ncbi.nlm.nih.gov/16183766/); [Adamec et al. (2021)](https://pubmed.ncbi.nlm.nih.gov/33057792/))
- The measured response combines the boxer, hand and wrist, glove, target, and sensors.

- Together, these studies establish ways to measure glove response and model foam curves. A link between a disclosed foam stack, its complete impact response, and its perceived feel remains missing.

# Mathematical model

# Simulation analysis

# Conclusion

- Summarize how the selected foam grades behaved through compression.
- Summarize the useful roles and limits of conventional PU, HR PU, EVA, and latex.
- State the tradeoffs between density, firmness, weight, early response, peak force, and compression reserve.
- Compare the soft and responsive architectures across their useful impact ranges.
- Connect stack selection to punch range, thickness, weight, and desired feel.
- Present the analysis as a structured basis for choosing materials when comparable foam data are limited.
- Connect the available data to explicit tradeoffs in response, force control, compression reserve, thickness, and weight.
- State its practical purpose: make the reasons for each material choice visible.

# References and source notes

## Standards and competition rules

- [SATRA, PPE for use in martial arts](https://www.satra.com/spotlight/article.php?id=423)
  - This summary of EN 13277 includes controlled impacts and transmitted-force limits for some martial-arts hand protectors.
  - It provides the 3 J and 10 J pass-or-fail benchmarks for wearer protection.
- [EN 13277-7:2009 preview, hand and foot protectors](https://cdn.standards.iteh.ai/samples/26354/0e49f762fd014431939bb6888166baf2/SIST-EN-13277-7-2009.pdf)
  - Defines the scope, classes, coverage, restraint, and impact-performance framework for martial-arts hand protectors, including boxing.
  - The preview explicitly excludes the protector's performance for the opponent. Certification work requires the complete controlled standard.
- [World Boxing Competition Rules, November 2024](https://worldboxing.org/wp-content/uploads/2024/11/World-Boxing-Competition-Rules-Nov-2024-Approved.pdf)
  - Specifies competition-glove weight, the minimum share assigned to padding, condition, closure, materials, and thumb attachment.
  - These requirements define competition eligibility and construction boundaries. Padding response curves and layer recipes fall outside their scope.
- [IBA, Guidelines for the Approval of Boxing Equipment](https://www.iba.sport/wp-content/uploads/2025/09/IBA_Equipment_Guidelines_FV.pdf)
  - Describes laboratory testing, field verification, approval, and periodic control at a high level.
  - It helps separate the equipment-approval process from the material data needed to model a foam stack.

## Test methods and supplier data

- [ISO 2439:2008, indentation hardness of flexible cellular materials](https://www.iso.org/standard/42717.html)
  - Defines several indentation-hardness methods, including measurements at 25%, 40%, and 65% indentation, plus hysteresis-related information.
  - It places IFD/ILD and support factor within the broader compression response.
- [ASTM D3574, flexible urethane foam test methods](https://store.astm.org/d3574-25.html)
  - Collects standard tests used for flexible PU foam research, quality control, and specification.
  - It helps interpret the test names and conditions reported on PU supplier datasheets.
- [ISO 3386-1:2025, compression stress-strain characteristics of low-density flexible cellular materials](https://www.iso.org/standard/89164.html)
  - Defines a method for measuring compression stress-strain behavior in low-density flexible cellular materials.
  - It provides a reference for what a directly measured compression curve represents.
- [Polyurethane Foam Association, foam performance](https://pfa.org/foam-performance/)
  - Gives plain definitions of density, 25% IFD, support factor, and flex fatigue.
  - It provides a translation guide for flexible-PU supplier language.
- [Polyurethane Foam Association, foam test methods](https://pfa.org/foam-test-methods/)
  - Maps common PU properties to ASTM and other test methods.
  - It helps trace supplier terminology back to the test that produced each value.
- [Polyurethane Foam Association, laboratory testing of flexible polyurethane foam](https://pfa.org/wp-content/uploads/2022/05/InTouchv4.2new.pdf)
  - Explains IFD and CFD procedures, the nominal 50 in² indentation area, and the effect of specimen thickness.
  - It supports the model's conversion of ILD/IFD force into an average-pressure anchor.

## Foam compression studies

- [Alzoubi, Al-Hallaj, and Abu-Ayyad (2014), modeling compression curves of flexible polyurethane foam](https://pure.psu.edu/en/publications/modeling-of-compression-curves-of-flexible-polyurethane-foam-with/)
  - Reports compression tests and fitted curves for several PU foams and a latex foam at specified density, temperature, strain rate, and compression range.
  - The fitted curve forms provide candidate shapes for modeling PU and latex.
- [Wu et al. (2023), one-dimensional dynamic constitutive modeling of EVA foam](https://www.mdpi.com/2073-4360/15/23/4514)
  - Measures a 35 kg/m³ EVA foam at several compression rates and develops a rate-dependent model.
  - The study provides a full EVA curve and separates contributions from trapped gas and loading rate.
- [Chen et al. (2024), mechanical behavior of closed-cell EVA foam under compression](https://www.mdpi.com/2073-4360/16/1/34)
  - Compares EVA foams across densities and compression rates, including energy-absorption and densification behavior.
  - It establishes the sensitivity of EVA response to density and loading rate.

## Punch and glove-impact studies

- [Walilko, Viano, and Bir (2005), biomechanics of Olympic boxer punches](https://pubmed.ncbi.nlm.nih.gov/16183766/)
  - Reports hand speed, effective punch mass, force, energy transfer, and head responses for straight punches delivered to a Hybrid III dummy.
  - It provides ranges for effective mass and controlled-impact inputs from a small sample.
- [Adamec et al. (2021), biomechanical assessment of punching techniques](https://pubmed.ncbi.nlm.nih.gov/33057792/)
  - Compares measured punch mechanics across techniques and provides another source for effective mass, speed, and force.
  - It shows how much the punch input can change with technique. Its values still belong to that apparatus and protocol.
- [Perkins et al. (2018), prototype boxing gloves under two target-padding conditions](https://doi.org/10.4236/wjet.2018.63037)
  - Tests several gloves on a mechanical fist and shows that target padding changes measured peak force and glove comparisons.
  - Changing the target padding changed the relative glove results. The rig represents a controlled drop test.
- [Girodet et al. (2009), damping characteristics of nine French boxing gloves](https://doi.org/10.1080/10255840903080885)
  - Compares 10, 12, and 14 oz gloves from three manufacturers at 3, 10, and 20 J. Gloves of the same nominal weight produced different peak forces, with the differences growing at higher energy.
  - The results show that glove weight and a low-energy result weakly predict cushioning across energies. The study compares complete gloves.
- [Chadli et al. (2018), quantification of boxing-glove damping](https://doi.org/10.1016/j.measurement.2018.07.036)
  - Uses a rotary impactor to compare six new and worn 10 oz gloves at 4, 18, and 44 J using damping and whole-glove compression measures.
  - Its aggregate measures address energy range and wear. Layer-level behavior remains unresolved.
- [Amauger (2022), thesis chapter 7](https://theses.hal.science/tel-04105395)
  - Places a 1.3 kg steel sphere inside a glove, drops it onto a load cell, and records force and glove deformation.
  - It shows how force and deformation measurements can calibrate a simplified fist-glove model.
- [Lee and McGill (2014), striking dynamics of boxing and MMA gloves](https://doi.org/10.18002/rama.v9i2.1175)
  - Measures peak force and loading rate during 10,000 repeated impacts and shows that glove response changes with accumulated use.
  - It supports durability testing and force-history measurements. Its one-glove-per-type comparison leaves general material and layer effects unresolved.
- [Smith et al. (2000), development of a boxing dynamometer](https://pubmed.ncbi.nlm.nih.gov/10902679/)
  - Measures punch force in a boxing-specific apparatus and compares groups of boxers.
  - Its punch-force values are specific to that dynamometer, protocol, and participant group.
- [Buško et al. (2016), measuring punches and kicks with a modified punching bag](https://actabio.pwr.edu.pl/fcp/HGBUKOQtTKlQhbx08SlkTUARAUWRuHQwFDBoIVURNWHhQFVZpCFghUHcKVigEQUw/302/public/publikacje/v18-1-2016/7.pdf)
  - Reports the mass, diameter, and rigid-core padded construction of an instrumented punching bag.
  - The model uses its 41 kg mass and 0.42 m diameter for the moving-bag target.

