# Choosing and characterizing foam for a boxing glove

## Working status

> **Agent commentary:** This document is an outline for a design investigation. We are making a boxing glove, and one of the hardest choices is what padding to put over the knuckles. The document should follow that problem from basic questions to useful tests. `METHODOLOGY.md` is source material only; its structure and current simulation choices are not settled here.

- Start with the glove we want to make, then work outward into the material science and impact mechanics needed to make sensible choices.
- Use plain language first. Add equations only after each idea makes sense without them.
- Treat existing gloves, product descriptions, and standards as clues, not as the subject of the project.
- Keep claims about protection narrow. Comparing foam does not tell us everything about injury or glove safety.
- Leave numerical simulation methods, parameter sweeps, rankings, and results out of this draft.
- Mark uncertain claims and missing evidence instead of smoothing over them.

## 1. Why this project exists

> **Agent commentary:** Start with the design gap, not the premise that a glove needs padding. A multilayer stack lets us shape how the glove compresses, but there is no published recipe to follow. The language used to describe glove feel is vivid but hard to design from. This section should turn "good foam" into a broader set of goals without pretending that one number can settle the choice.

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

## 2. Why existing tests do not answer the design question

> **Agent commentary:** Keep the standards discussion to the one distinction that matters here. Existing tests ask whether a protector stays under a force limit during a prescribed impact. We want enough detail to design the foam stack. If we call the limits generous, show that later by placing them beside the force ranges from our model rather than relying on the adjective.

- Existing European hand-protector tests use prescribed impact energies, including 3 J and 10 J, and compare the transmitted peak force with a limit.
- That is a pass-or-fail question under a small set of test conditions.
- Passing does not tell us:
  - the shape of the force-time curve;
  - when each foam layer begins to stiffen;
  - how close the stack comes to bottoming out;
  - how two passing designs differ from each other;
  - what happens when thickness, layer order, impact speed, or impact energy changes.
- Our question is much more detailed: how does the complete response change as we change the materials and construction of the stack?
- The simulation lets us explore many candidate stacks and impact conditions, then compare peak force, loading rate, compression travel, energy, and other parts of the response.
- Physical testing will eventually be needed to check the model, but the purpose here is design exploration and quantification, not certification.

## 3. What foam is doing inside a glove

> **Agent commentary:** Give the reader a physical picture before naming material families. Foam is a solid framework with gas-filled space. Under load, the framework bends, the cells collapse, and the material eventually becomes much harder to compress. A simple sketch of those stages would be more useful than a dense chemistry lesson.

- Foam is mostly space held open by a thin solid structure.
- When it is squeezed:
  - the cell walls first bend or stretch;
  - cells then buckle or collapse over a broader range of compression;
  - at high compression, the remaining solid and closed space crowd together;
  - the force can then rise very quickly. This last region is often called densification.
- The useful part of a cushioning foam is usually the region where it can compress and take work without reaching that sharp force rise too early.
- A glove layer also needs enough recovery to regain its shape after the impact.
- The response depends on more than chemistry. Density, cell structure, thickness, temperature, loading speed, previous impacts, and manufacturing variation can all matter.
- Layers may be combined because one material rarely provides every desired property at once.

## 4. Main foam families

> **Agent commentary:** This should be a practical field guide, not a claim that every foam with the same chemical name behaves alike. The reader should learn the broad tendencies of flexible polyurethane, high-resilience polyurethane, latex, and EVA, while understanding that grade-level measurements matter more than family labels.

### Flexible polyurethane foam

- Flexible polyurethane, or PU, is common in cushioning products.
- It is often open-cell, so air can move through connected pores.
- It can be made in a wide range of densities and firmness levels.
- Density and firmness are separate properties. A dense PU foam can still be soft.
- Its response can depend on loading speed, air movement, temperature, and time under load.

### High-resilience polyurethane foam

- High-resilience, or HR, foam is a type of flexible PU designed for stronger recovery and support.
- It often has a higher support factor than conventional cushioning PU.
- “HR” does not define one exact compression curve.
- Supplier grade, density, firmness, and test conditions still have to be known.

### Latex foam

- Latex foam is made from rubber latex and can have a springy, resilient response.
- Dunlop and Talalay are manufacturing processes, not single material grades.
- Latex can differ in density, cell structure, firmness, formulation, and recovery.
- A 25% firmness number does not tell us how it behaves near deep compression or during a punch.

### EVA foam

- EVA is ethylene-vinyl acetate foam.
- The grades considered here are closed-cell materials, so gas is trapped within the cells.
- EVA is available across a wide density and firmness range.
- Published tests show that density and compression rate can change its stress, energy absorption, and densification behavior.
- Results for one EVA formulation should not be assumed to describe every other EVA formulation.

### Materials not yet covered well

- Polyethylene and blended closed-cell foams may appear in protective equipment.
- Molded or injected padding may not match flat sheet foam with a similar name.
- Horsehair, gels, air bladders, fabrics, adhesives, leather tension, and stitched structures can change whole-glove behavior.
- These should be listed as outside the first material model, not quietly treated as foam.

## 5. How foam is described and measured

> **Agent commentary:** Foam catalogues throw around numbers such as density, IFD, and support factor. This section should make those numbers useful. The reader should know what each test actually does and why no single value can tell us how a foam will feel or behave in a punch. A drawing of a sample under an indenter would help more than another table of definitions.

- Density is mass divided by volume.
  - It often relates to durability and the amount of polymer present.
  - It is not a direct measure of firmness.
- Indentation force deflection, or IFD/ILD, is the force needed to indent a standard foam sample by a stated percentage of its thickness.
  - A common value is force at 25% indentation.
  - The result depends on specimen size, specimen thickness, indenter size, preconditioning, dwell time, and the written test method.
  - It is a force from a particular test, not a universal material stress.
- Support factor, or compression modulus, commonly compares 65% IFD with 25% IFD.
  - A larger ratio means the foam becomes more supportive as compression increases.
  - It still gives only two points from a slow indentation test.
- Compression-force deflection, or CFD, reports force or stress while a sample is compressed between plates.
  - This is closer to a stress-strain measurement, but the exact method and specimen still matter.
- Resilience tests estimate how readily a foam returns energy, often using ball rebound.
- Hysteresis compares loading and unloading.
  - The area between those curves is linked to energy lost during that cycle.
  - A loading curve alone cannot tell us how much energy is permanently dissipated.
- Compression set measures how much thickness is not recovered after a specified compression and recovery period.
- Flex-fatigue tests repeatedly compress foam and then measure changes in thickness or firmness.
- Tear strength, tensile strength, airflow, cell size, temperature, humidity, and ageing may also matter for a real glove.

### What the datasheet leaves open

- Foam specifications are usually written for purchasing and quality control in another industry.
- A seating-foam IFD value answers a useful seating question. It was not designed to describe a fast boxing impact.
- A few scalar values cannot define a nonlinear loading curve across all compression levels.
- Foam is rate-dependent, so a slow test and a fast impact may give different forces at the same compression.
- Thin layers can behave differently from the thick samples used in standard IFD tests.
- Formulations and manufacturing details may be proprietary.
- Product specifications may state allowable ranges rather than measurements from the exact sheet in hand.
- This does not make the datasheet bad. It just means we have more exploring to do before choosing a glove foam.

### What we know so far about candidate grades

- PU grades currently provide density and a 25% indentation value; some also provide a minimum support factor.
- The current latex source provides density and a 25% indentation value but not a deeper compression point.
- The current EVA datasheets provide density and compression stress at selected strains.
- Important missing or uncertain information includes:
  - complete loading curves for the exact purchased grades;
  - unloading curves and hysteresis;
  - behavior at boxing-impact rates;
  - results for thin glove-like specimens;
  - repeated-impact softening and permanent set;
  - temperature and humidity sensitivity;
  - batch variation and measurement uncertainty;
  - behavior after lamination, shaping, gluing, and stitching.

## 6. From test points to a compression curve

> **Agent commentary:** Explain how we can start with a handful of supplier values and sketch a fuller material response, but stop before discussing a numerical solver. Be candid about what we know, what we borrow from published research, and what we are guessing. A picture showing supplier points laid over a published curve shape would make that much easier to see.

- A compression curve answers: how much stress is needed to reach each amount of compression?
- Strain is the fraction of the original thickness that has been compressed.
  - A 20 mm layer shortened by 5 mm is at 25% compression strain.
- Stress is force divided by loaded area.
  - It lets us compare material tests with different sample areas more fairly.
- A typical foam curve has an early region, a broader collapse region, and a steep densification region.
- Supplier datasheets often provide only one or two points on that curve.
- The present source material uses published curve shapes for broad material families:
  - Alzoubi, Al-Hallaj, and Abu-Ayyad for flexible PU and latex;
  - Wu and colleagues for closed-cell EVA;
  - Chen and colleagues as supporting evidence for density and rate effects in EVA.
- The supplier's firmness points can be used as anchors to resize a published family curve.
- That gives us a working estimate, not a measurement of the exact foam in our hands.
- Main assumptions that must be stated plainly:
  - the published specimen is similar enough to provide the curve shape;
  - indentation data can be translated into an approximate stress anchor;
  - the curve can be extended into compression ranges not supplied by the vendor;
  - a rate adjustment from another specimen can say something useful about the selected grade.
- Before treating these curves as predictive, test the actual foams through loading and unloading at relevant thicknesses and speeds.

## 7. A punch in simple mechanical terms

> **Agent commentary:** Write this for a reader who remembers basic school physics but may mix up force, energy, momentum, and pressure. The important idea is that a punch does not arrive carrying one fixed amount of force. The force grows as the fist, glove, and target meet and deform.

- Speed tells us how fast the striking hand is moving just before contact.
- Effective mass is the part of the boxer’s moving body that acts as if it participates in the impact.
  - It is not the boxer’s full body mass.
  - It depends on technique and on how it is measured.
- Kinetic energy depends on effective mass and the square of speed.
  - Doubling speed gives four times the kinetic energy when mass is unchanged.
- Momentum depends on effective mass multiplied by speed.
- Force is not something stored in the punch before contact.
  - Force develops as the glove and target slow and deform each other.
  - The same incoming energy can produce different peak forces if the stopping distance or loading time changes.
- Impulse is force accumulated over time.
  - It equals the change in momentum of the system being studied.
- Pressure is force divided by contact area.
  - The same force spread over a larger area gives lower average pressure.
- Acceleration is how quickly velocity changes.
  - Target acceleration depends on the target’s mass, constraints, shape, and compliance as well as the glove.
- The target matters. A rigid plate, padded plate, heavy bag, and human head will not produce the same force-time curve from the same glove and incoming speed.
- Useful illustrations to add later:
  - equal mass with two different speeds;
  - equal energy with two different mass-speed combinations;
  - the same impact stopped over a short distance and a long distance;
  - a force-time curve with peak force and impulse marked.

## 8. The physical model we are trying to build

> **Agent commentary:** Keep this conceptual. The reader should be able to draw the model after reading the section: moving effective mass, hand/wrist give, layered glove padding, and a target. The impact rig should be presented as a repeatable stand-in for selected parts of a boxer, not as a literal mechanical boxer.

- The incoming boxer is reduced to two measured or estimated inputs:
  - effective striking mass;
  - hand speed at first contact.
- The hand and wrist are not perfectly rigid.
- A spring-like element can represent some combined hand and wrist give.
- The glove is represented as one or more foam layers with different thicknesses and compression curves.
- The impact surface may also deform or move.
- The basic chain is:
  - moving effective mass;
  - hand/wrist give;
  - glove padding;
  - target surface.
- All parts of that chain affect the force history.
- A laboratory impact rig replaces the boxer with a repeatable striker or mechanical fist.
- The rig can control mass, speed, shape, and impact location more consistently than a human punch.
- The rig does not reproduce muscle action, technique changes, fist clenching, wrist motion, or a boxer reacting to the target.
- A mechanical fist is therefore a test device, not a complete biomechanical model.
- Questions still to settle:
  - Which target best matches the question: hand protection, sparring-partner exposure, or material screening?
  - Should hand/wrist give be measured directly or treated as a sensitivity range?
  - How should contact area change as the glove compresses?
  - When should the target be allowed to translate, rotate, or deform?

## 9. Measurements and comparison metrics

> **Agent commentary:** Treat this as a candidate list, not a final scorecard. The reader should see what each metric tells us and what it leaves out. The screenshot suggests replacing two overlapping “abruptness” proxies with one 10%-to-90% loading-rate measure; that is worth testing, but the definition needs rules for filtering, interpolation, and irregular force curves.

- Peak force is the highest force reached during the chosen impact window.
  - It is easy to understand and common in protective-equipment testing.
  - It says nothing about how long the force lasted.
- Impulse is the area under the force-time curve.
  - It describes total momentum transfer over the measured interval.
  - A low peak can still accompany substantial impulse if the force lasts longer.
- Maximum padding compression describes how much travel the glove used.
  - It helps identify whether a layer approached densification.
  - “Thickness remaining” is not the same as cushioning still available.
- Loading work is the area under a force-displacement curve during compression.
  - It includes energy stored for possible return as well as energy lost.
  - Dissipated energy requires an unloading curve too.
- Average 10%-to-90% loading rate is a candidate measure of how abruptly force builds:

$$
\text{loading rate}_{10-90}=\frac{0.8F_{\max}}{t_{90}-t_{10}}
$$

- Here, $t_{10}$ and $t_{90}$ are the first times force reaches 10% and 90% of peak.
- This avoids the noisiest beginning of contact and is less sensitive than an instantaneous derivative.
- It may replace both force-at-10-ms divided by peak and time-to-peak if those measures are mostly describing the same behavior.
- Before adopting it, define:
  - the contact threshold;
  - signal filtering;
  - how threshold-crossing times are interpolated;
  - how double peaks or non-monotonic loading are handled;
  - what happens when a test ends before reaching a true peak.
- Target acceleration can be useful when the target represents a body or head with a defensible mass and motion model.
- Acceleration should not be treated as a foam-only property.
- Contact pressure and pressure distribution would help connect whole-glove force to local hand or target loading.
- Rebound speed and returned energy need unloading behavior and should wait until that is measured.
- Repeated-impact change should compare peak force, curve shape, thickness, and recovery over many controlled impacts.
- No single metric should be called “protection” without linking it to a specific harm and validation study.

## 10. Evidence still needed

> **Agent commentary:** This is the hands-on part of the story: cut things open, squeeze samples, build simple tests, and see where our assumptions fail. It should read like a path toward a better glove, not an audit checklist. Later, we can turn it into an experimental plan with costs and sample counts.

- Look inside a few existing gloves for ideas.
  - Use worn-out or donor gloves where possible.
  - Notice the padding shape, layer order, thickness changes, seams, glue, and cover tension.
  - Treat those observations as inspiration, not as a ranking of brands or a survey of the market.
  - Do not guess an exact foam grade from color or feel alone.
- Test the actual foam stock.
  - Measure density and thickness.
  - Run slow compression for comparison with supplier data.
  - Run faster compression across a range relevant to glove impacts.
  - Record loading and unloading.
  - Use specimens close to glove-layer thickness as well as standard specimens.
  - Repeat tests across samples and batches.
- Test complete padding stacks.
  - Compare a flat material stack with the shaped glove assembly.
  - Check whether layer order, glue, cover tension, and curvature change the result.
- Test complete gloves on repeatable targets.
  - Use more than one impact energy.
  - Use more than one target compliance when the research question requires it.
  - Record force, displacement, speed, contact time, and repeat-to-repeat variation.
- Study durability.
  - Track permanent thickness loss and changes in the force-time curve.
  - Control rest time, temperature, and impact count.
- Validate the simplified hand/wrist element separately.
- Report uncertainty from material variation, measurement error, and model assumptions.
- Keep injury and safety claims out until the measurements have been connected to suitable injury evidence.

## 11. Results and discussion plan

> **Agent commentary:** Keep this as an empty scaffold until the experimental question and validation plan are settled. When results exist, organize the discussion around what was learned, what changed our expectations, and which conclusions survive uncertainty. Do not fill this section with current simulation rankings.

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

## 12. References and reading notes

> **Agent commentary:** This is a working reading list, not a wall of citations. For each source, say what the researchers found, what we can borrow, and where the comparison breaks down. We can check publication details and standard editions when the outline becomes prose.

### Existing impact-test reference

- [SATRA, PPE for use in martial arts](https://www.satra.com/spotlight/article.php?id=423)
  - This summary of EN 13277 includes controlled impacts and transmitted-force limits for some martial-arts hand protectors.
  - It gives us the 3 J and 10 J pass-or-fail benchmark discussed above. We use it as context, not as the target for the glove design.

### Foam measurements and datasheets

- [ISO 2439:2008, indentation hardness of flexible cellular materials](https://www.iso.org/standard/42717.html)
  - Defines several indentation-hardness methods, including measurements at 25%, 40%, and 65% indentation, plus hysteresis-related information.
  - This helps us decode IFD/ILD and support factor. It also warns us not to turn one test value directly into a design answer.
- [ASTM D3574, flexible urethane foam test methods](https://store.astm.org/d3574-25.html)
  - Collects standard tests used for flexible PU foam research, quality control, and specification.
  - Many PU datasheets trace their numbers back to this family of tests. The catch is that a standard sample in a slow test is not the same thing as a thin layer in a glove.
- [ISO 3386-1:2025, compression stress-strain characteristics of low-density flexible cellular materials](https://www.iso.org/standard/89164.html)
  - Defines a method for measuring compression stress-strain behavior in low-density flexible cellular materials.
  - This gets us closer to what we need because a curve tells us much more than one firmness point. We would still need faster tests for a punch.
- [Polyurethane Foam Association, foam performance](https://pfa.org/foam-performance/)
  - Gives plain definitions of density, 25% IFD, support factor, and flex fatigue.
  - This is a useful translation guide for supplier language, though it is aimed at flexible PU rather than every foam family.
- [Polyurethane Foam Association, foam test methods](https://pfa.org/foam-test-methods/)
  - Maps common PU properties to ASTM and other test methods.
  - It gives us ideas for properties we might otherwise miss, including resilience, airflow, tear, impact, and repeated compression.

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
- [Smith et al. (2000), development of a boxing dynamometer](https://pubmed.ncbi.nlm.nih.gov/10902679/)
  - Measures punch force in a boxing-specific apparatus and compares groups of boxers.
  - It gives us another picture of punch force, as long as we keep the values tied to that dynamometer, those instructions, and those participants.

## Questions to settle before prose drafting

> **Agent commentary:** These are design choices, not paperwork to clear before doing anything useful. Answering even one or two of them will narrow the next round of reading and testing. Keep the unanswered ones visible so the document does not quietly make the choices for us.

- What kind of glove are we trying to make, and how do we want it to feel and behave?
- Are we optimizing first for the puncher's hand, the target's loading, or a deliberate balance of both?
- Which existing gloves are worth opening up for construction ideas?
- Which foam grades are actually obtainable and testable?
- Which target should define the first controlled experiment?
- Which outcome is primary?
- Should 10%-to-90% loading rate replace the current early-force and time-to-peak proxies?
- What evidence would be required before using words such as “safer,” “protective,” or “better”?
