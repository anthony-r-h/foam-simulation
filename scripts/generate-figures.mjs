import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

// All curve pressures are in kPa. Sources: Wu et al., equation 16/table 1,
// https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/
// VA35 supplier data: the 25% point fits the curve; the 50% point checks it.
// https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A039-Evazote-VA35.pdf
const reference = { plateau: 12.9, initialRise: 20, airPressure: 101.325, leakage: 0.19308 };
const fitAnchor = { strain: 0.25, pressure: 52 };
const checkPoint = { strain: 0.50, pressure: 118 };
const tailPlot = { left: 64, bottom: 385, width: 640, height: 310, maxStrain: 1, maxPressure: 1500, referenceLimit: 0.8, sampleLimit: 0.999, steps: 1000 };

function referencePressure(strain) {
  return reference.plateau * Math.tanh(reference.initialRise * strain)
    + reference.airPressure * (1 - reference.leakage) * strain / (1 - strain);
}

function fittedPressure(strain) {
  return fitAnchor.pressure * referencePressure(strain) / referencePressure(fitAnchor.strain);
}

function twoAnchorPressure(strain) {
  // Only this fit uses the former check point as a second anchor.
  const pressure = referencePressure(strain);
  const s1 = referencePressure(fitAnchor.strain);
  const s2 = referencePressure(checkPoint.strain);
  if (pressure <= s1) return fittedPressure(strain);
  return fitAnchor.pressure + (checkPoint.pressure - fitAnchor.pressure)
    * (pressure - s1) / (s2 - s1);
}

function x(strain) {
  return tailPlot.left + tailPlot.width * strain / tailPlot.maxStrain;
}

function y(pressure) {
  return tailPlot.bottom - tailPlot.height * pressure / tailPlot.maxPressure;
}

function cappedTailCurve(pressureAt) {
  // Find where the curve leaves the display; never flatten it at the ceiling
  // or evaluate the singular equation at strain = 1.
  let low = 0;
  let high = tailPlot.sampleLimit;
  assert.ok(pressureAt(high) > tailPlot.maxPressure, 'Curve must cross the display ceiling.');
  for (let i = 0; i < 60; i++) {
    const midpoint = (low + high) / 2;
    if (pressureAt(midpoint) < tailPlot.maxPressure) low = midpoint;
    else high = midpoint;
  }
  const cutoff = (low + high) / 2;
  const strains = Array.from({ length: tailPlot.steps + 1 }, (_, i) => i / tailPlot.steps)
    .filter(strain => strain < cutoff);
  strains.push(cutoff);
  const path = strains.map((strain, i) => {
    const pressure = pressureAt(strain);
    assert.ok(Number.isFinite(pressure) && pressure >= 0);
    const px = tailPlot.left + tailPlot.width * strain / tailPlot.maxStrain;
    const py = tailPlot.bottom - tailPlot.height * pressure / tailPlot.maxPressure;
    return `${i ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`;
  }).join(' ');
  return { path, cutoff };
}

function checkCurve() {
  assert.equal(referencePressure(0), 0);
  assert.equal(fittedPressure(0), 0);
  assert.equal(twoAnchorPressure(0), 0);
  assert.ok(Math.abs(fittedPressure(fitAnchor.strain) - fitAnchor.pressure) < 1e-9);
  for (const anchor of [fitAnchor, checkPoint]) {
    assert.ok(Math.abs(twoAnchorPressure(anchor.strain) - anchor.pressure) < 1e-9);
  }
  assert.equal(fittedPressure(checkPoint.strain).toFixed(1), '122.6');
  const join = fitAnchor.strain;
  assert.ok(Math.abs(fittedPressure(join + 1e-10) - fittedPressure(join - 1e-10)) < 1e-6);
  assert.ok(Math.abs(twoAnchorPressure(join + 1e-10) - twoAnchorPressure(join - 1e-10)) < 1e-6);
  for (let i = 1; i <= tailPlot.steps; i++) {
    const strain = i * (tailPlot.sampleLimit / tailPlot.steps);
    const previous = (i - 1) * (tailPlot.sampleLimit / tailPlot.steps);
    assert.ok(referencePressure(strain) > referencePressure(previous));
    assert.ok(fittedPressure(strain) > fittedPressure(previous));
    assert.ok(twoAnchorPressure(strain) > twoAnchorPressure(previous));
    if (strain <= fitAnchor.strain) {
      assert.equal(twoAnchorPressure(strain), fittedPressure(strain));
    }
  }
  for (const pressureAt of [referencePressure, fittedPressure, twoAnchorPressure]) {
    const { cutoff } = cappedTailCurve(pressureAt);
    assert.ok(cutoff > tailPlot.referenceLimit && cutoff < 1);
    assert.ok(Math.abs(pressureAt(cutoff) - tailPlot.maxPressure) < 1e-8);
    assert.ok(pressureAt(.9999) > pressureAt(.999));
  }
}

function domeContactSvg() {
  // Editable drawing source. This is a schematic, not a plot of model geometry.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 360" role="img" aria-labelledby="title desc">
  <title id="title">Rigid dome contact with glove and target foam</title>
  <desc id="desc">Horizontal cross-section showing a rigid dome moving right into glove foam backed by target foam and a fixed plate. Labels identify central movement q, local stack shortening c of r, dome offset b of r, radial position r, and the growing contact footprint.</desc>
  <defs>
    <style>
      :root {
        --background: #ffffff;
        --foreground: #171717;
        --muted: #666666;
        --structure: #8a8a8a;
        --dome: #e5e7eb;
        --glove: #dbeafe;
        --target: #f3f4f6;
        --plate: #b8bec7;
        --accent: #2563a6;
      }
      .bg { fill: var(--background); }
      .line { fill: none; stroke: var(--foreground); stroke-width: 2; }
      .guide { fill: none; stroke: var(--structure); stroke-width: 1.5; stroke-dasharray: 6 5; }
      .measure { fill: none; stroke: var(--accent); stroke-width: 1.8; }
      .dome { fill: var(--dome); stroke: var(--foreground); stroke-width: 2; }
      .glove { fill: var(--glove); stroke: var(--foreground); stroke-width: 1.5; }
      .target { fill: var(--target); stroke: var(--foreground); stroke-width: 1.5; }
      .plate { fill: var(--plate); stroke: var(--foreground); stroke-width: 1.5; }
      text { fill: var(--foreground); font-family: "Latin Modern Roman", "LM Roman 10", "Computer Modern", serif; font-size: 14px; }
      .small { fill: var(--muted); font-size: 12px; }
      .math { font-style: italic; }
    </style>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)"/>
    </marker>
    <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="9" stroke="var(--structure)" stroke-width="2"/>
    </pattern>
  </defs>

  <rect class="bg" width="820" height="360"/>

  <path class="dome" d="M 105 70 L 382 70 Q 502 180 382 290 L 105 290 Z"/>
  <path class="glove" d="M 382 70 L 600 70 L 600 290 L 382 290 Q 502 180 382 70 Z"/>
  <rect class="target" x="600" y="70" width="75" height="220"/>
  <rect class="plate" x="675" y="70" width="24" height="220"/>
  <rect x="699" y="70" width="38" height="220" fill="url(#hatch)"/>

  <line class="guide" x1="382" y1="52" x2="382" y2="308"/>
  <line class="guide" x1="105" y1="180" x2="737" y2="180"/>

  <line class="measure" x1="382" y1="180" x2="442" y2="180" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text class="math" x="408" y="169">q</text>

  <line class="measure" x1="382" y1="111" x2="411" y2="111" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text class="math" x="385" y="101">c(r)</text>

  <line class="measure" x1="411" y1="92" x2="442" y2="92" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text class="math" x="416" y="82">b(r)</text>
  <line class="guide" x1="442" y1="92" x2="442" y2="180"/>

  <line class="measure" x1="362" y1="180" x2="362" y2="111" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text class="math" x="345" y="149">r</text>

  <path class="measure" d="M 460 75 L 474 75 L 474 285 L 460 285"/>
  <text class="math" x="480" y="174">A(q)</text>
  <text class="small" x="480" y="191">contact area</text>

  <line class="measure" x1="150" y1="40" x2="250" y2="40" marker-end="url(#arrow)"/>
  <text x="153" y="29">motion</text>

  <text x="185" y="175">rigid dome</text>
  <text x="500" y="225">glove foam</text>
  <text x="611" y="234">target foam</text>
  <text x="680" y="318">fixed plate</text>
  <text class="small" x="290" y="326">Dashed vertical: original foam face</text>
  <text class="small" x="290" y="344">Dashed horizontal: impact axis</text>
</svg>
`;
}

function domeDimensionsSvg() {
  // SATRA striker dimensions, drawn at one scale in both directions.
  const radius = 100;
  const footprint = 40;
  const scale = 3;
  const centre = { x: 110, y: 190 };
  const tip = centre.x + scale * radius;
  const edge = centre.x + scale * Math.sqrt(radius ** 2 - footprint ** 2);
  const top = centre.y - scale * footprint;
  const bottom = centre.y + scale * footprint;
  const arcRadius = scale * radius;
  assert.ok(footprint > 0 && footprint < radius);
  assert.ok(Math.abs(Math.hypot(edge - centre.x, top - centre.y) - arcRadius) < 1e-9);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 380" role="img" aria-labelledby="title desc">
  <title id="title">Dome curvature and maximum contact width</title>
  <desc id="desc">Side view drawn to scale. The striker face follows a circle of radius 100 mm. Its face is 80 mm across, or 40 mm from the centreline to either edge. The tip meets flat foam first; contact spreads outward as the striker advances, up to the edge of the face. The circle centre is a geometric construction point.</desc>
  <style>
    text { fill: #171717; font-family: "Latin Modern Roman", "LM Roman 10", "Computer Modern", serif; }
    .background { fill: #ffffff; }
    .line { fill: none; stroke: #171717; stroke-width: 1.5; }
    .guide { fill: none; stroke: #8a8a8a; stroke-width: 1; stroke-dasharray: 5 5; }
    .body { fill: #e5e7eb; }
    .dot { fill: #171717; }
  </style>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="#171717"/>
    </marker>
  </defs>
  <rect class="background" width="760" height="380"/>
  <path class="guide" d="M350,10 A${arcRadius},${arcRadius} 0 0 1 350,370"/>
  <path class="body" d="M310,${top} H${edge} A${arcRadius},${arcRadius} 0 0 1 ${edge},${bottom} H310 Z"/>
  <path class="line" d="M310,${top} H${edge} A${arcRadius},${arcRadius} 0 0 1 ${edge},${bottom} H310"/>
  <text x="235" y="40">Rigid dome</text>
  <path class="line" d="M325,46 L340,${top}"/>
  <circle class="dot" cx="${centre.x}" cy="${centre.y}" r="3"/>
  <text x="${centre.x}" y="218" text-anchor="middle">Circle centre</text>
  <path class="line" d="M${centre.x + 5},${centre.y} H${tip - 5}" marker-end="url(#arrow)"/>
  <text x="250" y="176" text-anchor="middle">R = 100 mm</text>
  <circle class="dot" cx="${tip}" cy="${centre.y}" r="4"/>
  <path class="line" d="M${tip + 8},${centre.y} H540"/>
  <text x="552" y="195">First contact</text>
  <path class="guide" d="M${edge},${top} H500 M${edge},${bottom} H500"/>
  <path class="line" d="M480,${top} V${bottom}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="508" y="95">80 mm face width</text>
  <text x="508" y="117">maximum contact diameter</text>
  <path class="line" d="M450,${centre.y} V${bottom}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <path class="line" d="M454,265 H500"/>
  <text x="508" y="270">a = 40 mm</text>
  <path class="line" d="M160,320 H275" marker-end="url(#arrow)"/>
  <text x="218" y="345" text-anchor="middle">Motion</text>
</svg>
`;
}

function foamCurveSvg() {
  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const pressure = i * 500;
    return `  <line class="grid" x1="64" y1="${y(pressure)}" x2="704" y2="${y(pressure)}"/>
  <text x="52" y="${y(pressure) + 5}" text-anchor="end">${pressure}</text>`;
  }).join('\n');
  const xTicks = Array.from({ length: 11 }, (_, i) => {
    const position = x(i * 0.1);
    return `  <line class="axis" x1="${position}" y1="385" x2="${position}" y2="391"/>
  <text x="${position}" y="414" text-anchor="middle">${i * 10}</text>`;
  }).join('\n');
  const prediction = fittedPressure(checkPoint.strain);
  const errorPercent = 100 * (prediction / checkPoint.pressure - 1);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 460" role="img" aria-labelledby="title desc">
  <title id="title">Checking the EVA study curve against an unused VA35 supplier point</title>
  <desc id="desc">Pressure in kilopascals versus compression from zero to 100 percent, clipped at ${tailPlot.maxPressure} kilopascals. The dashed line is the EVA35 study fit. The solid VA35 estimate uses only the supplier anchor of ${fitAnchor.pressure} kilopascals at ${fitAnchor.strain * 100} percent compression, marked by a diamond. At ${checkPoint.strain * 100} percent it predicts ${prediction.toFixed(1)} kilopascals. The unused supplier value, marked by a hollow square, is ${checkPoint.pressure} kilopascals. The prediction is ${errorPercent.toFixed(1)} percent high. Shading beyond 80 percent marks extrapolation beyond the study range. Both equations diverge at 100 percent. Slow compression only; no impact adjustment or density-based extension.</desc>
  <!-- Reference: Wu et al., equation 16 and table 1, https://pmc.ncbi.nlm.nih.gov/articles/PMC10707728/
       s(e), kPa = 12.9*tanh(20*e) + 101.325*(1-0.19308)*e/(1-e).
       VA35 data: https://www.zotefoams.com/wp-content/uploads/2025/03/PIS-A039-Evazote-VA35.pdf
       Anchor: (${fitAnchor.strain}, ${fitAnchor.pressure}); unused check: (${checkPoint.strain}, ${checkPoint.pressure}).
       Estimated pressure = ${fitAnchor.pressure} * s(e) / s(${fitAnchor.strain}).
       Paths sampled every 0.001 strain, ending at the display ceiling. -->
  <style>
    text { fill: #171717; font-family: "Latin Modern Roman", "LM Roman 10", "Computer Modern", serif; }
    .background { fill: #ffffff; }
    .grid { stroke: #d7d7d7; stroke-width: 1; }
    .axis { stroke: #171717; stroke-width: 1; fill: none; }
    .reference { fill: none; stroke: #666666; stroke-width: 2; stroke-dasharray: 7 5; }
    .estimate { fill: none; stroke: #2563a6; stroke-width: 2.5; }
    .supplier { fill: #2563a6; }
    .check-point { fill: #ffffff; stroke: #171717; stroke-width: 2; }
    .extrapolation { fill: #f3f4f6; }
    .boundary { stroke: #8a8a8a; stroke-width: 1; fill: none; }
  </style>
  <rect class="background" width="760" height="460"/>
  <path class="reference" d="M64,24 H96"/>
  <text x="104" y="29">EVA35 reference</text>
  <path class="estimate" d="M300,24 H332"/>
  <text x="340" y="29">VA35 fit (25% anchor)</text>
  <text x="64" y="61">Pressure (kPa)</text>
  <rect class="extrapolation" x="${x(tailPlot.referenceLimit)}" y="75" width="${x(1) - x(tailPlot.referenceLimit)}" height="310"/>
${yTicks}
  <path class="axis" d="M64,75 V385 H704"/>
  <path class="boundary" d="M${x(tailPlot.referenceLimit)},75 V385"/>
  <path class="boundary" d="M${x(1)},75 V385" stroke-dasharray="3 4"/>
  <text x="${x(.85)}" y="140" text-anchor="middle">Extrapolated</text>
${xTicks}
  <text x="384" y="447" text-anchor="middle">Compression (% initial thickness)</text>
  <path class="reference" d="${cappedTailCurve(referencePressure).path}"/>
  <path class="estimate" d="${cappedTailCurve(fittedPressure).path}"/>
  <path class="supplier" d="M${x(fitAnchor.strain)},${y(fitAnchor.pressure) - 6} l6,6 -6,6 -6,-6 Z"/>
  <rect class="check-point" x="${x(checkPoint.strain) - 4}" y="${y(checkPoint.pressure) - 4}" width="8" height="8"/>
</svg>

`;
}

function twoAnchorSvg() {
  const oneAnchor = cappedTailCurve(fittedPressure);
  const twoAnchors = cappedTailCurve(twoAnchorPressure);
  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const pressure = i * 500;
    return `  <line class="grid" x1="64" y1="${y(pressure)}" x2="704" y2="${y(pressure)}"/>
  <text x="52" y="${y(pressure) + 5}" text-anchor="end">${pressure}</text>`;
  }).join('\n');
  const xTicks = Array.from({ length: 11 }, (_, i) => {
    const position = x(i * 0.1);
    return `  <line class="axis" x1="${position}" y1="385" x2="${position}" y2="391"/>
  <text x="${position}" y="414" text-anchor="middle">${i * 10}</text>`;
  }).join('\n');
  const diamonds = [fitAnchor, checkPoint].map(({ strain, pressure }) =>
    `<path class="anchor" d="M${x(strain)},${y(pressure) - 5} l5,5 -5,5 -5,-5 Z"/>`
  ).join('\n  ');
  const prediction = fittedPressure(checkPoint.strain);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 460" role="img" aria-labelledby="title desc">
  <title id="title">VA35 anchor fits extended toward full compression</title>
  <desc id="desc">Pressure in kilopascals versus compression, with the horizontal axis extending to 100 percent. Both fits diverge at 100 percent in the EVA equation. Curves are clipped, not flattened, at ${tailPlot.maxPressure} kilopascals, near ${(100 * oneAnchor.cutoff).toFixed(1)} percent for one anchor and ${(100 * twoAnchors.cutoff).toFixed(1)} percent for two anchors. Shading beyond 80 percent marks extrapolation beyond the study range. The supplier points are at 25 and 50 percent. At 50 percent the one-anchor curve gives ${prediction.toFixed(1)} kilopascals and the two-anchor curve matches ${checkPoint.pressure}. This is continuation of the slow EVA equation, not the separate density-based extension or measured high-compression VA35 data.</desc>
  <!-- Sources and coefficients: see ../scripts/generate-figures.mjs.
       One anchor: p1*s(e)/s1. Two anchors: same below s1;
       p1+(p2-p1)*(s(e)-s1)/(s2-s1) above.
       Continue the equation beyond the reference range for inspection only.
       No impact adjustment or density-based tail. Display clipping leaves pressures unchanged. -->
  <style>
    text { fill: #171717; font-family: "Latin Modern Roman", "LM Roman 10", "Computer Modern", serif; }
    .background { fill: #ffffff; }
    .grid { stroke: #d7d7d7; stroke-width: 1; }
    .axis { stroke: #171717; stroke-width: 1; fill: none; }
    .one-anchor { fill: none; stroke: #2563a6; stroke-width: 2.5; stroke-dasharray: 7 5; }
    .two-anchor { fill: none; stroke: #171717; stroke-width: 2; }
    .anchor { fill: #171717; }
    .extrapolation { fill: #f3f4f6; }
    .boundary { stroke: #8a8a8a; stroke-width: 1; fill: none; }
  </style>
  <rect class="background" width="760" height="460"/>
  <path class="one-anchor" d="M64,24 H96"/>
  <text x="104" y="29">25% anchor</text>
  <path class="two-anchor" d="M330,24 H362"/>
  <text x="370" y="29">25% + 50% anchors</text>
  <text x="64" y="61">Pressure (kPa)</text>
  <rect class="extrapolation" x="${x(tailPlot.referenceLimit)}" y="75" width="${x(1) - x(tailPlot.referenceLimit)}" height="310"/>
${yTicks}
  <path class="axis" d="M64,75 V385 H704"/>
  <path class="boundary" d="M${x(tailPlot.referenceLimit)},75 V385"/>
  <path class="boundary" d="M${x(1)},75 V385" stroke-dasharray="3 4"/>
  <text x="${x(.85)}" y="140" text-anchor="middle">Extrapolated</text>
${xTicks}
  <text x="384" y="447" text-anchor="middle">Compression (% initial thickness)</text>
  <path class="one-anchor" d="${oneAnchor.path}"/>
  <path class="two-anchor" d="${twoAnchors.path}"/>
  ${diamonds}
</svg>
`;
}

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  throw new Error('Usage: node scripts/generate-figures.mjs [--check]');
}
checkCurve();
const figures = [
  ['dome-contact.svg', domeContactSvg()],
  ['dome-dimensions.svg', domeDimensionsSvg()],
  ['foam-curve-anchors.svg', foamCurveSvg()],
  ['foam-curve-two-anchors.svg', twoAnchorSvg()],
];
for (const [name, svg] of figures) {
  const destination = new URL(`../diagrams/${name}`, import.meta.url);
  if (args[0] === '--check') {
    const current = readFileSync(destination, 'utf8');
    if (current !== svg) {
      console.error(`${name} is out of date. Run node scripts/generate-figures.mjs`);
      process.exitCode = 1;
    } else {
      console.log(`OK: ${name}`);
    }
  } else {
    writeFileSync(destination, svg);
    console.log(`Generated ${name}`);
  }
}
