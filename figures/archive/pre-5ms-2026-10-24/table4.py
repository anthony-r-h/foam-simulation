"""Characterize pillowy and poppy stacks above each style's 90th-percentile cutoff.

Pillowy means peak loading rate below 0.70 kN/ms; poppy means at least 1.00
kN/ms. Neutral stacks are outside these two recipe groups. Scores and selection
cutoffs are recalculated separately within each style. Lower loading rates
remain preferred for both styles, including within the poppy range.

Each outcome receives a 1-5 score using Table 3's 0.5 g bucket quintile method and
preferred direction. Exact boundary ties receive the better adjoining score;
identical outcomes always receive identical scores. The overall score is the
equally weighted mean of all five scores. Only stacks with all five outcomes
and sample weight receive an overall score. Component boundaries still use
every available outcome/weight pair within the style. No status filter is applied.
The overall cutoff uses the linear 90th percentile across the style's scored stacks
within 2.50 +/- 0.05 g, including every cutoff tie. Existing component scores are
retained; the weight constraint applies before selecting the top-scoring group.

Performance tables show only top-scoring stacks. Composition outputs compare
them with all scored stacks of that style in the same weight range: layer-family and grade representation,
and density, modeled firmness, and thickness.
Firmness is fast-curve pressure at 25% compression using the existing model.
Layer properties are summarized both overall and within each foam family.
These are composition associations, not isolated causal effects.

Each style's response plots rerun its highest-scoring stack within 2.50 +/- 0.05 g
through simulate(). The same weight constraint applies to recipes, performance
summaries, and composition summaries.
Ties sort lexicographically by a stable stack ID: the four foam_id@thicknessmm
entries joined by | in layer order. Recipe JSON files retain the request,
source-file hashes, source outcomes, and complete simulation response.
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
from table1 import FAMILIES, LAYERS, load_catalog, number
from table3 import CONDITIONS, INK, LINE, MUTED, OUTCOMES, PAPER, bucket_quantiles, weight_edges

ROOT = Path(__file__).resolve().parent
WEIGHT = "foam_sample_weight_g"


def responsiveness_masks(values):
    rate = values["peak_loading_rate_n_s"]
    available = np.isfinite(rate)
    return {
        "pillowy": available & (rate < 700_000),
        "poppy": available & (rate >= 1_000_000),
    }


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
        required = {*columns, *CONDITIONS}
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


def score_stacks(values, width):
    weights = values[WEIGHT]
    edges = weight_edges(weights, width)
    scores = np.zeros((len(weights), len(OUTCOMES)), dtype=np.uint8)
    for dimension, (key, _, _, _, direction) in enumerate(OUTCOMES):
        available = np.isfinite(weights) & np.isfinite(values[key])
        w, y = weights[available], values[key][available]
        if direction == "higher":
            y = -y
        quantiles = bucket_quantiles(w, y, edges)
        buckets = np.searchsorted(edges, w, side="right") - 1
        boundaries = quantiles[buckets, 1:5]
        scores[available, dimension] = 5 - (y[:, None] > boundaries).sum(axis=1)
    eligible = (scores > 0).all(axis=1)
    if not eligible.any():
        raise ValueError("No stacks have all five scores")
    overall = np.full(len(weights), np.nan)
    overall[eligible] = scores[eligible].mean(axis=1)
    return overall, eligible


def select_top(overall, eligible, percentile):
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
    layer_colors = ("#d7c3a6", "#a5c7da", "#d6a5bb", "#a4cdb9")
    compression = [(label, cumulative[:, index], color)
                   for index, (label, color) in enumerate(zip(LAYERS, layer_colors))]
    views = (
        ("compression-force", "Remaining thickness (%)", "Force (kN)", compression,
         ("Force", np.array([row["force_n"] for row in trace]) / 1000, "#ff995c")),
        ("work-speed", "Glove work (J)", "Speed (m/s)",
         [("Glove work", np.array([row["glove_work_j"] for row in trace]), "#f3c75c")],
         ("Speed", np.array([row["speed_m_s"] for row in trace]), "#67d4e8")),
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
            marker = result["metrics"]["early_time_s"] * 1000
            if marker <= times[-1]:
                left.axvline(marker, color=LINE, linestyle="--", linewidth=1)
                left.text(marker, 0.97, f" {marker:g} ms", transform=left.get_xaxis_transform(),
                          va="top", color=MUTED, fontsize=9)
            title = "Thickness and force" if slug == "compression-force" else "Work and speed"
            fig.suptitle(f"{style.capitalize()}: {title.lower()}", fontsize=20,
                         x=0.10, ha="left", y=0.95)
            fig.legend(handles=lines, loc="lower center", bbox_to_anchor=(0.5, 0.025),
                       ncol=len(lines), frameon=False, labelcolor=INK, fontsize=10)
            fig.subplots_adjust(left=0.10, right=0.90, bottom=0.19, top=0.83)
            path = output_dir / f"table4-{style}-response-{slug}.png"
            fig.savefig(path, dpi=160, facecolor=PAPER)
            plt.close(fig)
            print(path, flush=True)


def simulate_recipe(style, values, codes, thicknesses, foam_ids, overall, eligible,
                    conditions, assumptions, catalog_path, assumptions_path, output_dir,
                    recipe_weight=2.5, weight_tolerance=0.05):
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
    sources = {name: {"path": str(path.resolve()), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
               for name, path in (("catalog", catalog_path), ("assumptions", assumptions_path),
                                  ("engine", ROOT / "simulation.py"), ("analysis", Path(__file__))) }
    record = {"style": style, "stack_id": identifier, "overall_score": float(overall[index]),
              "weight_selection": {"target_g": recipe_weight, "tolerance_g": weight_tolerance,
                                   "candidate_stacks": int(candidates.sum())},
              "tied_best_stacks": tie_count,
              "tie_break": "ascending lexicographic stack ID in outer-to-comfort layer order",
              "request": request, "source_outcomes": expected, "sources": sources,
              "simulation": result}
    path = output_dir / f"table4-{style}-recipe.json"
    path.write_text(json.dumps(record, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"{style.capitalize()} recipe: {identifier} (score {overall[index]:g}, {tie_count:,} ties)", flush=True)
    print(path, flush=True)
    plot_response(result, style, output_dir)


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


def plot_performance(rows, path, style=None):
    import matplotlib.pyplot as plt

    summaries = {row["outcome"]: row for row in rows if row["cohort"] == "top_scoring"}
    measures = (
        ("Stack sample weight", "Sample weight", 2),
        ("Peak force", "Peak force", 2),
        ("10–90% loading rate", "10–90% loading rate", 3),
        ("Peak loading rate over 0.5 ms", "Peak loading rate", 3),
        ("Maximum glove compression", "Compression", 1),
        ("Glove loading work share", "Glove work share", 1),
    )
    cells = []
    for outcome, label, decimals in measures:
        row = summaries[outcome]
        separator = "" if row["units"] == "%" else " "
        value = f"{float(row['mean']):.{decimals}f}{separator}{row['units']}"
        cells.append([label, value])
    with plt.rc_context({"font.family": "monospace", "text.color": INK}):
        fig, ax = plt.subplots(figsize=(8.5, 4.8), facecolor=PAPER)
        ax.set_axis_off()
        title = f"{style.capitalize()} glove performance" if style else "Glove performance"
        fig.text(0.06, 0.89, title, fontsize=20, color=INK)
        table = ax.table(cellText=cells,
                         colLabels=["Mean outcome", "Top scoring"],
                         colWidths=[0.62, 0.38], cellLoc="left", colLoc="left",
                         bbox=[0, 0, 1, 1])
        table.auto_set_font_size(False)
        table.set_fontsize(13)
        for (row, _), cell in table.get_celld().items():
            cell.set_facecolor(PAPER)
            cell.set_edgecolor(LINE)
            cell.set_linewidth(0.7)
            cell.visible_edges = "B"
            cell.PAD = 0.03
            cell.get_text().set_color(MUTED if row == 0 else INK)
        fig.subplots_adjust(left=0.06, right=0.96, bottom=0.09, top=0.80)
        fig.savefig(path, dpi=160, facecolor=PAPER)
        plt.close(fig)
    print(path, flush=True)


def write_tables(output_dir, values, codes, thicknesses, foam_ids, catalog,
                 densities, firmness, overall, eligible, selected, cutoff, percentile, width,
                 style, recipe_weight=2.5, weight_tolerance=0.05):
    cohorts = (("all_scored", eligible), ("selected", selected))
    prefix = f"table4-{style}"
    write_csv(output_dir / f"{prefix}-selection.csv", [{
        "responsiveness": style,
        "score_reference": "within responsiveness style and weight bucket",
        "sample_weight_target_g": recipe_weight,
        "sample_weight_tolerance_g": weight_tolerance,
        "selection_reference": "within responsiveness style and sample weight range",
        "total_stacks": len(overall), "scored_stacks": int(eligible.sum()),
        "unscored_stacks": int((~eligible).sum()), "bucket_width_g": width,
        "selection_percentile": percentile, "score_cutoff": cutoff,
        "selected_stacks": int(selected.sum()),
        "selected_percent_of_scored": 100 * selected.sum() / eligible.sum(),
        "include_cutoff_ties": True,
        "component_boundary_ties": "better adjoining quintile",
    }])
    rows = []
    measures = [(WEIGHT, "Stack sample weight", "g", 1),
                *((key, title, label.rsplit("(", 1)[1].rstrip(")"), scale)
                  for key, title, label, scale, _ in OUTCOMES),
                ("overall_score", "Overall score", "1-5", 1)]
    for key, label, units, scale in measures:
        data = overall if key == "overall_score" else values[key]
        rows.append({"cohort": "top_scoring", "outcome": label, "units": units,
                     **statistics(data[selected] * scale)})
    write_csv(output_dir / f"{prefix}-performance.csv", rows)
    plot_performance(rows, output_dir / f"{prefix}-performance.png", style)

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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=ROOT / "data/results_full_2026-10-23.csv")
    parser.add_argument("--catalog", type=Path, default=ROOT / "data/analytical-foams2.csv")
    parser.add_argument("--assumptions", type=Path, default=ROOT / "assumptions.yaml")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "figures")
    parser.add_argument("--bucket-width", type=float, default=0.5)
    parser.add_argument("--percentile", type=float, default=90)
    parser.add_argument("--recipe-weight", type=float, default=2.5)
    parser.add_argument("--recipe-weight-tolerance", type=float, default=0.05)
    args = parser.parse_args()
    if not math.isfinite(args.bucket_width) or args.bucket_width <= 0:
        parser.error("--bucket-width must be a positive finite number")
    if not math.isfinite(args.percentile) or not 0 < args.percentile < 100:
        parser.error("--percentile must be between 0 and 100")
    if not math.isfinite(args.recipe_weight) or args.recipe_weight <= 0:
        parser.error("--recipe-weight must be a positive finite number")
    if not math.isfinite(args.recipe_weight_tolerance) or args.recipe_weight_tolerance < 0:
        parser.error("--recipe-weight-tolerance must be a nonnegative finite number")
    catalog = load_catalog(args.catalog)
    values, codes, thicknesses, foam_ids, conditions = load_results(args.results, catalog)
    assumptions = load_assumptions(args.assumptions)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for style, mask in responsiveness_masks(values).items():
        if not mask.any():
            raise ValueError(f"No {style} stacks in the results")
        style_values = {key: value[mask] for key, value in values.items()}
        style_codes, style_thicknesses = codes[mask], thicknesses[mask]
        overall, eligible = score_stacks(style_values, args.bucket_width)
        in_range = np.abs(style_values[WEIGHT] - args.recipe_weight) <= args.recipe_weight_tolerance
        style_values = {key: value[in_range] for key, value in style_values.items()}
        style_codes, style_thicknesses = style_codes[in_range], style_thicknesses[in_range]
        overall, eligible = overall[in_range], eligible[in_range]
        if not eligible.any():
            raise ValueError(f"No scored {style} stacks within {args.recipe_weight:g} "
                             f"+/- {args.recipe_weight_tolerance:g} g")
        selected, cutoff = select_top(overall, eligible, args.percentile)
        densities, firmness = catalog_properties(args.catalog, foam_ids,
                                                 np.unique(style_codes[eligible]), assumptions)
        write_tables(args.output_dir, style_values, style_codes, style_thicknesses,
                     foam_ids, catalog, densities, firmness, overall, eligible,
                     selected, cutoff, args.percentile, args.bucket_width, style,
                     args.recipe_weight, args.recipe_weight_tolerance)
        simulate_recipe(style, style_values, style_codes, style_thicknesses, foam_ids,
                        overall, eligible, conditions, assumptions, args.catalog,
                        args.assumptions, args.output_dir, args.recipe_weight,
                        args.recipe_weight_tolerance)
        print(f"{style.capitalize()}: selected {selected.sum():,} of {eligible.sum():,} scored stacks "
              f"({100 * selected.sum() / eligible.sum():.2f}%), score >= {cutoff:g}", flush=True)


if __name__ == "__main__":
    main()
