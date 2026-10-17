const headingPattern = /^(#{2,4})\s+(.+?)(?:\s+\{#([A-Za-z][\w:-]*)\})?$/;

function renderInline(markdown) {
  const code = [];
  let html = markdown.replace(/`([^`]+)`/g, (_, value) => {
    const index = code.push(value) - 1;
    return `\u0000CODE${index}\u0000`;
  });

  html = html.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${href}"${external}>${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(
    /\u0000CODE(\d+)\u0000/g,
    (_, index) => `<code>${code[Number(index)]}</code>`,
  );
  return html;
}

export function renderMethodologyMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const titleLine = lines.shift();
  const title = titleLine?.match(/^#\s+(.+)$/)?.[1];
  if (!title) throw new Error("METHODOLOGY.md must start with one '# ' title");

  const output = [
    '<details id="methodology" class="method">',
    `<summary>${renderInline(title)}</summary>`,
    '<div class="method-body">',
  ];
  let paragraph = [];
  let firstParagraph = true;
  let math = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const className = firstParagraph ? ' class="method-intro"' : "";
    output.push(`<p${className}>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
    firstParagraph = false;
  };

  for (const line of lines) {
    if (math) {
      if (line.trim() === "$$") {
        output.push(`<div class="equation">\\[\n${math.join("\n")}\n\\]</div>`);
        math = null;
      } else {
        math.push(line);
      }
      continue;
    }

    if (line.trim() === "$$") {
      flushParagraph();
      math = [];
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = line.match(headingPattern);
    if (heading) {
      flushParagraph();
      const level = heading[1].length + 1;
      const id = heading[3] ? ` id="${heading[3]}"` : "";
      output.push(`<h${level}${id}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    if (line.trimStart().startsWith("<")) {
      flushParagraph();
      output.push(line);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (math) throw new Error("Unclosed display-math block in METHODOLOGY.md");
  flushParagraph();
  output.push("</div>", "</details>");
  return output.join("\n");
}
