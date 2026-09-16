'use strict';

// Mathematical consistency checks cannot establish agreement with real foam.
const assert = require('node:assert/strict');
const M = require('./engine.js');
const I = require('./impact_engine.js');

let checks = 0;
function check(condition, label) {
  assert(condition, label);
  checks += 1;
}
function close(actual, expected, tolerance, label) {
  check(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${label}: ${actual} versus ${expected}`,
  );
}

// Compare the analytic slopes with an independent finite difference.
for (const prior of Object.keys(M.PRIORS)) {
  for (const fast of [false, true]) {
   for (const loadingDurationMs of [0, 20]) {
    for (const strain of [0.01, 0.1, 0.3, 0.6]) {
      const step = 1e-6;
      const numeric =
        (M.priorValue(prior, strain + step, fast, loadingDurationMs) -
          M.priorValue(prior, strain - step, fast, loadingDurationMs)) /
        (2 * step);
      close(M.priorDerivative(prior, strain, fast, loadingDurationMs), numeric, 1e-7,
        `${prior}/${fast}/${loadingDurationMs}ms derivative at ${strain}`);
    }
   }
  }
}

// Independently integrate the Maxwell relaxation kernel over a constant ramp.
for (const prior of ['pu55', 'hr40', 'latex85']) {
  const p = M.PRIORS[prior];
  const strain = 0.4;
  const elastic = p.kp * strain + p.gamma * strain * Math.expm1(strain) ** p.n;
  close(M.priorValue(prior, strain, true, 0),
    p.K * strain + p.kp * strain + p.gamma * strain * Math.expm1(strain) ** p.n,
    0, `${prior} zero-duration rapid baseline stays exact`);
  for (const durationMs of [1e-7, 20, 100, 1000]) {
    const duration = durationMs / 1000;
    const tau = p.C / p.K;
    const intervals = 1000;
    let average = 0;
    for (let i = 0; i <= intervals; i += 1) {
      const weight = i === 0 || i === intervals ? 1 : i % 2 ? 4 : 2;
      average += weight * Math.exp(-duration * i / intervals / tau);
    }
    average /= 3 * intervals;
    const response = M.priorValue(prior, strain, true, durationMs);
    close((response - elastic) / (p.K * strain), average, 1e-9,
      `${prior}/${durationMs}ms matches integrated relaxation kernel`);
    check(response > elastic && response <= M.priorValue(prior, strain, true),
      `${prior}/${durationMs}ms Maxwell contribution remains within rapid limit`);
  }
  close(M.priorValue(prior, strain, true, 1e-7),
    M.priorValue(prior, strain, true), 1e-8,
    `${prior} finite-duration curve approaches rapid baseline continuously`);
}

const invalidLayer = M.layer('soft', 40, 'Soft HR', 'layer-0');
for (const speedModel of ['invalid', '', null, undefined, 20]) {
  const config = { ...M.DEFAULT_CONFIG, speedModel };
  const calls = [
    () => M.validate([invalidLayer], config),
    () => M.importState({ version: 12, layers: [invalidLayer], config: { speedModel } }),
    () => I.calculate([invalidLayer], config, 'test3', false),
  ];
  for (const call of calls) {
    assert.throws(call, /supported loading curve/);
    checks += 1;
  }
}
const legacySlow = M.importState({
  version: 10,
  layers: [invalidLayer],
  config: { speedModel: 'slow' },
});
check(legacySlow.config.speedModel === 'slow', 'valid legacy slow mode is preserved');
const defaultImport = M.importState({ version: 12, layers: [invalidLayer] });
check(defaultImport.config.speedModel === 'fast', 'omitted imported config uses rapid default');
close(I.calculate([invalidLayer], {}, 'test3', false).F,
  I.calculate([invalidLayer], M.DEFAULT_CONFIG, 'test3', false).F, 0,
  'omitted API speed model uses rapid default');
for (const duration of [-1, Infinity, NaN, '20', null]) {
  const calls = [
    () => M.priorValue('hr40', 0.3, true, duration),
    () => M.priorDerivative('hr40', 0.3, true, duration),
    () => M.materialCurve(invalidLayer, 2, 550, 'fast', duration),
    () => I.compile([invalidLayer], {}, { loadingDurationMs: duration }),
    () => I.calculate([invalidLayer], {}, 'test3', false, { loadingDurationMs: duration }),
    () => I.calculate([], {}, 'test3', false, { loadingDurationMs: duration }),
  ];
  for (const call of calls) {
    assert.throws(call, /Loading duration/);
    checks += 1;
  }
}

const rateSensitivity = [];
for (const grade of Object.keys(M.MATERIALS)) {
  const layer = M.layer(grade, 40, grade, 'layer-0');
  const slow = M.materialCurve(layer, 2, 550, 'slow');
  const fast = M.materialCurve(layer, 2, 550, 'fast');
  const ramp = M.materialCurve(layer, 2, 550, 'fast', 20);
  check(fast === M.materialCurve(layer, 2, 550, 'fast', 0),
    `${grade} default and zero-duration cache entries agree`);
  check(ramp !== fast && ramp === M.materialCurve(layer, 2, 550, 'fast', 20),
    `${grade} finite-duration cache entry remains separate and reusable`);
  const slowDuration = M.materialCurve(layer, 2, 550, 'slow', 20);
  check(slow.ps.every((pressure, i) => pressure === slowDuration.ps[i]),
    `${grade} duration sensitivity preserves slow calibration`);
  check(ramp.ps.every((pressure, i) => pressure <= fast.ps[i]),
    `${grade} finite-duration pressure stays at or below rapid baseline`);
  if (layer.family === 'EVA') {
    check(ramp.ps.every((pressure, i) => pressure === fast.ps[i]),
      `${grade} duration sensitivity preserves trapped-gas law`);
  }
  for (const [strain, pressure] of M.materialAnchors(layer)) {
    close(M.atStrain(slow, strain).p, pressure, 1e-12,
      `${grade} reproduces slow entered anchor at ${strain}`);
  }
  check(Array.from({ length: 51 }, (_, i) => slow.join * i / 50)
    .every(strain => fast.pressure(strain) >= slow.pressure(strain)),
  `${grade} fast proxy stays at or above slow reference`);

  for (const curve of [slow, fast, ramp]) {
    for (const strain of [0.13, 0.37, 0.61, 0.86]) {
      const scale = 1.7;
      const response = M.atStrain(curve, strain, scale);
      const inverse = M.atPressure(curve, response.p, scale);
      close(inverse.e, strain, 1e-12, `${grade} pressure/strain inverse`);
      close(inverse.w, response.w, 1e-12, `${grade} inverse work agrees`);
      const step = 1e-7;
      const workSlope =
        (M.atStrain(curve, strain + step, scale).w -
          M.atStrain(curve, strain - step, scale).w) /
        (2 * step);
      close(workSlope, response.p, 1e-7, `${grade} dW/de equals pressure`);
    }
    const step = 1e-7;
    const left = (curve.pressure(curve.join) -
      curve.pressure(curve.join - step)) / step;
    const right = (curve.pressure(curve.join + step) -
      curve.pressure(curve.join)) / step;
    close(left, right, 1e-5, `${grade} tail slope is continuous at join`);
    check(curve.pressure(curve.cap - 1e-5) > curve.pressure(curve.cap - 1e-3),
      `${grade} tail stiffens approaching its packing cap`);
  }

  // Density is currently a packing sensitivity only, at fixed pressure anchors.
  const denser = M.materialCurve({ ...layer, rho: layer.rho * 1.2 }, 2, 550, 'slow');
  check(denser.cap < slow.cap, `${grade} higher density reduces packing range`);
  for (const strain of [0.25, 0.5, 0.65]) {
    close(denser.pressure(strain), slow.pressure(strain), 1e-12,
      `${grade} density alone does not rescale pre-tail stiffness`);
  }
  const tailStrain = slow.join + (denser.cap - slow.join) / 2;
  check(denser.pressure(tailStrain) > slow.pressure(tailStrain),
    `${grade} higher density stiffens the tail at fixed strain`);
  rateSensitivity.push({
    grade,
    baseline25kPa: fast.pressure(0.25) / 1000,
    ramp20ms25kPa: ramp.pressure(0.25) / 1000,
    changePct: 100 * (ramp.pressure(0.25) / fast.pressure(0.25) - 1),
  });
}

for (const impact of ['test3', 'test10']) {
  const baseline = I.calculate([], M.DEFAULT_CONFIG, impact, true);
  const ramp = I.calculate([], M.DEFAULT_CONFIG, impact, true, { loadingDurationMs: 20 });
  for (const key of ['F', 'W', 'delta', 'endK']) {
    close(ramp[key], baseline[key], 0, `${impact} duration leaves reference ${key} fixed`);
  }
  close(ramp.trace.time, baseline.trace.time, 0,
    `${impact} duration leaves reference trajectory fixed`);
}

// Report assumption sensitivity, keeping incomplete stops out of peak values.
const presetSensitivity = [];
for (const recipe of Object.keys(M.CANONICAL)) {
 for (const impact of ['test3', 'test10']) {
  for (const loadingDurationMs of [0, 20]) {
    const result = I.calculate(M.recipe(recipe),
      { ...M.DEFAULT_CONFIG, speedModel: 'fast' }, impact, true, { loadingDurationMs });
    check(Number.isFinite(result.F) && result.F > 0,
      `${recipe}/${impact}/${loadingDurationMs}ms sensitivity yields a finite force`);
    close(result.W + result.endK, result.E + result.gravityWork, 1e-10,
      `${recipe}/${impact}/${loadingDurationMs}ms conserves loading work and energy`);
    check(result.trace.impulseError < 0.002,
      `${recipe}/${impact}/${loadingDurationMs}ms trajectory conserves momentum`);
    const defaultComp = I.compile(M.recipe(recipe), M.DEFAULT_CONFIG);
    const sameComp = I.compile(M.recipe(recipe), M.DEFAULT_CONFIG, { loadingDurationMs });
    check(loadingDurationMs === 0 ? defaultComp === sameComp : defaultComp !== sameComp,
      `${recipe}/${loadingDurationMs}ms compiled curve cache respects duration`);
    presetSensitivity.push({
      recipe,
      impact,
      loadingDurationMs,
      stopped: result.hasStopped,
      peakN: result.hasStopped ? result.F : null,
      forceReachedN: result.F,
      timeToStopMs: result.hasStopped ? result.trace.time * 1000 : null,
      maxCompressionMm: result.hasStopped ? result.delta * 1000 : null,
      maxLayerCompressionPct: result.hasStopped ? Math.max(...result.es) * 100 : null,
      loadingWorkJ: result.W,
      remainingKineticJ: result.endK,
      tailWorkPct: 100 * result.extendedShare,
    });
  }
 }
}

console.log(`PASS ${checks} material consistency checks`);
console.log(JSON.stringify({ rateSensitivity, presetSensitivity }, null, 2));
