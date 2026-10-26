"""Generate the sample-weight figures used in Analysis Section 4.

Each figure shows the range of complete-stack outcomes available within 0.5 g
weight bands. Quintiles describe that range; the frontier follows the lowest
outcome in each band. Recipe markers come from the Analysis 4 recipe files.
"""

import argparse
import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
import numpy as np
import pandas as pd

from analysis.common import (
    FIGURES_PATH,
    RANK_COLORS,
    REFERENCE_RECIPE_COLORS,
    REFERENCE_RECIPE_MARKER,
    RESPONSIVE_FORCE_MIN_N,
    RESULTS_PATH,
    SOFT_FORCE_LIMIT_N,
    add_figure_heading,
)

BUCKET_WIDTH_G = 0.5
CONDITIONS = ("mass_kg", "speed_m_s", "target_foam_id", "target_thickness_mm")
# The final field is retained until Analysis 4 is migrated.
OUTCOMES = (
    ("peak_force_n", "Peak force by sample weight", "Peak force (kN)", 0.001, "lower"),
    ("maximum_glove_compression_percent", "Compression by sample weight",
     "Glove compression (%)", 1, "lower"),
    ("force_at_5ms_n", "Early response by sample weight", "Force at 5 ms (kN)", 0.001, "lower"),
)
STYLE_LABELS = {"pillowy": "Soft", "poppy": "Responsive"}

# Compatibility names retained until the later analysis scripts are migrated.
POPPY_FORCE_MIN_N = RESPONSIVE_FORCE_MIN_N
QUINTILE_COLORS = RANK_COLORS

PAPER = "#303638"
INK = "#e7e9e8"
MUTED = "#b4bab8"
LINE = "#4c5355"
FRONTIER_COLOR = "#5ba6ff"


def load_recipes(directory):
    """Load the two selected recipes used as markers on the figures."""
    recipes = []
    for style in ("pillowy", "poppy"):
        path = Path(directory) / f"table4-{style}-recipe.json"
        if not path.is_file():
            raise ValueError(
                f"Missing {path}; run python3 -m analysis.analysis4 or use --without-recipes"
            )
        record = json.loads(path.read_text(encoding="utf-8"))
        if record["style"] != style:
            raise ValueError(f"Recipe style does not match {path}")
        layers = record["request"]["layers"]
        if [layer["layer"] for layer in layers] != [1, 2, 3, 4]:
            raise ValueError(f"Expected four ordered glove layers in {path}")
        label = STYLE_LABELS[style]
        recipes.append({
            "label": label,
            "marker": REFERENCE_RECIPE_MARKER,
            "color": REFERENCE_RECIPE_COLORS[label],
            "record": record,
            "layers": tuple((layer["foam_id"], float(layer["thickness_mm"]))
                            for layer in layers),
        })
    return recipes


def load_outcomes(results_path=RESULTS_PATH, recipes=()):
    """Load outcomes and verify optional recipe markers against the results."""
    metrics = ("foam_sample_weight_g", *(item[0] for item in OUTCOMES))
    layer_ids = tuple(f"layer_{layer}_foam_id" for layer in range(1, 5))
    layer_thicknesses = tuple(f"layer_{layer}_thickness_mm" for layer in range(1, 5))
    required = {*metrics, *CONDITIONS}
    if recipes:
        required.update((*layer_ids, *layer_thicknesses))

    text_columns = {"target_foam_id": "string"}
    text_columns.update({column: "string" for column in layer_ids if recipes})
    results = pd.read_csv(results_path, usecols=lambda column: column in required,
                          dtype=text_columns)
    missing = required - set(results)
    if missing:
        raise ValueError("Missing results columns: " + ", ".join(sorted(missing)))
    if results.empty:
        raise ValueError("The results CSV has no data rows")

    numeric = list(required - set(text_columns))
    results[numeric] = results[numeric].apply(pd.to_numeric, errors="raise")
    if np.isinf(results[numeric].to_numpy()).any():
        raise ValueError("Results contain infinite numeric values")
    if (results["foam_sample_weight_g"].dropna() <= 0).any():
        raise ValueError("Sample weight must be positive")
    if any(results[key].isna().any() or results[key].nunique(dropna=False) != 1
           for key in CONDITIONS):
        raise ValueError("Impact conditions differ or are missing")
    conditions = {key: results[key].iloc[0] for key in CONDITIONS}

    if recipes:
        if results[list(layer_ids)].isna().any().any():
            raise ValueError("A recipe layer is missing a foam ID")
        if (results[list(layer_thicknesses)].isna().any().any()
                or (results[list(layer_thicknesses)] <= 0).any().any()):
            raise ValueError("Recipe layer thicknesses must be positive")

        for recipe in recipes:
            request = recipe["record"]["request"]
            expected_conditions = {
                "mass_kg": request["mass_kg"], "speed_m_s": request["speed_m_s"],
                "target_foam_id": request["target"]["foam_id"],
                "target_thickness_mm": request["target"]["thickness_mm"],
            }
            for key, expected in expected_conditions.items():
                actual = conditions[key]
                same = (actual == expected if key == "target_foam_id" else
                        math.isclose(float(actual), float(expected),
                                     rel_tol=1e-8, abs_tol=1e-9))
                if not same:
                    raise ValueError(f"{recipe['label']} recipe conditions changed; "
                                     "rerun Analysis 4")

            matches = np.ones(len(results), dtype=bool)
            for layer, (foam_id, thickness) in enumerate(recipe["layers"], start=1):
                matches &= results[f"layer_{layer}_foam_id"].eq(foam_id).to_numpy()
                matches &= np.isclose(results[f"layer_{layer}_thickness_mm"], thickness,
                                      rtol=1e-8, atol=1e-9)
            if not matches.any():
                raise ValueError(f"{recipe['label']} recipe is absent; rerun Analysis 4")

            row = results.loc[matches, list(metrics)].iloc[0]
            recipe["outcomes"] = {key: float(row[key]) for key in metrics}
            for key, actual in recipe["outcomes"].items():
                expected = recipe["record"]["source_outcomes"][key]
                if not math.isclose(actual, expected, rel_tol=1e-8, abs_tol=1e-9):
                    raise ValueError(f"{recipe['label']} recipe {key} changed; "
                                     "rerun Analysis 4")

    return {key: results[key].to_numpy(dtype=float) for key in metrics}


def weight_edges(weights, width=BUCKET_WIDTH_G):
    available = weights[np.isfinite(weights)]
    if not len(available):
        raise ValueError("No available sample weights")
    first = math.floor(float(available.min()) / width)
    last = math.floor(float(available.max()) / width) + 1
    return np.arange(first, last + 1) * width


def bucket_quantiles(weights, outcomes, edges):
    """Return the minimum, quintile boundaries, and maximum in each band."""
    buckets = np.searchsorted(edges, weights, side="right") - 1
    if np.any((buckets < 0) | (buckets >= len(edges) - 1)):
        raise ValueError("A sample weight falls outside the bucket edges")
    order = np.argsort(buckets, kind="stable")
    counts = np.bincount(buckets, minlength=len(edges) - 1)
    cuts = np.concatenate(([0], np.cumsum(counts)))
    quantiles = np.full((len(edges) - 1, 6), np.nan)
    for bucket, count in enumerate(counts):
        if count:
            selected = outcomes[order[cuts[bucket]:cuts[bucket + 1]]]
            quantiles[bucket] = np.quantile(selected, np.linspace(0, 1, 6),
                                            method="linear")
    return quantiles


def plot_outcome(weights, outcomes, edges, title, ylabel, path, recipes=(),
                 outcome_key=None, scale=1):
    """Plot one outcome distribution and its lower frontier by weight band."""
    available = np.isfinite(weights) & np.isfinite(outcomes)
    weights, outcomes = weights[available], outcomes[available]
    if not len(weights):
        raise ValueError(f"No available weight/outcome pairs for {title}")
    quantiles = bucket_quantiles(weights, outcomes, edges)
    frontier = quantiles[:, 0]

    plt.rcParams.update({
        "font.family": "monospace",
        "font.monospace": ["SFMono-Regular", "Consolas", "Liberation Mono",
                            "Menlo", "DejaVu Sans Mono"],
        "font.size": 10, "text.color": INK, "axes.facecolor": PAPER,
        "axes.labelcolor": MUTED, "xtick.color": MUTED, "ytick.color": MUTED,
    })
    fig, axis = plt.subplots(figsize=(12, 7.5), facecolor=PAPER)
    add_figure_heading(
        fig,
        title,
        "Outcome quintiles and the lowest observed value within each 0.5 g band",
    )

    # Lower values occupy the gold end of the shared rank palette.
    for band in range(5):
        lower = np.append(quantiles[:, band], quantiles[-1, band])
        upper = np.append(quantiles[:, band + 1], quantiles[-1, band + 1])
        axis.fill_between(edges, lower, upper, step="post",
                          color=QUINTILE_COLORS[4 - band], linewidth=0, zorder=2)
    axis.step(edges, np.append(frontier, frontier[-1]), where="post",
              color=FRONTIER_COLOR, linewidth=4, zorder=4)

    for index, recipe in enumerate(recipes):
        x = recipe["outcomes"]["foam_sample_weight_g"]
        y = recipe["outcomes"][outcome_key] * scale
        axis.scatter([x], [y], marker=recipe["marker"], s=85,
                     facecolor=recipe["color"], edgecolor=PAPER,
                     linewidth=1.5, zorder=6)
        axis.annotate(recipe["label"], xy=(x, y),
                      xytext=(30, 55) if index == 0 else (90, 20),
                      textcoords="offset points", color=PAPER, fontsize=10,
                      bbox={"boxstyle": "round,pad=0.3", "facecolor": recipe["color"],
                            "edgecolor": "none"},
                      arrowprops={"arrowstyle": "-", "color": recipe["color"],
                                  "linewidth": 1}, zorder=7)

    axis.set(xlim=(edges[0], edges[-1]), xlabel="Stack sample weight (g)",
             ylabel=ylabel)
    axis.xaxis.labelpad = axis.yaxis.labelpad = 12
    axis.grid(axis="y", color=LINE, linewidth=0.6)
    axis.set_axisbelow(True)
    axis.spines[["top", "right", "left"]].set_visible(False)
    axis.spines["bottom"].set_color("#636b6d")
    axis.tick_params(axis="both", which="both", length=0, pad=9)

    labels = (("Q1 firmer", "Q2", "Q3", "Q4", "Q5 softer")
              if outcome_key == "force_at_5ms_n"
              else ("Q1 worst", "Q2", "Q3", "Q4", "Q5 best"))
    handles = [Patch(facecolor=color, label=label)
               for color, label in zip(QUINTILE_COLORS, labels)]
    handles.append(Line2D([0], [0], color=FRONTIER_COLOR, linewidth=4,
                          label="Frontier"))
    fig.legend(handles=handles, loc="lower center", bbox_to_anchor=(0.53, 0.025),
               ncol=6, frameon=False, labelcolor=INK, fontsize=10)
    fig.subplots_adjust(left=0.10, right=0.97, bottom=0.19, top=0.82)
    fig.savefig(path, dpi=160, facecolor=PAPER)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=RESULTS_PATH)
    parser.add_argument("--output-dir", type=Path, default=FIGURES_PATH)
    parser.add_argument("--bucket-width", type=float, default=BUCKET_WIDTH_G)
    parser.add_argument("--recipes-dir", type=Path,
                        help="Analysis 4 recipe directory; defaults to --output-dir")
    parser.add_argument("--without-recipes", action="store_true",
                        help="Plot without selected-recipe markers")
    args = parser.parse_args()
    if not math.isfinite(args.bucket_width) or args.bucket_width <= 0:
        parser.error("--bucket-width must be a positive finite number")

    recipes = [] if args.without_recipes else load_recipes(
        args.recipes_dir or args.output_dir)
    values = load_outcomes(args.results, recipes)
    weights = values["foam_sample_weight_g"]
    edges = weight_edges(weights, args.bucket_width)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for key, title, ylabel, scale, _ in OUTCOMES:
        plot_outcome(weights, values[key] * scale, edges, title, ylabel,
                     args.output_dir / f"figure3-{key}.png", recipes, key, scale)


if __name__ == "__main__":
    main()
