"""Select the soft and responsive recipes used in Analysis Section 6.

The comparison uses complete 50 mm stacks around a 2.50 g sample weight. Peak
force, maximum compression, and force at 5 ms are converted to midpoint
percentile scores, with lower values scoring higher. The weighted score uses
60% peak force, 20% compression, and 20% force at 5 ms.

Response class is a constraint: soft is below 500 N and responsive is at least
700 N at 5 ms. Both classes must also remain under the peak-force ceiling. The
top-scoring 10% defines each recipe family, and the highest-scoring stack is
replayed to produce the response plots. Mean family outcomes are written as
Markdown tables in the analysis document.
"""

import argparse
from array import array
import csv
import hashlib
import json
import math
from pathlib import Path

import numpy as np

from simulation import interpolate, load_assumptions, material_curve, simulate
from analysis.common import (
    ANALYSIS_PATH,
    CATALOG_PATH,
    FIGURES_PATH,
    FAMILIES,
    LAYER_COLORS,
    LAYERS,
    RESULTS_PATH,
    ROOT,
    TIME_SERIES_COLORS,
    add_figure_heading,
    load_catalog,
    number,
    replace_markdown_block,
)
from analysis.analysis3 import (CONDITIONS, INK, LINE, MUTED, OUTCOMES, PAPER,
                                STYLE_LABELS, SOFT_FORCE_LIMIT_N,
                                POPPY_FORCE_MIN_N)

WEIGHT = "foam_sample_weight_g"
PERFORMANCE_MARKERS = {
    "pillowy": ("<!-- analysis4-soft:start -->", "<!-- analysis4-soft:end -->"),
    "poppy": (
        "<!-- analysis4-responsive:start -->",
        "<!-- analysis4-responsive:end -->",
    ),
}


SCORE_WEIGHTS = (0.60, 0.20, 0.20)
# Original 50 mm soft recipe, 7.7 m/s. This is a comparison benchmark.
PEAK_FORCE_LIMIT_N = 3026.1109631921804


def load_results(path, catalog):
    columns = (WEIGHT, *(item[0] for item in OUTCOMES))
    values = {key: array("d") for key in columns}
    foam_ids = sorted(catalog)
    foam_codes = {foam_id: code for code, foam_id in enumerate(foam_ids)}
    codes = [array("i") for _ in LAYERS]
    thicknesses = [array("d") for _ in LAYERS]
    conditions = None
    with Path(path).open(newline="", encoding="utf-8-sig") as source:
        reader = csv.reader(source)
        header = next(reader, [])
        required = {*columns, *CONDITIONS, "status"}
        for layer in range(1, 5):
            required.update((f"layer_{layer}_foam_id", f"layer_{layer}_thickness_mm"))
        missing = required - set(header)
        if missing:
            raise ValueError(f"Missing results columns: {', '.join(sorted(missing))}")
        indices = {key: header.index(key) for key in required}
        for row_number, row in enumerate(reader, start=2):
            try:
                if len(row) != len(header):
                    raise ValueError("Malformed CSV row")
                current = tuple(row[indices[key]] for key in CONDITIONS)
                if conditions is None:
                    conditions = current
                elif conditions != current:
                    raise ValueError("Impact conditions differ; compare one condition at a time")
                if row[indices["status"]] != "complete":
                    continue
                for key in columns:
                    value = number(row[indices[key]])
                    if key == WEIGHT and value is not None and value <= 0:
                        raise ValueError("Sample weight must be positive")
                    values[key].append(math.nan if value is None else value)
                for layer in range(4):
                    codes[layer].append(foam_codes[row[indices[f"layer_{layer + 1}_foam_id"]]])
                    thickness = number(row[indices[f"layer_{layer + 1}_thickness_mm"]])
                    if thickness is None or thickness <= 0:
                        raise ValueError("Layer thickness must be positive")
                    thicknesses[layer].append(thickness)
            except (KeyError, ValueError) as error:
                raise ValueError(f"Results row {row_number}: {error}") from error
    if not values[WEIGHT]:
        raise ValueError("The results CSV has no data rows")
    return ({key: np.asarray(value) for key, value in values.items()},
            np.column_stack(codes), np.column_stack(thicknesses), foam_ids,
            dict(zip(CONDITIONS, conditions)))


def percentile_scores(data, higher=True):
    """Midpoint percentile: 100 * (number below + half the ties) / N."""
    data = np.asarray(data, dtype=float)
    if not len(data) or not np.isfinite(data).all():
        raise ValueError("Percentile reference must be nonempty and finite")
    _, inverse, counts = np.unique(data, return_inverse=True, return_counts=True)
    ranks = 100 * (np.cumsum(counts) - counts / 2) / len(data)
    result = ranks[inverse]
    return result if higher else 100 - result


def score_stacks(values, weights=SCORE_WEIGHTS):
    weights = np.asarray(weights, dtype=float)
    if (weights.shape != (3,) or not np.isfinite(weights).all()
            or (weights < 0).any() or not math.isclose(float(weights.sum()), 1)):
        raise ValueError("Three nonnegative weights must sum to one")
    eligible = np.isfinite(values[WEIGHT]) & (values[WEIGHT] > 0)
    for key, *_ in OUTCOMES:
        eligible &= np.isfinite(values[key])
    if not eligible.any():
        raise ValueError("No stacks have all three metrics and sample weight")
    components = {}
    for name, key in (("protection", "peak_force_n"),
                      ("reserve", "maximum_glove_compression_percent"),
                      ("response", "force_at_5ms_n")):
        components[name] = np.full(len(eligible), np.nan)
        components[name][eligible] = percentile_scores(values[key][eligible], False)
    protection, reserve, response = (components[key] for key in ("protection", "reserve", "response"))
    overall = weights[0] * protection + weights[1] * reserve + weights[2] * response
    return {"pillowy": overall, "poppy": overall.copy()}, components, eligible


def protection_eligible(values, available, limit_n):
    return available & (values["peak_force_n"] <= limit_n)


def responsiveness_masks(values):
    force = values["force_at_5ms_n"]
    available = np.isfinite(force)
    return {
        "pillowy": available & (force < SOFT_FORCE_LIMIT_N),
        "neutral": available & (force >= SOFT_FORCE_LIMIT_N) & (force < POPPY_FORCE_MIN_N),
        "poppy": available & (force >= POPPY_FORCE_MIN_N),
    }


def select_top(overall, eligible, percentile):
    if not eligible.any():
        raise ValueError("No stacks pass the selection constraints")
    cutoff = float(np.quantile(overall[eligible], percentile / 100, method="linear"))
    return eligible & (overall >= cutoff), cutoff


def stack_id(codes, thicknesses, foam_ids):
    return "|".join(f"{foam_ids[code]}@{thickness:g}mm"
                    for code, thickness in zip(codes, thicknesses))


def best_stack(overall, eligible, codes, thicknesses, foam_ids):
    best = float(overall[eligible].max())
    tied = np.flatnonzero(eligible & (overall == best))
    index = min(tied, key=lambda i: stack_id(codes[i], thicknesses[i], foam_ids))
    return index, stack_id(codes[index], thicknesses[index], foam_ids), len(tied)


def plot_response(result, style, output_dir):
    import matplotlib.pyplot as plt

    trace = result["trace"]
    times = np.array([row["time_s"] for row in trace]) * 1000
    thickness = sum(foam["thickness_mm"] for foam in result["foams"] if foam["role"] == "glove")
    remaining = np.array([[layer["remaining_mm"] for layer in row["layers"]] for row in trace])
    cumulative = 100 * np.cumsum(remaining, axis=1) / thickness
    compression = [
        (layer, cumulative[:, index], LAYER_COLORS[layer])
        for index, layer in enumerate(LAYERS)
    ]
    views = (
        ("compression-force", "Remaining thickness (%)", "Force (kN)", compression,
         ("Force", np.array([row["force_n"] for row in trace]) / 1000,
          TIME_SERIES_COLORS["Force"])),
        ("work-speed", "Glove work (J)", "Speed (m/s)",
         [("Glove work", np.array([row["glove_work_j"] for row in trace]),
           TIME_SERIES_COLORS["Glove work"])],
         ("Speed", np.array([row["speed_m_s"] for row in trace]),
          TIME_SERIES_COLORS["Speed"])),
    )
    with plt.rc_context({"font.family": "monospace",
                         "font.monospace": ["SFMono-Regular", "Consolas", "Liberation Mono",
                                            "Menlo", "DejaVu Sans Mono"],
                         "font.size": 10,
                         "text.color": INK, "axes.labelcolor": MUTED,
                         "xtick.color": MUTED, "ytick.color": MUTED}):
        for slug, left_label, right_label, left_series, right_series in views:
            fig, left = plt.subplots(figsize=(12, 7.5), facecolor=PAPER)
            left.set_facecolor(PAPER)
            right = left.twinx()
            lines = []
            for label, data, color in left_series:
                lines.extend(left.plot(times, data, color=color, linewidth=3, label=label))
            label, data, color = right_series
            lines.extend(right.plot(times, data, color=color, linewidth=4, label=label))
            left.set_xlim(0, times[-1])
            left.set_ylim(0, 1.05 * max(1, max(float(series[1].max()) for series in left_series)))
            right.set_ylim(0, 1.05 * max(1, float(data.max())))
            left.set_xlabel("Time (ms)", labelpad=12)
            left.set_ylabel(left_label, labelpad=12)
            right.set_ylabel(right_label, labelpad=12)
            left.grid(axis="y", color=LINE, linewidth=0.6)
            left.set_axisbelow(True)
            for axis in (left, right):
                axis.spines[["top", "left", "right"]].set_visible(False)
                axis.spines["bottom"].set_color("#636b6d")
                axis.tick_params(axis="both", which="both", length=0, pad=9)
            marker = 5
            if marker <= times[-1]:
                left.axvline(marker, color=LINE, linestyle="--", linewidth=1)
                left.text(marker, 0.97, f" {marker:g} ms", transform=left.get_xaxis_transform(),
                          va="top", color=MUTED, fontsize=9)
            title = ("Thickness and force through impact" if slug == "compression-force"
                     else "Work and speed through impact")
            add_figure_heading(
                fig,
                title,
                f"Selected {STYLE_LABELS[style].lower()} recipe, 50 mm stack at 77 J",
            )
            fig.legend(handles=lines, loc="lower center", bbox_to_anchor=(0.5, 0.025),
                       ncol=len(lines), frameon=False, labelcolor=INK, fontsize=10)
            fig.subplots_adjust(left=0.10, right=0.90, bottom=0.19, top=0.81)
            path = output_dir / f"table4-{style}-response-{slug}.png"
            fig.savefig(path, dpi=160, facecolor=PAPER)
            plt.close(fig)
            print(path, flush=True)


def simulate_recipe(style, values, codes, thicknesses, foam_ids, overall, eligible,
                    conditions, assumptions, catalog_path, assumptions_path, output_dir,
                    recipe_weight=2.5, weight_tolerance=0.05, scoring=None, components=None):
    candidates = eligible & (np.abs(values[WEIGHT] - recipe_weight) <= weight_tolerance)
    if not candidates.any():
        raise ValueError(f"No scored {style} stacks within {recipe_weight:g} +/- {weight_tolerance:g} g")
    index, identifier, tie_count = best_stack(overall, candidates, codes, thicknesses, foam_ids)
    layers = [{"layer": layer + 1, "foam_id": foam_ids[code], "thickness_mm": float(thickness)}
              for layer, (code, thickness) in enumerate(zip(codes[index], thicknesses[index]))]
    request = {
        "mass_kg": float(conditions["mass_kg"]),
        "speed_m_s": float(conditions["speed_m_s"]), "layers": layers,
        "target": {"foam_id": conditions["target_foam_id"],
                   "thickness_mm": float(conditions["target_thickness_mm"])},
    }
    result = simulate(**request, assumptions=assumptions, catalog_path=catalog_path)
    if result["status"] != "complete":
        raise ValueError(f"{style} recipe simulation failed: {result.get('reason')}")
    expected = {key: float(values[key][index]) for key in (WEIGHT, *(item[0] for item in OUTCOMES))}
    metrics = {**result["metrics"], "glove_total_work_share_percent": sum(
        component["work_share_percent"] for component in result["metrics"]["components"]
        if component["role"] == "glove")}
    for key, value in expected.items():
        actual = metrics[key]
        if actual is None or not math.isclose(actual, value, rel_tol=1e-8, abs_tol=1e-9):
            raise ValueError(f"{style} recipe {key} changed: CSV={value}, simulation={actual}")
    sources = {name: {"path": source_path(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
               for name, path in (("catalog", catalog_path), ("assumptions", assumptions_path),
                                  ("engine", ROOT / "simulation.py"), ("analysis", Path(__file__)),
                                  ("score_definitions", ROOT / "analysis/analysis3.py")) }
    record = {"style": style, "stack_id": identifier, "overall_score": float(overall[index]),
              "weight_selection": {"target_g": recipe_weight, "tolerance_g": weight_tolerance,
                                   "candidate_stacks": int(candidates.sum())},
              "tied_best_stacks": tie_count,
              "tie_break": "ascending lexicographic stack ID in outer-to-comfort layer order",
              "request": request, "source_outcomes": expected, "sources": sources,
              "scoring": scoring,
              "score_components": {key: float(data[index]) for key, data in components.items()},
              "simulation": result}
    path = output_dir / f"table4-{style}-recipe.json"
    path.write_text(json.dumps(record, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"{STYLE_LABELS[style]} recipe: {identifier} (score {overall[index]:g}, {tie_count:,} ties)", flush=True)
    print(path, flush=True)
    plot_response(result, style, output_dir)
    return record


def catalog_properties(path, foam_ids, used_codes, assumptions):
    with Path(path).open(newline="", encoding="utf-8-sig") as source:
        entries = {row["foam_id"]: row for row in csv.DictReader(source)}
    densities = np.full(len(foam_ids), np.nan)
    firmness = np.full(len(foam_ids), np.nan)
    conversions = {
        "Pa": 1, "kPa": 1000,
        "N": 1 / assumptions["indenter_area_m2"],
        "lbf": assumptions["pound_force_n"] / assumptions["indenter_area_m2"],
    }
    for code in used_codes:
        foam_id = foam_ids[code]
        row = entries[foam_id]
        try:
            density = number(row["density_kg_m3"])
            if density is None or density <= 0:
                raise ValueError("Density must be positive")
            anchors = []
            for index in range(1, 4):
                value = number(row[f"firmness_p{index}_value"])
                strain = number(row[f"firmness_p{index}_at_pct"])
                if value is None and strain is None:
                    continue
                if value is None or strain is None or value <= 0 or not 0 < strain < 100:
                    raise ValueError("Invalid firmness anchor")
                anchors.append([strain / 100, value * conversions[row["firmness_units"]]])
            if not anchors:
                raise ValueError("Missing firmness anchors")
            curve = material_curve({"reference_curve": row["reference_curve"],
                                    "density_kg_m3": density, "anchors": sorted(anchors)},
                                   assumptions, fast=True)
            if not curve["strain"][0] <= 0.25 <= curve["strain"][-1]:
                raise ValueError("Curve does not cover 25% compression")
            densities[code] = density
            firmness[code] = interpolate(curve["strain"], curve["pressure_pa"], 0.25) / 1000
        except (KeyError, ValueError) as error:
            raise ValueError(f"Catalog grade {foam_id}: {error}") from error
    return densities, firmness


def statistics(values):
    count = len(values)
    return {
        "count": count,
        "mean": float(values.mean()) if count else "",
        "sd": float(values.std(ddof=1)) if count > 1 else "",
        "minimum": float(values.min()) if count else "",
        "maximum": float(values.max()) if count else "",
    }


def write_csv(path, rows):
    with path.open("w", newline="", encoding="utf-8") as destination:
        writer = csv.DictWriter(destination, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(path, flush=True)


def render_performance_table(rows):
    """Render mean outcomes for one top-scoring recipe family."""
    summaries = {row["outcome"]: row for row in rows if row["cohort"] == "top_scoring"}
    measures = (
        ("Stack sample weight", "Sample weight (g)", 2),
        ("Peak force", "Peak force (kN)", 2),
        ("Force at 5 ms", "Force at 5 ms (kN)", 3),
        ("Maximum glove compression", "Compression (%)", 1),
    )
    lines = ["| Metric | Mean |", "| --- | ---: |"]
    for outcome, label, decimals in measures:
        row = summaries[outcome]
        lines.append(f"| {label} | {float(row['mean']):.{decimals}f} |")
    return "\n".join(lines)


def write_analysis_tables(performance_rows, analysis_path=ANALYSIS_PATH):
    """Replace the two generated performance tables in Section 6."""
    for style, markers in PERFORMANCE_MARKERS.items():
        replace_markdown_block(
            analysis_path,
            *markers,
            render_performance_table(performance_rows[style]),
        )


def write_tables(output_dir, values, codes, thicknesses, foam_ids, catalog,
                 densities, firmness, overall, eligible, selected, cutoff, percentile, peak_force_limit_n,
                 style, recipe_weight=2.5, weight_tolerance=0.05):
    cohorts = (("all_scored", eligible), ("selected", selected))
    prefix = f"table4-{style}"
    write_csv(output_dir / f"{prefix}-selection.csv", [{
        "responsiveness": STYLE_LABELS[style],
        "score_reference": "common complete population within sample weight range, before protection ceiling",
        "sample_weight_target_g": recipe_weight,
        "sample_weight_tolerance_g": weight_tolerance,
        "selection_reference": "within response class after protection ceiling",
        "total_stacks": len(overall), "scored_stacks": int(eligible.sum()),
        "ineligible_stacks": int((~eligible).sum()), "peak_force_limit_n": peak_force_limit_n,
        "selection_percentile": percentile, "score_cutoff": cutoff,
        "selected_stacks": int(selected.sum()),
        "selected_percent_of_scored": 100 * selected.sum() / eligible.sum(),
        "include_cutoff_ties": True,
        "component_ties": "midpoint percentile",
        "protection_weight": SCORE_WEIGHTS[0], "reserve_weight": SCORE_WEIGHTS[1],
        "response_weight": SCORE_WEIGHTS[2],
        "soft_force_upper_exclusive_n": SOFT_FORCE_LIMIT_N,
        "responsive_force_lower_inclusive_n": POPPY_FORCE_MIN_N,
    }])
    rows = []
    measures = [(WEIGHT, "Stack sample weight", "g", 1),
                *((key, title, label.rsplit("(", 1)[1].rstrip(")"), scale)
                  for key, title, label, scale, _ in OUTCOMES),
                ("overall_score", "Overall score", "0-100", 1)]
    for key, label, units, scale in measures:
        data = overall if key == "overall_score" else values[key]
        rows.append({"cohort": "top_scoring", "outcome": label, "units": units,
                     **statistics(data[selected] * scale)})
    write_csv(output_dir / f"{prefix}-performance.csv", rows)

    families = np.array([catalog[foam_id]["family"] for foam_id in foam_ids])
    family_rows, property_rows, grade_rows = [], [], []
    for layer, label in enumerate(LAYERS):
        layer_families = families[codes[:, layer]]
        for code in np.unique(codes[eligible, layer]):
            foam_id = foam_ids[code]
            members = codes[:, layer] == code
            all_count = int((eligible & members).sum())
            selected_members = selected & members
            selected_count = int(selected_members.sum())
            grade_rows.append({
                "layer": label, "foam_id": foam_id, "foam": catalog[foam_id]["name"],
                "family": catalog[foam_id]["family"], "density_kg_m3": densities[code],
                "modeled_pressure_at_25_percent_kpa": firmness[code],
                "all_scored_count": all_count,
                "all_scored_share_percent": 100 * all_count / eligible.sum(),
                "selected_count": selected_count,
                "selected_share_percent": 100 * selected_count / selected.sum(),
                "selected_percent_of_grade": 100 * selected_count / all_count,
                "selected_mean_thickness_mm": float(thicknesses[selected_members, layer].mean())
                if selected_count else "",
            })
        properties = (
            ("Density (kg/m3)", densities[codes[:, layer]]),
            ("Modeled impact pressure at 25% compression (kPa)", firmness[codes[:, layer]]),
            ("Thickness (mm)", thicknesses[:, layer]),
        )
        for family in FAMILIES:
            members = layer_families == family
            all_count = int((eligible & members).sum())
            selected_count = int((selected & members).sum())
            family_rows.append({
                "layer": label, "family": family, "all_scored_count": all_count,
                "all_scored_share_percent": 100 * all_count / eligible.sum(),
                "selected_count": selected_count,
                "selected_share_percent": 100 * selected_count / selected.sum(),
                "selected_percent_of_family": 100 * selected_count / all_count if all_count else "",
            })
        for family in ("All", *FAMILIES):
            members = np.ones(len(overall), dtype=bool) if family == "All" else layer_families == family
            if not (eligible & members).any():
                continue
            for cohort, mask in cohorts:
                for measure, data in properties:
                    property_rows.append({"layer": label, "family": family,
                                          "cohort": cohort, "property": measure,
                                          **statistics(data[mask & members])})
    write_csv(output_dir / f"{prefix}-layer-families.csv", family_rows)
    write_csv(output_dir / f"{prefix}-layer-properties.csv", property_rows)
    write_csv(output_dir / f"{prefix}-layer-grades.csv", grade_rows)
    return rows


def source_path(path):
    resolved = path.resolve()
    try:
        return str(resolved.relative_to(ROOT))
    except ValueError:
        return resolved.name


def file_source(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return {"path": source_path(path), "sha256": digest.hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=RESULTS_PATH)
    parser.add_argument("--catalog", type=Path, default=CATALOG_PATH)
    parser.add_argument("--assumptions", type=Path, default=ROOT / "assumptions.yaml")
    parser.add_argument("--output-dir", type=Path, default=FIGURES_PATH)
    parser.add_argument("--analysis", type=Path, default=ANALYSIS_PATH)
    parser.add_argument("--percentile", type=float, default=90)
    parser.add_argument("--recipe-weight", type=float, default=2.5)
    parser.add_argument("--recipe-weight-tolerance", type=float, default=0.05)
    parser.add_argument("--peak-force-limit-kn", type=float, default=PEAK_FORCE_LIMIT_N / 1000)
    args = parser.parse_args()
    if not math.isfinite(args.percentile) or not 0 < args.percentile < 100:
        parser.error("--percentile must be between 0 and 100")
    if not math.isfinite(args.recipe_weight) or args.recipe_weight <= 0:
        parser.error("--recipe-weight must be a positive finite number")
    if not math.isfinite(args.recipe_weight_tolerance) or args.recipe_weight_tolerance < 0:
        parser.error("--recipe-weight-tolerance must be a nonnegative finite number")
    if not math.isfinite(args.peak_force_limit_kn) or args.peak_force_limit_kn <= 0:
        parser.error("--peak-force-limit-kn must be a positive finite number")
    catalog = load_catalog(args.catalog)
    values, codes, thicknesses, foam_ids, conditions = load_results(args.results, catalog)
    complete_count = len(codes)
    if not np.isclose(thicknesses.sum(axis=1), 50, rtol=0, atol=1e-8).all():
        raise ValueError("Analysis 4 requires a population of 50 mm stacks")
    in_range = np.abs(values[WEIGHT] - args.recipe_weight) <= args.recipe_weight_tolerance
    values = {key: data[in_range] for key, data in values.items()}
    codes, thicknesses = codes[in_range], thicknesses[in_range]
    scores, components, available = score_stacks(values)
    limit_n = args.peak_force_limit_kn * 1000
    eligible = protection_eligible(values, available, limit_n)
    if not eligible.any():
        raise ValueError("No stacks pass the weight and protection constraints")
    response_masks = responsiveness_masks(values)
    style_eligible = {style: eligible & response_masks[style] for style in scores}
    for style, mask in style_eligible.items():
        if not mask.any():
            raise ValueError(f"No {STYLE_LABELS[style]} stacks pass the weight and protection constraints")
    assumptions = load_assumptions(args.assumptions)
    densities, firmness = catalog_properties(args.catalog, foam_ids, np.unique(codes[eligible]), assumptions)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    scoring = {
        "results": file_source(args.results), "conditions": conditions,
        "total_thickness_mm": 50, "complete_results": complete_count,
        "weight_target_g": args.recipe_weight, "weight_tolerance_g": args.recipe_weight_tolerance,
        "reference_stacks": int(available.sum()), "eligible_stacks": int(eligible.sum()),
        "percentile_method": "100 * (number below + half of equal values) / reference count",
        "reference": "common complete weight-constrained population before protection ceiling",
        "weights": dict(zip(("protection", "reserve", "response"), SCORE_WEIGHTS)),
        "directions": {"peak_force_n": "lower", "maximum_glove_compression_percent": "lower",
                       "force_at_5ms_n": {"pillowy": "lower", "poppy": "lower"}},
        "peak_force_limit_n": limit_n,
        "default_peak_force_benchmark": "original 50 mm soft recipe at 7.7 m/s",
        "top_scoring_percentile": args.percentile, "include_cutoff_ties": True,
        "response_bands_n": {
            "soft": {"upper_exclusive": SOFT_FORCE_LIMIT_N},
            "neutral": {"lower_inclusive": SOFT_FORCE_LIMIT_N, "upper_exclusive": POPPY_FORCE_MIN_N},
            "poppy": {"lower_inclusive": POPPY_FORCE_MIN_N},
        },
        "response_class_counts": {
            style: {"within_weight_band": int((available & mask).sum()),
                    "within_weight_band_and_protection_ceiling": int((eligible & mask).sum())}
            for style, mask in response_masks.items()
        },
        "selections": {},
    }
    selected_masks = {}
    performance_rows = {}
    for style, overall in scores.items():
        candidates = style_eligible[style]
        selected, cutoff = select_top(overall, candidates, args.percentile)
        selected_masks[style] = selected
        performance_rows[style] = write_tables(
            args.output_dir, values, codes, thicknesses, foam_ids, catalog,
            densities, firmness, overall, candidates, selected, cutoff,
            args.percentile, limit_n, style, args.recipe_weight,
            args.recipe_weight_tolerance,
        )
        # Do not include mutable selection summaries inside recipe metadata.
        recipe_scoring = {key: value for key, value in scoring.items() if key != "selections"}
        record = simulate_recipe(style, values, codes, thicknesses, foam_ids, overall, candidates,
                                 conditions, assumptions, args.catalog, args.assumptions,
                                 args.output_dir, args.recipe_weight, args.recipe_weight_tolerance,
                                 recipe_scoring, components)
        scoring["selections"][style] = {"cutoff": cutoff, "top_scoring_stacks": int(selected.sum()),
                                        "eligible_stacks": int(candidates.sum()),
                                        "recipe": record["stack_id"]}
        print(f"{STYLE_LABELS[style]}: {selected.sum():,} top scoring / {candidates.sum():,} eligible; "
              f"cutoff {cutoff:.4f}", flush=True)
    scoring["top_scoring_overlap"] = int((selected_masks["pillowy"] & selected_masks["poppy"]).sum())
    (args.output_dir / "table4-scoring.json").write_text(
        json.dumps(scoring, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    identifiers = [stack_id(code, thickness, foam_ids) for code, thickness in zip(codes, thicknesses)]
    score_rows = [{"stack_id": identifier,
                   **{key: float(data[i]) for key, data in values.items()},
                   **{f"{key}_percentile": float(data[i]) for key, data in components.items()},
                   "eligible": bool(eligible[i]),
                   "response_class": "soft" if response_masks["pillowy"][i] else
                                     "responsive" if response_masks["poppy"][i] else "neutral",
                   "soft_eligible": bool(style_eligible["pillowy"][i]),
                   "responsive_eligible": bool(style_eligible["poppy"][i]),
                   "soft_score": float(scores["pillowy"][i]),
                   "responsive_score": float(scores["poppy"][i]),
                   "soft_top_scoring": bool(selected_masks["pillowy"][i]),
                   "responsive_top_scoring": bool(selected_masks["poppy"][i])}
                  for i, identifier in enumerate(identifiers) if available[i]]
    write_csv(args.output_dir / "table4-scores.csv", score_rows)
    sensitivity = []
    for weights in ((0.5, 0.2, 0.3), SCORE_WEIGHTS, (0.7, 0.2, 0.1)):
        alternatives, _, _ = score_stacks(values, weights)
        for style, overall in alternatives.items():
            candidates = style_eligible[style]
            index, identifier, ties = best_stack(overall, candidates, codes, thicknesses, foam_ids)
            selected, _ = select_top(overall, candidates, args.percentile)
            sensitivity.append({"style": STYLE_LABELS[style],
                                "protection_weight": weights[0], "reserve_weight": weights[1],
                                "response_weight": weights[2], "stack_id": identifier,
                                "tied_best_stacks": ties, "overall_score": float(overall[index]),
                                **{key: float(data[index]) for key, data in values.items()},
                                "top_scoring_stacks": int(selected.sum()),
                                "retained_default_top_percent": 100 * (selected & selected_masks[style]).sum()
                                                                / selected_masks[style].sum()})
    write_csv(args.output_dir / "table4-weight-sensitivity.csv", sensitivity)
    write_analysis_tables(performance_rows, args.analysis)


if __name__ == "__main__":
    main()
