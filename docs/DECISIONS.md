# Methodology decisions

## Settled for the current phase

- The methodology is being developed iteratively, not in one pass.
- `OUTLINE.md` stays in point form and uses plain language.
- The outline is for testing structure, intent, and meaning before prose is
  written.
- Concision and ease of review take priority over polished presentation.
- The current model and outline live in `docs/`. The simulation lives at the
  repository root.
- `legacy/METHODOLOGY.md` preserves the former methodology as historical source
  material. The outline remains in its iterative development phase.
- Use anchor-based curve equations: supplier pressures are explicit inputs,
  while published reference coefficients remain fixed.
- Check the EVA example against VA35 at the same nominal density. Fit the 25%
  supplier point and keep the 50% point out of the fit to check the prediction.

## Model assumptions that must remain visible

- PU and latex supplier inputs use ILD/IFD indentation force. EVA supplier inputs
  use compression stress from a different test method.
- The current model divides ILD/IFD force by the nominal 50 in² indenter area and
  treats the result as an average pressure.
- This conversion creates a common pressure-versus-strain scale inside the model.
  It does not make indentation and plate-compression measurements experimentally
  equivalent.
- Comparisons between PU, latex, and EVA remain conditional on this conversion and
  on the borrowed family curve shapes.
- Direct cross-family comparison requires testing the purchased foams with the
  same sample geometry, compression method, and loading rate.

## Approved wording

Preserve this explanation of cross-family comparison for the later draft:

> We convert the available supplier data to a common pressure-versus-strain scale, then use published family curves to estimate the missing response. This lets the model compare foam grades consistently, although the resulting curves remain estimates until the materials are tested under the same conditions.

## Open questions

[MODEL.md](MODEL.md) defines the current comparison:

- A 50 mm, four-layer construction with outer, main cushion, support, and
  comfort roles (Section 14).
- A 2.597 kg punch at 7.7 m/s against 50 mm Cutfoam EVA75 (Section 14).
- Read peak force and both loading rates together. Use compression and loading
  work to explain the response (Section 9).
- Injury and subjective feel are outside the model's scope (Sections 1 and 10).

The remaining questions are:

- What evidence supports each layer's material, thickness, and placement for
  its intended role? Which construction choices need to change (Section 14)?
- Do preferences between stacks hold when the fast-loading response,
  high-compression tails, hand stiffness, or target response change (Section 11)?
- Which physical validation test should come first? What missing apparatus and
  force-measurement details must be settled for the proposed SATRA and Perkins
  adaptations (Section 12)?
- How closely do predictions match impact measurements of the selected retail
  foams and complete gloves? That accuracy remains unestablished; favorable
  modeled responses do not establish injury protection or glove feel (Section 10).
