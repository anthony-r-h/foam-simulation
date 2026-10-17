import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToString } from "katex";
import { renderMethodologyMarkdown } from "./render-methodology.mjs";

const sourceDirectory = new URL("../foam-stack/source/", import.meta.url);
const methodologySource = new URL("../METHODOLOGY.md", import.meta.url);
const output = new URL("../public/foam-stack/foam_stack_builder_v12.html", import.meta.url);
const fragments = [
  ["/*STYLE*/", "style.css"],
  ["<!--METHODOLOGY-->", methodologySource],
  ["/*ENGINE*/", "engine.js"],
  ["/*IMPACT_ENGINE*/", "impact_engine.js"],
  ["/*SWEEP*/", "sweep.js"],
  ["/*STUDY_BASELINE*/", "study_baseline.json"],
  ["/*APP*/", "app.js"],
  ["/*STUDY_UI*/", "study_ui.js"],
];

let html = readFileSync(new URL("shell.html", sourceDirectory), "utf8");
for (const [placeholder, filename] of fragments) {
  if (html.split(placeholder).length !== 2) {
    throw new Error(`Expected exactly one ${placeholder} placeholder in shell.html`);
  }
  const sourceUrl = filename instanceof URL ? filename : new URL(filename, sourceDirectory);
  let source = readFileSync(sourceUrl, "utf8");
  if (filename === methodologySource) {
    source = renderMethodologyMarkdown(source);
    // Render LaTeX during the build; the offline simulator needs no math scripts or fonts.
    const render = (latex, displayMode) =>
      renderToString(latex.trim(), {
        displayMode,
        output: "mathml",
        throwOnError: true,
        strict: "error",
        trust: false,
      });
    source = source.replace(/\\\[([\s\S]*?)\\\]/g, (_, latex) => render(latex, true));
    source = source.replace(/\\\(([\s\S]*?)\\\)/g, (_, latex) => render(latex, false));
  }
  if (filename === "study_baseline.json")
    source = JSON.stringify(JSON.parse(source)).replace(/</g, "\\u003c");
  html = html.replace(placeholder, () => source);
}

mkdirSync(new URL("./", output), { recursive: true });
writeFileSync(output, html, "utf8");
console.log(`Built ${fileURLToPath(output)}`);
