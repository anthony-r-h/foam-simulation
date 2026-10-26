---
name: draft-full-document
description: Expand a settled outline and its breakout source documents into one full prose document. Use only when explicitly invoked for a complete draft, not for ordinary documentation edits.
---

# Draft Full Document

Create the requested full document from the input documents named by the user or
the applicable `AGENTS.md` instructions.

Follow all applicable `AGENTS.md` instructions.

## Source roles

- Use the designated outline document as the document structure and statement
  of intent.
- Treat each other input document as a breakout section of the outline. Place
  its content at the corresponding outline heading and preserve its internal
  heading hierarchy.
- Treat drafting-status sections and section-intent callouts as drafting
  guidance. Do not reproduce them as sections or callouts in the finished
  document.
- Preserve the complete section order established by the outline, including the
  placement of breakout sections.

## Writing requirements

- Put clarity first. When editorial goals compete, choose the clearest accurate
  formulation that preserves the source meaning.
- Convert point-form material into connected prose.
- Preserve the existing argument, heading order, and hierarchy.
- Use paragraphs of varied length. Do not mechanically create one paragraph
  for every bullet.
- Keep the document direct, technical, and readable in plain language.
- Introduce physical meaning, intuition and contextbefore equations.
- Define symbols where they first appear.
- Preserve equations, units, figures, links, citations, numerical values, and
  tables unless a source correction is explicitly requested.
- Preserve uncertainty and unresolved choices.
- Do not invent evidence, citations, simulation results, causal explanations,
  or design conclusions.
- Do not perform new research or analysis.
- Do not add generic introductions, summaries, transitions, or conclusions
  merely to make sections appear complete.
- Present the document on its own terms. Do not compare it with earlier drafts,
  previous versions, or the source format unless that comparison is part of the
  subject matter.
- Exclude authoring and process bookkeeping, including drafting notes,
  reminders, TODOs, and statements about what the document will do later.
  Preserve substantive open questions, limitations, and proposed tests when
  they are part of the subject matter.
- In analytical sections, explain the meaning, relationships, tradeoffs, and
  implications supported by the sources. Use numbers as evidence rather than
  narrating tables or repeating results without interpretation.
- Do not extend the analysis beyond interpretations supported by the input
  documents.
- Follow the repository rules for punctuation, notation, tense, and style.

## Avoid LLM prose patterns

- Use straight quotation marks and apostrophes. Do not use curly punctuation or
  em dashes.
- State the point directly. Avoid negative contrast setups such as "not X, but
  Y," "not only X," and "more than just X."
- Remove throat-clearing and canned signposting such as "it is important to
  note," "this highlights," and "it is worth considering."
- Match emphasis to the evidence. Avoid inflated claims of importance,
  novelty, scale, or consequence when the sources do not establish them.
- Prefer the specific claim and its support over labels such as "crucial,"
  "vital," "profound," "transformative," or "landmark."
- Remove repeated summaries and conclusions that restate nearby material
  without advancing the argument.

## Whole-document cohesion

- Read the assembled document from beginning to end as one argument. Do not
  review sections only in isolation.
- Check that each section follows from what precedes it and prepares the ideas
  needed by later sections.
- Integrate breakout sections with the surrounding document. Check both the
  entry into each breakout section and the return to the outline that follows.
- Keep terminology, symbols, assumptions, tense, and voice consistent across
  source boundaries.
- Introduce concepts before they are used and keep cross-references accurate.
- Remove unintended repetition and surface contradictions. Do not add filler
  transitions merely to join sections.

## Conflicts and gaps

Use this priority when sources overlap:

1. `AGENTS.md` for rules and style
2. The outline document for document purpose and organization
3. Breakout documents for the content and detail of their corresponding
   sections

Do not silently reconcile substantive contradictions. If a conflict prevents
accurate prose, stop and ask one focused question.

If an unresolved matter does not block drafting, keep it visible in the prose.

## File safety

- Do not edit any input document.
- Create the requested output document if it does not exist.
- If it already exists, inspect its diff before changing it.
- Do not replace user-written changes unless the user explicitly requests
  regeneration.

## Workflow

1. Read all input documents completely.
2. Build the combined heading map and identify how the sections depend on and
   support one another.
3. Draft the document section by section in the order established by the
   outline.
4. Re-read the complete assembled document from beginning to end.
5. Perform the whole-document cohesion pass.
6. Verify factual and mathematical fidelity against the sources.
7. Perform the LLM prose-pattern review.
8. Validate formatting.

## Validation

Run `git diff --check` against the output document. Scan the output for em
dashes and curly quotation marks or apostrophes, for example with `rg`.

Also verify that:

- every substantive source section is represented;
- equations and technical definitions retain their meaning;
- numbers and table values match their source documents;
- figure paths and links still resolve relative to the output document;
- no new claims or citations were introduced.

Report what was drafted, validation results, unresolved issues, and anything
left unverified.
