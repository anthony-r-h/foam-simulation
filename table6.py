"""Sensitivity of the two Table 4 recipes to thickness and punch energy.

Run: python3 table6.py
Replot saved results without simulations: python3 table6.py --plot-only

All four glove layers scale proportionally from 50 mm, without rounding.
Cross 25..60 mm in 5 mm steps with 60..120 J in 10 J steps. Keep striking
mass, target, dome, hand spring and material assumptions fixed. Set speed
to sqrt(2 * energy / mass). Recipe names identify the baseline constructions,
not a fixed response class at every condition. No population scores are reused.

Save every request and full engine response, including traces, as JSON.gz;
also save a flat CSV, input snapshots, baseline checks and refinement checks.
The main simulation dataset and Table 4 recipe files are read-only inputs.
"""

import argparse
import copy
import csv
import gzip
import hashlib
import json
import math
from pathlib import Path
import shutil

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
import numpy as np

from simulation import load_assumptions, simulate
from table3 import (INK, LINE, MUTED, PAPER, SOFT_FORCE_LIMIT_N, POPPY_FORCE_MIN_N,
                    QUINTILE_COLORS)

ROOT = Path(__file__).resolve().parent
THICKNESSES = tuple(range(25, 61, 5))
ENERGIES = tuple(range(60, 121, 10))
RECIPES = (("soft", "pillowy"), ("responsive", "poppy"))
METRICS = (
    ("peak_force_n", "Peak force (kN)", 0.001),
    ("maximum_glove_compression_percent", "Compression (%)", 1),
    ("force_at_5ms_n", "Force at 5 ms (kN)", 0.001),
)
CHECK_METRICS = tuple(item[0] for item in METRICS) + (
    "minimum_glove_thickness_mm", "time_to_peak_s", "foam_sample_weight_g")


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def write_csv(path, rows):
    with path.open("w", newline="", encoding="utf-8") as destination:
        writer = csv.DictWriter(destination, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def scaled_request(original, thickness_mm, energy_j):
    if not math.isfinite(thickness_mm) or thickness_mm <= 0:
        raise ValueError("Thickness must be positive and finite")
    if not math.isfinite(energy_j) or energy_j <= 0:
        raise ValueError("Energy must be positive and finite")
    request = copy.deepcopy(original)
    original_thickness = sum(layer["thickness_mm"] for layer in original["layers"])
    for layer in request["layers"]:
        layer["thickness_mm"] *= thickness_mm / original_thickness
    request["speed_m_s"] = math.sqrt(2 * energy_j / request["mass_kg"])
    return request


def response_class(force):
    if force is None:
        return "unavailable"
    if force < SOFT_FORCE_LIMIT_N:
        return "soft"
    if force < POPPY_FORCE_MIN_N:
        return "neutral"
    return "responsive"


def check_result(result, request):
    if result["status"] != "complete":
        raise ValueError(f"Simulation {result['status']}: {result.get('reason')}")
    energy = 0.5 * request["mass_kg"] * request["speed_m_s"] ** 2
    metrics, trace = result["metrics"], result["trace"]
    times = np.array([row["time_s"] for row in trace])
    forces = np.array([row["force_n"] for row in trace])
    speeds = np.array([row["speed_m_s"] for row in trace])
    if not all(np.isfinite(data).all() for data in (times, forces, speeds)):
        raise ValueError("Nonfinite trace")
    if not ((np.diff(times) > 0).all() and (np.diff(forces) >= -1e-8).all()
            and (np.diff(speeds) <= 1e-8).all() and speeds[-1] == 0):
        raise ValueError("Invalid loading trajectory")
    residual = max(abs(row["total_work_j"] + row["kinetic_energy_j"] - energy) for row in trace)
    impulse_relative = abs(result["checks"]["impulse_residual_n_s"]) / (
        request["mass_kg"] * request["speed_m_s"])
    if residual / energy > 1e-8 or impulse_relative > 1e-4:
        raise ValueError("Energy or impulse balance failed")
    if not math.isclose(sum(c["work_share_percent"] for c in metrics["components"]), 100, abs_tol=1e-6):
        raise ValueError("Component work does not sum to incoming energy")
    thickness = sum(layer["thickness_mm"] for layer in request["layers"])
    if not 0 <= metrics["maximum_glove_compression_percent"] <= 100:
        raise ValueError("Compression outside physical bounds")
    if not math.isclose(metrics["minimum_glove_thickness_mm"] +
                        metrics["maximum_glove_compression_mm"], thickness, abs_tol=1e-8):
        raise ValueError("Remaining thickness does not reconcile")
    force5 = metrics["force_at_5ms_n"]
    if times[-1] < 0.005:
        if force5 is not None:
            raise ValueError("Force at 5 ms is outside the loading trace")
    elif force5 is None or not math.isclose(force5, float(np.interp(0.005, times, forces)), rel_tol=1e-10):
        raise ValueError("Force at 5 ms does not match the saved trace")
    return {"maximum_trace_energy_residual_j": residual,
            "relative_impulse_residual": impulse_relative}


def run_case(path, request, assumptions, catalog, engine_hash, catalog_hash):
    inputs = {"request": request, "assumptions": assumptions,
              "engine_sha256": engine_hash, "catalog_sha256": catalog_hash}
    fingerprint = hashlib.sha256(json.dumps(inputs, sort_keys=True).encode()).hexdigest()
    if path.exists():
        with gzip.open(path, "rt", encoding="utf-8") as source:
            record = json.load(source)
        if record["fingerprint"] != fingerprint or record["inputs"] != inputs:
            raise ValueError(f"Saved inputs changed at {path}; use a new --data-dir")
    else:
        record = {"fingerprint": fingerprint, "inputs": inputs,
                  "result": simulate(**request, assumptions=assumptions, catalog_path=catalog)}
        # Preserve raw evidence even if validation subsequently fails.
        temporary = path.with_suffix(path.suffix + ".tmp")
        with gzip.open(temporary, "wt", encoding="utf-8") as destination:
            json.dump(record, destination, allow_nan=False, separators=(",", ":"))
        temporary.replace(path)
    checks = check_result(record["result"], request)
    return record["result"], checks


def summary_row(style, thickness, energy, request, result, checks, raw_file):
    metrics = result["metrics"]
    row = {"recipe": style, "thickness_mm": thickness, "energy_j": energy,
           "mass_kg": request["mass_kg"], "speed_m_s": request["speed_m_s"],
           "target_foam_id": request["target"]["foam_id"],
           "target_thickness_mm": request["target"]["thickness_mm"],
           "status": result["status"], "response_class": response_class(metrics["force_at_5ms_n"])}
    for layer in request["layers"]:
        row[f"layer_{layer['layer']}_foam_id"] = layer["foam_id"]
        row[f"layer_{layer['layer']}_thickness_mm"] = layer["thickness_mm"]
    row.update({key: value for key, value in metrics.items() if key != "components"})
    row["glove_work_share_percent"] = sum(c["work_share_percent"] for c in metrics["components"] if c["role"] == "glove")
    row["glove_layers_beyond_reference_fit"] = sum(c["beyond_reference_fit"] for c in metrics["components"] if c["role"] == "glove")
    row.update(checks)
    row["raw_file"] = raw_file
    return row


def load_rows(path):
    with path.open(newline="", encoding="utf-8") as source:
        rows = list(csv.DictReader(source))
    for row in rows:
        for key in ("thickness_mm", "energy_j", *(item[0] for item in METRICS)):
            row[key] = float(row[key]) if row[key] else None
    return rows


def grid(rows, style, key):
    indexed = {(row["thickness_mm"], row["energy_j"]): row[key]
               for row in rows if row["recipe"] == style}
    return np.array([[np.nan if indexed[(thickness, energy)] is None else indexed[(thickness, energy)]
                      for thickness in THICKNESSES] for energy in ENERGIES])


def format_axis(ax):
    ax.set_facecolor(PAPER)
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color(LINE)
    ax.tick_params(length=0, pad=8)


def make_figures(rows, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    with plt.rc_context({"font.family": "monospace", "font.size": 10,
                         "text.color": INK, "axes.labelcolor": MUTED,
                         "xtick.color": MUTED, "ytick.color": MUTED,
                         "axes.titlecolor": INK, "savefig.facecolor": PAPER}):
        for key, label, scale in METRICS:
            arrays = [grid(rows, style, key) * scale for style, _ in RECIPES]
            lower = min(float(np.nanmin(data)) for data in arrays)
            upper = max(float(np.nanmax(data)) for data in arrays)
            fig, axes = plt.subplots(1, 2, figsize=(15, 6.2), facecolor=PAPER, sharey=True)
            fig.suptitle(label, x=0.07, y=0.96, ha="left", fontsize=22)
            for ax, (style, _), values in zip(axes, RECIPES, arrays):
                mesh = ax.imshow(values, origin="lower", aspect="auto", cmap="magma",
                                 vmin=lower, vmax=upper, extent=(22.5, 62.5, 55, 125))
                ax.set_title(f"{style.capitalize()} recipe", loc="left", pad=15)
                ax.set_xticks(THICKNESSES)
                ax.set_yticks(ENERGIES)
                ax.set_xlabel("Total glove thickness (mm)", labelpad=12)
                format_axis(ax)
                for j, energy in enumerate(ENERGIES):
                    for i, thickness in enumerate(THICKNESSES):
                        value = values[j, i]
                        shade = (value - lower) / (upper - lower) if upper > lower else 0
                        decimals = 3 if key == "force_at_5ms_n" else 1 if scale == 1 else 2
                        text = "n/a" if not np.isfinite(value) else f"{value:.{decimals}f}"
                        ax.text(thickness, energy, text, ha="center", va="center", fontsize=9,
                                color=PAPER if shade > 0.65 else INK)
                if key == "force_at_5ms_n":
                    ax.contour(THICKNESSES, ENERGIES, values,
                               levels=[SOFT_FORCE_LIMIT_N / 1000, POPPY_FORCE_MIN_N / 1000],
                               colors=["#67d4e8", "#ffffff"], linewidths=2)
            axes[0].set_ylabel("Punch energy (J)", labelpad=12)
            bottom = 0.23 if key == "force_at_5ms_n" else 0.17
            fig.subplots_adjust(left=0.07, right=0.91, bottom=bottom, top=0.79, wspace=0.10)
            color_axis = fig.add_axes([0.93, bottom, 0.015, 0.79 - bottom])
            fig.colorbar(mesh, cax=color_axis)
            if key == "force_at_5ms_n":
                fig.text(0.07, 0.09, "Soft < 0.50 kN     Neutral 0.50 to < 0.70 kN     Responsive >= 0.70 kN", color=MUTED)
                handles = [
                    Line2D([], [], color="#67d4e8", linewidth=2,
                           label=f"Soft / neutral boundary: {SOFT_FORCE_LIMIT_N / 1000:.2f} kN"),
                    Line2D([], [], color="#ffffff", linewidth=2,
                           label=f"Neutral / responsive boundary: {POPPY_FORCE_MIN_N / 1000:.2f} kN"),
                ]
                fig.legend(handles=handles, loc="lower left", bbox_to_anchor=(0.06, 0.015),
                           ncol=2, frameon=False, labelcolor=INK)
            path = output_dir / f"figure6-{key}.png"
            fig.savefig(path, dpi=160)
            plt.close(fig)
            print(path, flush=True)

        # Slice plots expose curvature; heatmaps above retain the full grid.
        for x_key, slices, fixed_key, xlabel, slug in (
            ("thickness_mm", (60, 90, 120), "energy_j", "Total glove thickness (mm)", "thickness-response"),
            ("energy_j", (25, 50, 60), "thickness_mm", "Punch energy (J)", "energy-response"),
        ):
            fig, axes = plt.subplots(2, 3, figsize=(16, 10), facecolor=PAPER,
                                     sharex=True, sharey="col")
            # Lighten the frontier purple so thin lines remain visible on charcoal.
            colors = ("#a46be1", QUINTILE_COLORS[2], QUINTILE_COLORS[4])
            for row_axes, (style, _), marker in zip(axes, RECIPES, ("o", "D")):
                for ax, (key, label, scale) in zip(row_axes, METRICS):
                    for fixed, color in zip(slices, colors):
                        selected = sorted((r for r in rows if r["recipe"] == style and r[fixed_key] == fixed), key=lambda r: r[x_key])
                        y = [r[key] * scale if r[key] is not None else np.nan for r in selected]
                        ax.plot([r[x_key] for r in selected], y, color=color, linestyle="-",
                                linewidth=1.8, marker=marker, markersize=6,
                                markeredgecolor=PAPER, markeredgewidth=0.7)
                    format_axis(ax)
                    ax.tick_params(labelleft=True)
                    ax.grid(axis="y", color=LINE, linewidth=0.6)
                    if style == "responsive":
                        ax.set_xlabel(xlabel, labelpad=12)
                    ax.set_title(label, loc="left", pad=15)
                    if key == "force_at_5ms_n":
                        for boundary in (0.5, 0.7):
                            ax.axhline(boundary, color=MUTED, linewidth=0.8, linestyle=":")
            units = "J" if fixed_key == "energy_j" else "mm"
            handles = [Line2D([], [], color=color, label=f"{value} {units}", linewidth=2)
                       for value, color in zip(slices, colors)]
            fig.legend(handles=handles, loc="lower center", bbox_to_anchor=(0.5, 0.025),
                       ncol=3, frameon=False, labelcolor=INK)
            fig.suptitle("Thickness sensitivity" if x_key == "thickness_mm" else "Punch-energy sensitivity",
                         x=0.07, y=0.96, ha="left", fontsize=22)
            fig.subplots_adjust(left=0.07, right=0.97, top=0.81, bottom=0.14,
                                wspace=0.22, hspace=0.50)
            for row_axes, (style, _) in zip(axes, RECIPES):
                position = row_axes[0].get_position()
                fig.text(position.x0, position.y1 + 0.065, f"{style.capitalize()} recipe",
                         fontsize=15, color=INK)
            path = output_dir / f"figure6-{slug}.png"
            fig.savefig(path, dpi=160)
            plt.close(fig)
            print(path, flush=True)


def finite_changes(rows):
    """Equal-step outcome changes: a linear relationship has constant changes."""
    changes = []
    for style, _ in RECIPES:
        for axis, fixed_key, fixed_values in (("thickness_mm", "energy_j", ENERGIES),
                                             ("energy_j", "thickness_mm", THICKNESSES)):
            for fixed in fixed_values:
                selected = sorted((r for r in rows if r["recipe"] == style and r[fixed_key] == fixed), key=lambda r: r[axis])
                for left, right in zip(selected, selected[1:]):
                    for key, _, _ in METRICS:
                        change = None if left[key] is None or right[key] is None else right[key] - left[key]
                        changes.append({"recipe": style, "varying_input": axis, "fixed_input": fixed_key,
                                        "fixed_value": fixed, "from": left[axis], "to": right[axis],
                                        "outcome": key, "change": change})
    return changes


def run_study(args):
    args.data_dir.mkdir(parents=True, exist_ok=True)
    raw = args.data_dir / "runs"
    raw.mkdir(exist_ok=True)
    assumptions = load_assumptions(args.assumptions)
    engine_hash, catalog_hash = digest(ROOT / "simulation.py"), digest(args.catalog)
    sources = {"engine": ROOT / "simulation.py", "catalog": args.catalog,
               "assumptions": args.assumptions, "analysis": Path(__file__),
               "plot_definitions": ROOT / "table3.py", "table1": ROOT / "table1.py"}
    recipes = {}
    for style, old_name in RECIPES:
        path = args.recipes_dir / f"table4-{old_name}-recipe.json"
        record = json.loads(path.read_text(encoding="utf-8"))
        if not math.isclose(sum(layer["thickness_mm"] for layer in record["request"]["layers"]), 50):
            raise ValueError(f"Expected a 50 mm baseline recipe: {style}")
        for source, actual in (("engine", engine_hash), ("catalog", catalog_hash),
                               ("assumptions", digest(args.assumptions))):
            if record["sources"][source]["sha256"] != actual:
                raise ValueError(f"{style} recipe {source} has changed since selection")
        recipes[style] = record
        sources[f"{style}_recipe"] = path
    first, second = (recipes[style]["request"] for style, _ in RECIPES)
    if any(first[key] != second[key] for key in ("mass_kg", "speed_m_s", "target")):
        raise ValueError("Recipe impact conditions differ")
    snapshots = args.data_dir / "inputs"
    snapshots.mkdir(exist_ok=True)
    for path in sources.values():
        destination = snapshots / path.name
        if destination.exists() and digest(destination) != digest(path) and path != Path(__file__):
            raise ValueError(f"Input snapshot changed: {destination}; use a new --data-dir")
        shutil.copyfile(path, destination)
    manifest = {"thicknesses_mm": THICKNESSES, "energies_j": ENERGIES, "grid_runs": 112,
                "thickness_rule": "Scale all four glove layers proportionally, without rounding",
                "energy_rule": "Change speed via sqrt(2E/m), preserving the baseline striking mass",
                "assumptions": assumptions,
                "response_bands_n": {"soft_upper_exclusive": SOFT_FORCE_LIMIT_N,
                                     "responsive_lower_inclusive": POPPY_FORCE_MIN_N},
                "sources": {name: {"path": str(path.resolve()), "sha256": digest(path),
                                   "snapshot": f"inputs/{path.name}"} for name, path in sources.items()},
                "baseline_requests": {style: r["request"] for style, r in recipes.items()}}
    write_json(args.data_dir / "manifest.json", manifest)
    baselines, rows, refinements = [], [], []
    for style, record in recipes.items():
        request = record["request"]
        result, checks = run_case(raw / f"{style}-baseline.json.gz", request, assumptions,
                                  args.catalog, engine_hash, catalog_hash)
        for key in CHECK_METRICS:
            expected, actual = record["simulation"]["metrics"][key], result["metrics"][key]
            if not math.isclose(expected, actual, rel_tol=1e-8, abs_tol=1e-9):
                raise ValueError(f"Baseline mismatch: {style} {key}")
        baselines.append({"recipe": style, "energy_j": result["punch"]["energy_j"], "matches_selected_recipe": True, **checks})
        for thickness in THICKNESSES:
            for energy in ENERGIES:
                request = scaled_request(record["request"], thickness, energy)
                filename = f"{style}-{thickness}mm-{energy}J.json.gz"
                result, checks = run_case(raw / filename, request, assumptions, args.catalog, engine_hash, catalog_hash)
                expected_weight = record["source_outcomes"]["foam_sample_weight_g"] * thickness / 50
                if not math.isclose(result["metrics"]["foam_sample_weight_g"], expected_weight, rel_tol=1e-10):
                    raise ValueError("Sample weight does not scale with thickness")
                rows.append(summary_row(style, thickness, energy, request, result, checks, f"runs/{filename}"))
                if thickness in (25, 60) and energy in (60, 120):
                    settings = copy.deepcopy(assumptions)
                    for key in ("curve_steps", "tail_steps", "trajectory_steps"):
                        settings["numerics"][key] *= 2
                    refined, _ = run_case(raw / filename.replace(".json.gz", "-refined.json.gz"), request,
                                          settings, args.catalog, engine_hash, catalog_hash)
                    for key in CHECK_METRICS:
                        standard, fine = result["metrics"][key], refined["metrics"][key]
                        difference = None if standard is None or fine is None else abs(standard - fine) / max(abs(fine), 1e-12)
                        if (standard is None) != (fine is None) or (difference is not None and difference > 0.002):
                            raise ValueError(f"Refinement exceeds 0.2%: {style} {thickness} mm {energy} J {key}")
                        refinements.append({"recipe": style, "thickness_mm": thickness, "energy_j": energy,
                                            "outcome": key, "standard": standard, "refined": fine,
                                            "relative_difference": difference})
            print(f"{style.capitalize()}: {thickness} mm complete ({len(rows)}/112 grid runs)", flush=True)
    expected = {(style, t, e) for style, _ in RECIPES for t in THICKNESSES for e in ENERGIES}
    if len(rows) != 112 or {(r["recipe"], r["thickness_mm"], r["energy_j"]) for r in rows} != expected:
        raise ValueError("Grid coverage mismatch")
    write_csv(args.data_dir / "results.csv", rows)
    write_csv(args.data_dir / "finite-changes.csv", finite_changes(rows))
    write_csv(args.data_dir / "refinement.csv", refinements)
    write_json(args.data_dir / "validation.json", {
        "grid_runs": len(rows), "baseline_checks": baselines, "refined_corner_runs": 8,
        "maximum_refinement_relative_difference": max(r["relative_difference"] or 0 for r in refinements),
        "maximum_trace_energy_residual_j": max(r["maximum_trace_energy_residual_j"] for r in rows),
        "maximum_relative_impulse_residual": max(r["relative_impulse_residual"] for r in rows),
        "missing_force_at_5ms": sum(r["force_at_5ms_n"] is None for r in rows),
        "minimum_time_to_peak_s": min(r["time_to_peak_s"] for r in rows),
    })
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--recipes-dir", type=Path, default=ROOT / "figures")
    parser.add_argument("--catalog", type=Path, default=ROOT / "data/analytical-foams2.csv")
    parser.add_argument("--assumptions", type=Path, default=ROOT / "assumptions.yaml")
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data/table6-sensitivity")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "figures")
    parser.add_argument("--plot-only", action="store_true")
    args = parser.parse_args()
    rows = load_rows(args.data_dir / "results.csv") if args.plot_only else run_study(args)
    make_figures(rows, args.output_dir)


if __name__ == "__main__":
    main()
