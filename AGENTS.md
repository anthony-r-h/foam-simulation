<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Communication

- Never say "you're right" in response to a correction. Address the correction
  directly.

## Frontend copy

- Keep visible UI copy short, direct, and natural.
- Do not add caveats, disclaimers, qualifications, or methodology language to
  contextual UI labels unless the user explicitly asks for them.
- Never use phrases such as "illustrative," "not measured," "non-clinical," or
  similar warnings in visible UI copy.
- Never use a centered dot (`·`) to separate visible UI text. Use layout, line
  breaks, commas, or separate labels instead.
- Put necessary methodological detail in the methodology material, not beside
  ordinary controls, labels, or playful reference scales.

## Lovable hosting

- The production frontend will be built and hosted by Lovable. Keep frontend
  changes compatible with the existing Lovable and TanStack build.
- Treat `scripts/serve-foam.py` as a local development bridge only. Production
  code must not depend on a local Python process or filesystem access.
- Connect the Python simulation only through an endpoint that is available from
  the deployed Lovable site.

## Analysis work

- These rules apply to `docs/ANALYSIS.md`, scripts in `analysis/`, and work on simulation
  results. The user directs the analysis one step at a time.
- Do only the specific task requested. A general intention to analyze the data
  does not authorize exploratory analysis or an end-to-end workflow.
- Edit only the requested section or code. Permission to edit `analysis/analysis1.py`
  does not authorize running it or updating `docs/ANALYSIS.md`, and vice versa.
- Run analysis code or process the results CSV only when requested. Limit
  execution to the requested question and outputs.
- Do not independently add metrics, filters, rankings, scoring systems, plots,
  statistical tests, reports, or conclusions. Leave analytical choices to the
  user unless they explicitly delegate them.
- `docs/ANALYSIS.md` is an author-facing explanation of the analytical question,
  comparison choices, findings, and limits. It is not an agent log, procedure
  diary, file inventory, or provenance record.
- Include setup detail when it explains the comparison or affects its
  interpretation. Leave out bookkeeping that has no bearing on the analytical
  question.
- Keep writing short, direct, and in the existing format. Do not expand notes
  into finished prose, fill empty sections, or append unsolicited explanations.
- Use short bullets with one main idea each. Prefer simple language over academic
  phrasing. State points directly and avoid contrastive setups, generic LLM
  phrasing, filler, canned transitions, and inflated language.
- Write completed simulations and analysis in the past tense. Vary sentence
  structure instead of turning a section into repeated "we" statements.
- Do not use em dashes or curly quotation marks and apostrophes.
- Keep uncertainties, disagreements, and missing evidence visible. Do not make
  a section sound settled merely for completeness.
- Keep generated table values out of `docs/ANALYSIS.md`. Analysis scripts write
  display-ready CSV files and the authored document references them with a
  permanent directive: `{% table "../figures/file.csv" %}`.
- Use `python3 -m scripts.render_analysis` to expand table directives into
  `docs/ANALYSIS_rendered.md`. Never overwrite the authored source with rendered output,
  and never hand-copy calculated CSV or JSON values into a Markdown table.
- Treat `docs/ANALYSIS.md`, the analysis code, and the referenced CSV files as
  the sources. Treat `docs/ANALYSIS_rendered.md` as disposable generated output.
- Marker-delimited generated tables are legacy. Convert them only when the user
  requests that analysis, and do not introduce new generated table blocks.
- If a missing choice prevents the requested work, ask a focused question.
  Do not silently choose an analytical direction or broaden the task.
- Validate only what is needed for the requested change. Report the result
  briefly, then stop. Do not start follow-on work or generate extra artifacts.

# Methodology working instructions

## Explicit permission to edit

- Treat `docs/MODEL.md` and `docs/OUTLINE.md` as read-only unless the user explicitly asks
  to edit the respective document for the current task. Permission for one does
  not authorize edits to the other.
- These are author-facing documents for understanding and controlling project
  scope. They are not agent logs, implementation notes, or automatic records of
  code changes.
- Requests to implement, fix, test, refactor, or document code do not authorize
  edits to either document. Neither does a general request to update docs or
  keep documentation in sync.
- If code changes reveal a mismatch or a useful addition, report it briefly in
  the response. Leave the documents unchanged unless the user asks for an edit.
- When an edit is explicitly requested, change only the requested section in
  small, reviewable steps and follow the writing rules below. Do not append
  large explanations, expand other sections, or treat permission as ongoing.
- The source roles and working method below apply within this permission
  boundary; they do not independently authorize edits.

## Current phase

This is an iterative reasoning and structure phase, not prose drafting.

`docs/OUTLINE.md` must remain in concise point form and plain language. Its purpose is
to let the author inspect, question, and reorganize the document's intent before
any section is expanded into finished prose.

Do not convert bullets into paragraphs unless explicitly asked.

## Source roles

- `docs/OUTLINE.md` is the active working document.
- `docs/MODEL.md` is the working specification for the mathematical model. Develop it
  one subsection at a time under the author's direction.
- `docs/DECISIONS.md` records settled choices and consequential open questions that
  need to persist across sessions.
- `legacy/METHODOLOGY.md` is historical source material. It does not determine the
  structure or conclusions of this outline.

## Editing defaults

- Change only the requested section.
- Preserve the existing hierarchy unless restructuring is requested.
- Use short bullets, with one main idea per bullet.
- Prefer simple language over academic phrasing.
- State points directly. Avoid contrastive setups such as "not X, but Y" or
  "this is not X; it is Y."
- Avoid generic LLM phrasing, filler, canned transitions, and inflated language.
- Do not use em dashes.
- Use straight quotation marks and apostrophes. Do not use curly quotation marks
  or apostrophes.
- Add detail only when it clarifies meaning or exposes an assumption.
- Do not make sections sound finished merely for completeness.
- Keep uncertainties, disagreements, and missing evidence visible.
- Do not silently answer unresolved design questions.
- Do not introduce simulation results, rankings, parameter sweeps, or numerical
  implementation details unless explicitly requested.
- Treat `legacy/METHODOLOGY.md` as source material, not as the required structure.
- Do not update `legacy/METHODOLOGY.md` unless explicitly asked.
- Keep agent instructions out of `docs/OUTLINE.md`. Human-facing section intent and
  open questions belong in the outline when they help the author reason.

## Model development

- Begin with the physical meaning of a concept in short bullets. Add equations
  only after that meaning is settled.
- Work on one requested subsection at a time. Do not complete later sections in
  anticipation of the author.
- Define every symbol where it first appears, including its units.
- Separate physical inputs, modeling choices, assumptions, and derived outputs.
- Do not add mathematical detail unless it changes the model or makes an
  assumption testable.
- Check new equations for dimensional consistency and simple limiting cases.
- Keep unresolved choices visible instead of selecting a formulation silently.

## LaTeX and notation

- Use `$...$` for inline math and `$$...$$` for display equations, including
  math in tables. Do not use `\(...\)` or `\[...\]`.
- Keep each unit inside one math expression: `$\mathrm{s}^{-1}$`, not
  `s$^{-1}$`. Use upright units, such as `$\mathrm{Pa}$`.
- Use `\times`, never `\cdot`, for explicit multiplication, including units:
  `$\mathrm{Pa}\times\mathrm{s}$`.
- Distinguish nested brackets with outer square brackets or larger delimiters,
  such as `\left[...\right]` or `\bigg(...)`. Avoid same-sized nested brackets.
- Use uppercase, upright descriptive superscripts, such as
  `$q^{\mathrm{HAND}}$`. Do not add prose explaining that these labels are not
  exponents.
- Reuse established notation for related quantities rather than introducing
  unrelated letters. In prose, name the quantity before giving its symbol.
- Introduce symbols with their equations and physical meaning, grouped by
  concept. Interpret key equations in plain English; omit trivial rearrangements.
- Use only our notation in symbol tables. Keep source citations, but do not add
  source-symbol comparison columns.
- Check delimiters and table structure after edits. Do not claim rendering is
  verified unless it has been visually checked.

## Figure sources

- Edit `scripts/generate-figures.mjs` rather than its SVG outputs. Regenerate all figures
  with `node scripts/generate-figures.mjs`; use `--check` to check for drift.
- Keep figure source in `scripts/` and generated SVGs in `diagrams/`. See
  `docs/FIGURES.md` for the drawing and plotting source locations.

## Working method

For each requested change:

1. Identify the narrow section involved.
2. Improve its purpose, logic, and ordering in point form.
3. Check for duplication or contradiction with nearby sections.
4. Report any consequential unresolved question.
5. Stop without expanding unrelated sections.

## Later phase

Finished prose will be created only after the author explicitly declares the
outline sufficiently settled. Until then, concision and editability take
priority over polish.

## Full-document drafting

- Use `$draft-full-document` only when the user explicitly requests a full prose
  draft.
- Invoking `$draft-full-document` with a statement that the outline is settled
  satisfies the later-phase drafting gate.
- The skill may read `docs/OUTLINE.md`, `docs/MODEL.md`, and
  `docs/ANALYSIS_rendered.md`.
- It must not modify those source documents. Write the combined draft to
  `docs/FULL_DOCUMENT.md`.
