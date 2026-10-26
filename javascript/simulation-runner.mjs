import "./simulation.js";

let input = "";
for await (const chunk of process.stdin) input += chunk;

const payload = JSON.parse(input);
const results = payload.requests.map((request) =>
  globalThis.FoamSimulation.simulateFrontend(request, payload.catalog),
);

process.stdout.write(JSON.stringify({
  assumptions: globalThis.FoamSimulation.assumptions,
  results,
}));
