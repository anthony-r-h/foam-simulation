"""Loading-only punch simulation. Equations and assumptions are in docs/MODEL.md.

Call simulate(mass_kg, speed_m_s, layers, target). Each glove layer supplies
layer, foam_id, thickness_mm; target supplies foam_id, thickness_mm.
Inputs are controlled: positive mass/speed, numbered layers and integer mm.
All mechanics use SI units; result keys state their units explicitly.
Foam IDs and properties come from data/analytical-foams.csv.

From the repository root, install the YAML reader and run the checks:
    python3 -m pip install -r requirements.txt
    python3 -m unittest discover -s tests -p 'test_*.py'

Example (the EV50 target is a chosen catalog foam, not the EVA75 worked example):
    from simulation import simulate

    result = simulate(
        mass_kg=2.597,
        speed_m_s=7.7,
        layers=[
            {"layer": 1, "foam_id": "foam-factory-hd36-hq", "thickness_mm": 20},
            {"layer": 2, "foam_id": "evazote-ev50", "thickness_mm": 20},
        ],
        target={"foam_id": "evazote-ev50", "thickness_mm": 50},
    )
    print(result["metrics"])

Results are ordinary dictionaries/lists that can be serialized as JSON:
    metrics: peak, loading rates, timing, compression, component work and weight.
    trace: time, force, speed, movement, remaining thickness and component work.
           Layer arrays follow the caller's order; foams carries their IDs.
    curves: fast pressure-strain arrays, supplier fit diagnostics and tail limits.
    reached: last trace row, including when the numerical range ends early.
    checks: energy residual and independently integrated force/impulse residual.
    punch, foams, assumptions: values used for this calculation.

The defaults live in assumptions.yaml. Researchers can load_assumptions(), edit
that dictionary, then pass assumptions=settings to simulate for a comparison.
Errors for selected incomplete catalog entries return status, reason and errors.
Other inputs are assumed valid; there is no input-validation framework.
"""

from bisect import bisect_right
import csv
import json
import math
from pathlib import Path

import yaml


DIRECTORY = Path(__file__).resolve().parent


def load_assumptions(path=DIRECTORY / "assumptions.yaml"):
    with open(path, encoding="utf-8") as source:
        return yaml.safe_load(source)


def reference_response(strain, reference, fast):
    """Return reference pressure and its slope with respect to strain, in Pa."""
    if reference["family"] == "EVA":
        initial_rise = reference["initial_rise"]
        plateau = reference["plateau_pa"]
        air = reference["air_pressure_pa"]
        if not fast:
            air *= 1 - reference["slow_leakage_ratio"]
        shape = math.tanh(initial_rise * strain)
        pressure = plateau * shape + air * strain / (1 - strain)
        slope = plateau * initial_rise * (1 - shape**2) + air / (1 - strain)**2
        return pressure, slope

    stiffness = reference["relaxing_stiffness_pa"]
    if fast:
        pressure = stiffness * strain
        slope = stiffness
    else:
        relaxation = reference["relaxation_pa_s"] * reference["slow_strain_rate_per_s"]
        pressure = relaxation * (1 - math.exp(-stiffness * strain / relaxation))
        slope = stiffness * math.exp(-stiffness * strain / relaxation)
    base = reference["base_stiffness_pa"]
    rise = reference["rise_scale_pa"]
    exponent = reference["rise_exponent"]
    shape = math.expm1(strain)
    pressure += base * strain + rise * strain * shape**exponent
    slope += base + rise * (shape**exponent + strain * exponent * shape**(exponent - 1) * math.exp(strain))
    return pressure, slope


def minimum_skew(reference, join, steps):
    """Find the lower bound b >= -s'/s for both reference curves up to the join."""
    bound = -math.inf
    for fast in (False, True):
        def required_skew(strain):
            pressure, slope = reference_response(strain, reference, fast)
            return -slope / pressure

        # At zero, pressure is zero and the reference slope is already positive.
        strains = [join * i / steps for i in range(steps + 1)]
        bounds = [-math.inf] + [required_skew(strain) for strain in strains[1:]]
        bound = max(bound, max(bounds))
        # Refine interior maxima so constraints also hold between table knots.
        for i in range(1, steps):
            if bounds[i] < bounds[i - 1] or bounds[i] < bounds[i + 1]:
                continue
            left, right = strains[i - 1], strains[i + 1]
            for _ in range(60):
                first = left + (right - left) / 3
                second = right - (right - left) / 3
                if required_skew(first) < required_skew(second):
                    left = first
                else:
                    right = second
            bound = max(bound, required_skew((left + right) / 2))
    # A small numerical margin keeps the joining slopes strictly positive.
    return bound + 1e-10 * max(1.0, abs(bound))


def material_curve(foam, assumptions, fast=True):
    """Fit scale/skew, add the tail, and tabulate pressure and loading work."""
    reference = assumptions["reference_curves"][foam["reference_curve"]]
    anchors = foam["anchors"]

    cap = 1 - foam["density_kg_m3"] / reference["solid_density_kg_m3"]
    join = min(reference["fit_strain"], cap - assumptions["minimum_tail_strain_interval"])
    if anchors[-1][0] > join:
        raise ValueError(f"Anchor at {anchors[-1][0] * 100:g}% exceeds the assumed tail start at {join * 100:g}%.")

    observed_strains = [strain for strain, _ in anchors]
    log_ratios = [math.log(pressure / reference_response(strain, reference, False)[0])
                  for strain, pressure in anchors]
    mean_strain = sum(observed_strains) / len(anchors)
    mean_log_ratio = sum(log_ratios) / len(anchors)
    skew = 0.0
    if len(set(observed_strains)) > 1:
        covariance = sum((strain - mean_strain) * (ratio - mean_log_ratio)
                         for strain, ratio in zip(observed_strains, log_ratios))
        variance = sum((strain - mean_strain)**2 for strain in observed_strains)
        skew = covariance / variance
    constrained = False
    if skew < 0:
        lower_bound = minimum_skew(reference, join, assumptions["numerics"]["curve_steps"])
        constrained = skew < lower_bound
        skew = max(skew, lower_bound)
    # For fixed skew, this intercept minimizes squared log-pressure residuals.
    scale = math.exp(mean_log_ratio - skew * mean_strain)
    observations = []
    for strain, pressure in anchors:
        fitted = scale * math.exp(skew * strain) * reference_response(strain, reference, False)[0]
        observations.append({"strain": strain, "supplier_pressure_pa": pressure,
                             "fitted_pressure_pa": fitted, "difference_percent": 100 * (fitted / pressure - 1)})

    def calibrated(strain):
        pressure, slope = reference_response(strain, reference, fast)
        multiplier = scale * math.exp(skew * strain)
        return multiplier * pressure, multiplier * (slope + skew * pressure)

    join_pressure, join_slope = calibrated(join)
    tail_length = cap - join
    exponent = assumptions["tail_exponent"]

    def pressure_at(strain):
        if strain <= join:
            return calibrated(strain)[0]
        return join_pressure + join_slope * tail_length / exponent * (
            (tail_length / (cap - strain))**exponent - 1
        )

    numerics = assumptions["numerics"]
    ceiling = numerics["maximum_pressure_pa"]
    low, high = 0.0, cap * (1 - 1e-12)
    for _ in range(60):
        middle = (low + high) / 2
        if pressure_at(middle) < ceiling:
            low = middle
        else:
            high = middle
    end_strain = (low + high) / 2
    base_end = min(join, end_strain)
    strains = [base_end * i / numerics["curve_steps"] for i in range(numerics["curve_steps"] + 1)]
    strains.extend(strain for strain, _ in anchors if strain < end_strain)
    if end_strain > join:
        for i in range(1, numerics["tail_steps"] + 1):
            fraction = i / numerics["tail_steps"]
            strains.append(cap - tail_length * ((cap - end_strain) / tail_length)**fraction)
    strains.append(end_strain)
    strains = sorted(set(strains))
    pressures = [pressure_at(strain) for strain in strains]
    pressures[-1] = ceiling
    work = [0.0]
    for i in range(1, len(strains)):
        work.append(work[-1] + (pressures[i - 1] + pressures[i]) / 2 * (strains[i] - strains[i - 1]))
    return {"strain": strains, "pressure_pa": pressures, "work_density_j_m3": work,
            "join_strain": join, "cap_strain": cap, "anchors": anchors,
            "fit": {"scale": scale, "skew": skew, "constrained": constrained, "observations": observations}}


def interval(values, value):
    """Find a table interval, including either endpoint. No extrapolation is used."""
    index = min(len(values) - 2, max(0, bisect_right(values, value) - 1))
    fraction = (value - values[index]) / (values[index + 1] - values[index])
    return index, fraction


def prepare_column(foams, curves):
    """Put every foam on shared pressure knots, then add their shortenings."""
    pressures = sorted(set(pressure for curve in curves for pressure in curve["pressure_pa"]))
    strains = []
    works = []
    for foam, curve in zip(foams, curves):
        layer_strains, layer_works = [], []
        thickness = foam["thickness_mm"] / 1000
        for pressure in pressures:
            index, fraction = interval(curve["pressure_pa"], pressure)
            strain = curve["strain"][index] + fraction * (curve["strain"][index + 1] - curve["strain"][index])
            work = curve["work_density_j_m3"][index]
            work += (curve["pressure_pa"][index] + pressure) / 2 * (strain - curve["strain"][index])
            layer_strains.append(strain)
            layer_works.append(thickness * work)
        strains.append(layer_strains)
        works.append(layer_works)
    shortening = []
    for i in range(len(pressures)):
        shortening.append(sum(foam["thickness_mm"] / 1000 * strains[j][i] for j, foam in enumerate(foams)))
    column = {"pressure_pa": pressures, "shortening_m": shortening, "strain": strains, "work_j_m2": works}
    prepare_integrals(column, foams)
    return column


def segment_integrals(column, foams, index, distance):
    """Integrals of p, c*p, work and c*work within one column-table interval.

    Here c is local stack shortening. Pressure is linear in c; each foam's
    work per area is quadratic. Integrating these polynomials lets the dome
    calculation include the sharp centre pressure without sampling rings.
    """
    start = column["shortening_m"][index]
    width = column["shortening_m"][index + 1] - start
    pressure = column["pressure_pa"][index]
    slope = (column["pressure_pa"][index + 1] - pressure) / width
    pressure_integral = pressure * distance + slope * distance**2 / 2
    pressure_moment = start * pressure_integral + pressure * distance**2 / 2 + slope * distance**3 / 3
    work_integrals, work_moments = [], []
    for j, foam in enumerate(foams):
        # This layer's share of an additional local stack shortening.
        strain_change = column["strain"][j][index + 1] - column["strain"][j][index]
        share = foam["thickness_mm"] / 1000 * strain_change / width
        work = column["work_j_m2"][j][index]
        integral = work * distance + share * (pressure * distance**2 / 2 + slope * distance**3 / 6)
        moment = start * integral + work * distance**2 / 2
        moment += share * (pressure * distance**3 / 3 + slope * distance**4 / 8)
        work_integrals.append(integral)
        work_moments.append(moment)
    return pressure_integral, pressure_moment, work_integrals, work_moments


def prepare_integrals(column, foams):
    """Store cumulative integrals once, so each contact state needs two lookups."""
    pressure, pressure_moment = [0.0], [0.0]
    work = [[0.0] for _ in foams]
    work_moment = [[0.0] for _ in foams]
    for i in range(len(column["shortening_m"]) - 1):
        width = column["shortening_m"][i + 1] - column["shortening_m"][i]
        integral_p, moment_p, integrals_w, moments_w = segment_integrals(column, foams, i, width)
        pressure.append(pressure[-1] + integral_p)
        pressure_moment.append(pressure_moment[-1] + moment_p)
        for j in range(len(foams)):
            work[j].append(work[j][-1] + integrals_w[j])
            work_moment[j].append(work_moment[j][-1] + moments_w[j])
    column["integrals"] = {"pressure": pressure, "pressure_moment": pressure_moment,
                           "work": work, "work_moment": work_moment}


def column_integrals(shortening, column, foams):
    index, _ = interval(column["shortening_m"], shortening)
    distance = shortening - column["shortening_m"][index]
    pressure, pressure_moment, work, work_moment = segment_integrals(column, foams, index, distance)
    prefix = column["integrals"]
    pressure += prefix["pressure"][index]
    pressure_moment += prefix["pressure_moment"][index]
    for j in range(len(foams)):
        work[j] += prefix["work"][j][index]
        work_moment[j] += prefix["work_moment"][j][index]
    return pressure, pressure_moment, work, work_moment


def column_state(shortening, column, foams):
    index, fraction = interval(column["shortening_m"], shortening)
    pressure = column["pressure_pa"][index] + fraction * (column["pressure_pa"][index + 1] - column["pressure_pa"][index])
    strains, works = [], []
    for j, foam in enumerate(foams):
        strain = column["strain"][j][index] + fraction * (column["strain"][j][index + 1] - column["strain"][j][index])
        work = column["work_j_m2"][j][index]
        work += (column["pressure_pa"][index] + pressure) / 2 * foam["thickness_mm"] / 1000 * (strain - column["strain"][j][index])
        strains.append(strain)
        works.append(work)
    return pressure, strains, works


def contact_state(advance, column, foams, assumptions):
    """Integrate pressure and each foam's work over the spherical dome footprint."""
    radius = assumptions["dome"]["curvature_radius_mm"] / 1000
    face = assumptions["dome"]["footprint_radius_mm"] / 1000
    edge_gap = radius - math.sqrt(radius**2 - face**2)
    contact_radius_squared = face**2
    if advance < edge_gap:
        contact_radius_squared = 2 * radius * advance - advance**2
    area = math.pi * contact_radius_squared
    # With local shortening c = advance - gap, the projected ring area is
    # dA = 2*pi*(radius - advance + c)*dc. Integrate from the edge to the centre.
    low_p, low_moment, low_work, low_work_moment = column_integrals(max(0.0, advance - edge_gap), column, foams)
    high_p, high_moment, high_work, high_work_moment = column_integrals(advance, column, foams)
    force = 2 * math.pi * ((radius - advance) * (high_p - low_p) + high_moment - low_moment)
    works = []
    for j in range(len(foams)):
        works.append(2 * math.pi * ((radius - advance) * (high_work[j] - low_work[j])
                                   + high_work_moment[j] - low_work_moment[j]))
    center_pressure, strains, _ = column_state(advance, column, foams)
    hand_m = force / (assumptions["hand_stiffness_n_per_mm"] * 1000)
    hand_work = force * hand_m / 2
    return {"dome_m": advance, "mass_m": advance + hand_m, "force_n": force,
            "area_m2": area, "center_pressure_pa": center_pressure, "strain": strains,
            "foam_work_j": works, "hand_m": hand_m, "hand_work_j": hand_work,
            "total_work_j": sum(works) + hand_work}


def trace_row(state, foams, mass_kg, incoming_speed, speed, time_s):
    components = []
    for i, foam in enumerate(foams):
        compression = foam["thickness_mm"] * state["strain"][i]
        components.append({"strain": state["strain"][i], "compression_mm": compression,
                           "remaining_mm": foam["thickness_mm"] - compression,
                           "work_j": state["foam_work_j"][i]})
    glove_compression = sum(layer["compression_mm"] for layer in components[:-1])
    glove_thickness = sum(foam["thickness_mm"] for foam in foams[:-1])
    return {"time_s": time_s, "force_n": state["force_n"], "speed_m_s": speed,
            "kinetic_energy_j": mass_kg * speed**2 / 2,
            "loading_impulse_n_s": mass_kg * (incoming_speed - speed),
            "dome_advance_mm": state["dome_m"] * 1000, "mass_advance_mm": state["mass_m"] * 1000,
            "contact_area_mm2": state["area_m2"] * 1e6, "center_pressure_pa": state["center_pressure_pa"],
            "glove_compression_mm": glove_compression,
            "glove_remaining_mm": glove_thickness - glove_compression,
            "glove_remaining_percent": 100 * (1 - glove_compression / glove_thickness),
            "glove_work_j": sum(state["foam_work_j"][:-1]), "total_work_j": state["total_work_j"],
            "layers": components[:-1], "target": components[-1],
            "hand": {"compression_mm": state["hand_m"] * 1000, "work_j": state["hand_work_j"]}}


def interpolate(x_values, y_values, x):
    index, fraction = interval(x_values, x)
    return y_values[index] + fraction * (y_values[index + 1] - y_values[index])


def peak_window_rate(times, forces, window_s):
    if times[-1] < window_s:
        return None
    last_start = times[-1] - window_s
    # A piecewise-linear window difference can peak only when either endpoint
    # crosses a trace knot, or at the first/last complete window.
    starts = [0.0, last_start]
    starts.extend(time for time in times if 0 < time < last_start)
    starts.extend(time - window_s for time in times if 0 < time - window_s < last_start)
    return max((interpolate(times, forces, start + window_s) - interpolate(times, forces, start)) / window_s
               for start in starts)


def summarize(rows, foams, curves, assumptions, energy, complete):
    end = rows[-1]
    times = [row["time_s"] for row in rows]
    forces = [row["force_n"] for row in rows]
    early_s = assumptions["metrics"]["early_time_ms"] / 1000
    window_s = assumptions["metrics"]["loading_rate_window_ms"] / 1000
    sample_area = assumptions["sample_width_mm"] * assumptions["sample_length_mm"] / 1e6
    weight_g = sum(foam["density_kg_m3"] * sample_area * foam["thickness_mm"] for foam in foams[:-1])
    metrics = {"peak_force_n": None, "time_to_peak_s": None, "loading_rate_10_90_n_s": None,
               "peak_loading_rate_n_s": None, "loading_rate_window_s": window_s,
               "force_at_5ms_n": None,
               "loading_impulse_n_s": None, "speed_at_peak_m_s": None,
               "maximum_glove_compression_mm": None, "maximum_glove_compression_percent": None,
               "minimum_glove_thickness_mm": None, "foam_sample_weight_g": weight_g,
               "early_time_s": early_s, "early_force_n": None, "early_force_percent_of_peak": None,
               "early_sample_time_s": None, "peak_before_early_time": None,
               "force_at_early_time_n": None, "kinetic_energy_at_early_time_j": None,
               "kinetic_energy_at_early_time_percent": None, "components": None}
    if end["time_s"] >= 0.005:
        metrics["force_at_5ms_n"] = interpolate(times, forces, 0.005)
    if end["time_s"] >= early_s:
        metrics["force_at_early_time_n"] = interpolate(times, forces, early_s)
        kinetic = interpolate(times, [row["kinetic_energy_j"] for row in rows], early_s)
        metrics["kinetic_energy_at_early_time_j"] = kinetic
        metrics["kinetic_energy_at_early_time_percent"] = 100 * kinetic / energy
    if not complete:
        return metrics

    peak = end["force_n"]
    t10 = interpolate(forces, times, 0.1 * peak)
    t90 = interpolate(forces, times, 0.9 * peak)
    sample_time = min(early_s, end["time_s"])
    early_force = interpolate(times, forces, sample_time)
    components = []
    for foam, curve, state in zip(foams, curves, end["layers"] + [end["target"]]):
        components.append({"role": foam["role"], "layer": foam.get("layer"), "foam_id": foam["foam_id"],
                           "compression_mm": state["compression_mm"], "remaining_mm": state["remaining_mm"],
                           "strain": state["strain"], "work_j": state["work_j"],
                           "work_share_percent": 100 * state["work_j"] / energy,
                           "beyond_reference_fit": state["strain"] > curve["join_strain"]})
    components.append({"role": "hand", "compression_mm": end["hand"]["compression_mm"],
                       "work_j": end["hand"]["work_j"], "work_share_percent": 100 * end["hand"]["work_j"] / energy})
    metrics.update({"peak_force_n": peak, "time_to_peak_s": end["time_s"],
                    "loading_rate_10_90_n_s": 0.8 * peak / (t90 - t10),
                    "peak_loading_rate_n_s": peak_window_rate(times, forces, window_s),
                    "loading_impulse_n_s": end["loading_impulse_n_s"], "speed_at_peak_m_s": end["speed_m_s"],
                    "maximum_glove_compression_mm": end["glove_compression_mm"],
                    "maximum_glove_compression_percent": 100 - end["glove_remaining_percent"],
                    "minimum_glove_thickness_mm": end["glove_remaining_mm"],
                    "early_force_n": early_force, "early_force_percent_of_peak": 100 * early_force / peak,
                    "early_sample_time_s": sample_time, "peak_before_early_time": end["time_s"] < early_s,
                    "components": components})
    return metrics


def simulate(mass_kg, speed_m_s, layers, target, *, assumptions=None,
             catalog_path=DIRECTORY / "data" / "analytical-foams.csv"):
    """Return status, metrics, trace, curves and the inputs/assumptions used.

    Incomplete selected catalog data returns status='error' with its reason.
    A numerical range ending before stopping returns status='incomplete'; its
    reached state remains available, but endpoint metrics are None.
    """
    if assumptions is None:
        assumptions = load_assumptions()
    with open(catalog_path, encoding="utf-8", newline="") as source:
        catalog = {row["foam_id"]: row for row in csv.DictReader(source)}
    foams, errors = [], []
    requests = [dict(layer, role="glove") for layer in layers] + [dict(target, role="target")]
    for request in requests:
        entry = catalog[request["foam_id"]]
        required = ("reference_curve", "density_kg_m3",
                    "firmness_p1_value", "firmness_p1_at_pct", "firmness_units")
        missing = [field for field in required if not entry.get(field)]
        for i in (2, 3):
            value, percent = f"firmness_p{i}_value", f"firmness_p{i}_at_pct"
            if entry.get(value) or entry.get(percent):
                missing.extend(field for field in (value, percent) if not entry.get(field))
        if missing:
            errors.append({"foam_id": request["foam_id"], "role": request["role"],
                           "layer": request.get("layer"), "missing_fields": missing})
            continue
        density = float(entry["density_kg_m3"])
        conversions = {"Pa": 1, "kPa": 1000, "N": 1 / assumptions["indenter_area_m2"],
                       "lbf": assumptions["pound_force_n"] / assumptions["indenter_area_m2"]}
        conversion = conversions[entry["firmness_units"]]
        anchors = []
        for i in (1, 2, 3):
            if entry.get(f"firmness_p{i}_value"):
                anchors.append([float(entry[f"firmness_p{i}_at_pct"]) / 100,
                                float(entry[f"firmness_p{i}_value"]) * conversion])
        anchors.sort()
        if any(strain <= 0 or strain >= 1 or pressure <= 0 for strain, pressure in anchors):
            return {"status": "error", "reason": "invalid anchors", "foam_id": request["foam_id"],
                    "message": "Observations must have positive pressures and compression percentages between 0 and 100."}
        foams.append({**request, "materials": json.loads(entry["materials"]), "family": entry["family"],
                      "subtype": entry["subtype"],
                      "reference_curve": entry["reference_curve"], "density_kg_m3": density, "anchors": anchors,
                      "firmness_units": entry["firmness_units"]})
    if errors:
        return {"status": "error", "reason": "incomplete data", "errors": errors}

    curves = []
    for foam in foams:
        try:
            curves.append(material_curve(foam, assumptions))
        except ValueError as error:
            return {"status": "error", "reason": "invalid foam curve", "foam_id": foam["foam_id"], "message": str(error)}
    column = prepare_column(foams, curves)
    energy = mass_kg * speed_m_s**2 / 2
    low, high = 0.0, column["shortening_m"][-1]
    end = contact_state(high, column, foams, assumptions)
    complete = end["total_work_j"] >= energy
    if complete:
        for _ in range(50):
            middle = (low + high) / 2
            state = contact_state(middle, column, foams, assumptions)
            if state["total_work_j"] < energy:
                low = middle
            else:
                high = middle
        end = contact_state((low + high) / 2, column, foams, assumptions)

    previous = contact_state(0.0, column, foams, assumptions)
    previous_speed = speed_m_s
    time_s = 0.0
    rows = [trace_row(previous, foams, mass_kg, speed_m_s, previous_speed, time_s)]
    steps = assumptions["numerics"]["trajectory_steps"]
    for i in range(1, steps + 1):
        fraction = i / steps
        # Smaller steps near stopping resolve the last part of the force rise.
        advance = end["dome_m"] * (2 * fraction - fraction**2)
        state = end if i == steps else contact_state(advance, column, foams, assumptions)
        speed = math.sqrt(2 * max(0.0, energy - state["total_work_j"]) / mass_kg)
        if i == steps and complete:
            speed = 0.0
        time_s += 2 * (state["mass_m"] - previous["mass_m"]) / (previous_speed + speed)
        rows.append(trace_row(state, foams, mass_kg, speed_m_s, speed, time_s))
        previous, previous_speed = state, speed

    numerical_impulse = sum((left["force_n"] + right["force_n"]) / 2 * (right["time_s"] - left["time_s"])
                            for left, right in zip(rows, rows[1:]))
    return {"status": "complete" if complete else "incomplete",
            "reason": None if complete else "Numerical pressure range ended before the striker stopped.",
            "punch": {"mass_kg": mass_kg, "speed_m_s": speed_m_s, "energy_j": energy},
            "foams": foams, "assumptions": assumptions,
            "metrics": summarize(rows, foams, curves, assumptions, energy, complete),
            "trace": rows, "reached": rows[-1],
            "curves": [{"foam_id": foam["foam_id"], "role": foam["role"], "layer": foam.get("layer"),
                        "fast": curve}
                       for foam, curve in zip(foams, curves)],
            "checks": {"energy_residual_j": energy - end["total_work_j"] - rows[-1]["kinetic_energy_j"],
                       "integrated_force_n_s": numerical_impulse,
                       "impulse_residual_n_s": numerical_impulse - rows[-1]["loading_impulse_n_s"]}}
