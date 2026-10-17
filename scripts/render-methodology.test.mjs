import assert from "node:assert/strict";
import test from "node:test";

import { renderMethodologyMarkdown } from "./render-methodology.mjs";

test("renders methodology Markdown into the page wrapper", () => {
  const markdown = [
    "# Title",
    "",
    "Intro.",
    "",
    "## Section {#section}",
    "",
    "A **bold** [link](#section) with `code`.",
    "",
    "$$",
    "x^2",
    "$$",
  ].join("\n");

  const html = renderMethodologyMarkdown(markdown);

  assert.match(html, /<summary>Title<\/summary>/);
  assert.match(html, /<p class="method-intro">Intro\.<\/p>/);
  assert.match(html, /<h3 id="section">Section<\/h3>/);
  assert.match(html, /<strong>bold<\/strong> <a href="#section">link<\/a>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /<div class="equation">\\\[\nx\^2\n\\\]<\/div>/);
});

test("rejects malformed methodology Markdown", () => {
  assert.throws(() => renderMethodologyMarkdown("No title"), /must start with one/);
  assert.throws(() => renderMethodologyMarkdown("# Title\n\n$$\nx^2"), /Unclosed/);
});
