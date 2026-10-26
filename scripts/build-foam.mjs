import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sourceDirectory = new URL("../frontend/", import.meta.url);
const catalogSource = new URL("../data/analytical-foams.csv", import.meta.url);
const output = new URL("../public/simulator.html", import.meta.url);
const fragments = [
  ["/*STYLE*/", "style.css"],
  ["/*APP*/", "app.js"],
];

function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (character !== "\r") {
      value += character;
    }
  }

  if (quoted) throw new Error("Unclosed quoted field in analytical foam catalog");
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  if (!headers) throw new Error("Analytical foam catalog is empty");
  return records.filter((record) => record.some(Boolean)).map((record, rowIndex) => {
    if (record.length !== headers.length) {
      throw new Error(`Catalog row ${rowIndex + 2} has ${record.length} fields; expected ${headers.length}`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, record[index]]));
  });
}

function buildCatalog() {
  return parseCsv(readFileSync(catalogSource, "utf8")).map((row) => ({
    id: row.foam_id,
    name: JSON.parse(row.materials)[0],
    family: row.family,
    subtype: row.subtype,
    densityKgM3: Number(row.density_kg_m3),
    firmnessUnits: row.firmness_units,
    firmness: [1, 2, 3].flatMap((point) => {
      const value = row[`firmness_p${point}_value`];
      if (!value) return [];
      return [{ value: Number(value), compressionPercent: Number(row[`firmness_p${point}_at_pct`]) }];
    }),
  }));
}

let html = readFileSync(new URL("shell.html", sourceDirectory), "utf8");
const catalogPlaceholder = "/*FOAM_CATALOG*/";
if (html.split(catalogPlaceholder).length !== 2) {
  throw new Error(`Expected exactly one ${catalogPlaceholder} placeholder in shell.html`);
}
const catalogJson = JSON.stringify(buildCatalog()).replaceAll("<", "\\u003c");
html = html.replace(catalogPlaceholder, () => catalogJson);
for (const [placeholder, filename] of fragments) {
  if (html.split(placeholder).length !== 2) {
    throw new Error(`Expected exactly one ${placeholder} placeholder in shell.html`);
  }
  const source = readFileSync(new URL(filename, sourceDirectory), "utf8");
  html = html.replace(placeholder, () => source);
}

mkdirSync(new URL("./", output), { recursive: true });
writeFileSync(output, html, "utf8");
console.log(`Built ${fileURLToPath(output)}`);
