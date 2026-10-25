"""Plot three outcomes against sample weight, with frontiers and quintile bands.

Buckets are 0.5 g wide, anchored at zero, and include their left edge only.
Quintile boundaries use linear interpolation within each bucket. Q5 contains
lower outcomes: better protection/reserve, or softer early response.
Frontiers follow the lower edge within each weight bucket.
All available outcome/weight pairs are included, without a status filter.
Missing pairs are counted separately. Impact conditions must be constant.

Recipe markers read table4-pillowy-recipe.json and table4-poppy-recipe.json
from --recipes-dir (the output directory by default). Run table4.py first,
then table3.py with the same --results file to refresh selections and frontiers.
Saved recipes must match the current results' layers, impact conditions, and
outcomes. Use --without-recipes to generate frontiers before selecting recipes.
"""

import argparse
from array import array
import csv
import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
import numpy as np

from table1 import number

ROOT = Path(__file__).resolve().parent
# CSV column, title, axis label, display conversion, frontier direction.
OUTCOMES = (
    ("peak_force_n", "Peak force", "Peak force (kN)", 0.001, "lower"),
    ("maximum_glove_compression_percent", "Maximum glove compression", "Glove compression (%)", 1, "lower"),
    ("force_at_5ms_n", "Force at 5 ms", "Force at 5 ms (kN)", 0.001, "lower"),
)
STYLE_LABELS = {"pillowy": "Soft", "poppy": "Responsive"}
SOFT_FORCE_LIMIT_N = 500
POPPY_FORCE_MIN_N = 700
CONDITIONS = ("mass_kg", "speed_m_s", "target_foam_id", "target_thickness_mm")
PAPER = "#303638"
INK = "#e7e9e8"
MUTED = "#b4bab8"
LINE = "#4c5355"
QUINTILE_COLORS = ("#3b0f70", "#7c1d6f", "#bc3754", "#ed6925", "#fbb61a")
FRONTIER_COLOR = "#5ba6ff"


def load_recipes(directory):
    recipes = []
    for style, label, marker, color in (
        ("pillowy", STYLE_LABELS["pillowy"], "o", "#67d4e8"),
        ("poppy", STYLE_LABELS["poppy"], "D", "#ffffff"),
    ):
        path = directory / f"table4-{style}-recipe.json"
        if not path.is_file():
            raise ValueError(f"Missing {path}; run table4.py first or use --without-recipes")
        record = json.loads(path.read_text(encoding="utf-8"))
        if record["style"] != style:
            raise ValueError(f"Recipe style does not match {path}")
        layers = record["request"]["layers"]
        if [layer["layer"] for layer in layers] != [1, 2, 3, 4]:
            raise ValueError(f"Expected four ordered glove layers in {path}")
        recipes.append({"label": label, "marker": marker, "color": color,
                        "record": record,
                        "layers": tuple((layer["foam_id"], float(layer["thickness_mm"]))
                                        for layer in layers)})
    return recipes


def load_outcomes(results_path, recipes=()):
    columns = ("foam_sample_weight_g", *(item[0] for item in OUTCOMES))
    values = {key: array("d") for key in columns}
    conditions = None
    with Path(results_path).open(newline="", encoding="utf-8-sig") as source:
        reader = csv.reader(source)
        header = next(reader, [])
        layer_columns = tuple(key for layer in range(1, 5)
                              for key in (f"layer_{layer}_foam_id", f"layer_{layer}_thickness_mm"))
        required = set((*columns, *CONDITIONS, *(layer_columns if recipes else ())))
        missing = required - set(header)
        if missing:
            raise ValueError(f"Missing results columns: {', '.join(sorted(missing))}")
        indices = {key: header.index(key) for key in columns}
        condition_indices = [header.index(key) for key in CONDITIONS]
        layer_indices = [header.index(key) for key in layer_columns] if recipes else []
        recipe_by_layers = {}
        for recipe in recipes:
            recipe_by_layers.setdefault(recipe["layers"], []).append(recipe)
        matched = set()
        for row_number, row in enumerate(reader, start=2):
            try:
                if len(row) != len(header):
                    raise ValueError("Malformed CSV row")
                current = tuple(row[index] for index in condition_indices)
                if conditions is None:
                    conditions = current
                elif current != conditions:
                    raise ValueError("Impact conditions differ; compare one condition at a time")
                for key, index in indices.items():
                    value = number(row[index])
                    if key == "foam_sample_weight_g" and value is not None and value <= 0:
                        raise ValueError("Sample weight must be positive")
                    values[key].append(math.nan if value is None else value)
                if recipes:
                    layers = tuple((row[layer_indices[i]], float(row[layer_indices[i + 1]]))
                                   for i in range(0, 8, 2))
                    for recipe in recipe_by_layers.get(layers, []):
                        request = recipe["record"]["request"]
                        expected_conditions = (request["mass_kg"], request["speed_m_s"],
                                               request["target"]["foam_id"],
                                               request["target"]["thickness_mm"])
                        for key, actual, expected in zip(CONDITIONS, current, expected_conditions):
                            same = (actual == expected if key == "target_foam_id" else
                                    math.isclose(float(actual), float(expected), rel_tol=1e-8, abs_tol=1e-9))
                            if not same:
                                raise ValueError(f"{recipe['label']} recipe impact conditions changed; rerun table4.py")
                        outcomes = {key: values[key][-1] for key in columns}
                        for key, actual in outcomes.items():
                            expected = recipe["record"]["source_outcomes"][key]
                            if not math.isclose(actual, expected, rel_tol=1e-8, abs_tol=1e-9):
                                raise ValueError(f"{recipe['label']} recipe {key} changed; rerun table4.py")
                        recipe["outcomes"] = outcomes
                        matched.add(layers)
            except ValueError as error:
                raise ValueError(f"Results row {row_number}: {error}") from error
    if not values["foam_sample_weight_g"]:
        raise ValueError("The results CSV has no data rows")
    for recipe in recipes:
        if recipe["layers"] not in matched:
            raise ValueError(f"{recipe['label']} recipe is absent from these results; rerun table4.py")
    return {key: np.asarray(value) for key, value in values.items()}


def weight_edges(weights, width):
    available = weights[np.isfinite(weights)]
    if not len(available):
        raise ValueError("No available sample weights")
    first = math.floor(float(available.min()) / width)
    last = math.floor(float(available.max()) / width) + 1
    return np.arange(first, last + 1) * width


def bucket_quantiles(weights, outcomes, edges):
    """Return min, four quintile boundaries, and max; leave empty buckets blank."""
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
            quantiles[bucket] = np.quantile(selected, np.linspace(0, 1, 6), method="linear")
    return quantiles


def plot_outcome(weights, outcomes, edges, title, ylabel, direction, path, recipes=(),
                 outcome_key=None, scale=1):
    available = np.isfinite(weights) & np.isfinite(outcomes)
    missing = int((~available).sum())
    weights, outcomes = weights[available], outcomes[available]
    if not len(weights):
        raise ValueError(f"No available weight/outcome pairs for {title}")
    quantiles = bucket_quantiles(weights, outcomes, edges)
    frontier_outcomes = quantiles[:, 0 if direction == "lower" else -1]
    plt.rcParams.update({
        "font.family": "monospace",
        "font.monospace": ["SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", "DejaVu Sans Mono"],
        "font.size": 10,
        "text.color": INK,
        "axes.facecolor": PAPER,
        "axes.labelcolor": MUTED,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
    })
    fig, ax = plt.subplots(figsize=(12, 7.5), facecolor=PAPER)
    fig.suptitle(title, fontsize=20, x=0.10, ha="left", y=0.95)
    fig.text(0.10, 0.885, f"{edges[1] - edges[0]:g} g weight buckets", color=MUTED)
    direction_label = "Lower is softer" if outcome_key == "force_at_5ms_n" else f"{direction.capitalize()} is better"
    fig.text(0.97, 0.885, direction_label, ha="right", color=MUTED)
    for band in range(5):
        rank = 4 - band if direction == "lower" else band
        lower = np.append(quantiles[:, band], quantiles[-1, band])
        upper = np.append(quantiles[:, band + 1], quantiles[-1, band + 1])
        ax.fill_between(edges, lower, upper, step="post", color=QUINTILE_COLORS[rank], linewidth=0, zorder=2)
    ax.step(edges,
            np.append(frontier_outcomes, frontier_outcomes[-1]),
            where="post", color=FRONTIER_COLOR, linewidth=4, zorder=4)
    for index, recipe in enumerate(recipes):
        x = recipe["outcomes"]["foam_sample_weight_g"]
        y = recipe["outcomes"][outcome_key] * scale
        ax.scatter([x], [y], marker=recipe["marker"], s=85,
                   facecolor=recipe["color"], edgecolor=PAPER, linewidth=1.5, zorder=6)
        ax.annotate(recipe["label"], xy=(x, y), xytext=(30, 55) if index == 0 else (90, 20),
                    textcoords="offset points", color=recipe["color"], fontsize=10,
                    bbox={"boxstyle": "round,pad=0.3", "facecolor": PAPER, "edgecolor": "none"},
                    arrowprops={"arrowstyle": "-", "color": recipe["color"], "linewidth": 1},
                    zorder=7)
    ax.set_xlim(edges[0], edges[-1])
    ax.set_xlabel("Stack sample weight (g)", labelpad=12)
    ax.set_ylabel(ylabel, labelpad=12)
    ax.grid(axis="y", color=LINE, linewidth=0.6)
    ax.set_axisbelow(True)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.spines["bottom"].set_color("#636b6d")
    ax.tick_params(axis="both", which="both", length=0, pad=9)
    labels = (("Q1 firmer", "Q2", "Q3", "Q4", "Q5 softer") if outcome_key == "force_at_5ms_n"
              else ("Q1 worst", "Q2", "Q3", "Q4", "Q5 best"))
    handles = [Patch(facecolor=color, label=label) for color, label in zip(QUINTILE_COLORS, labels)]
    handles.append(Line2D([0], [0], color=FRONTIER_COLOR, linewidth=4, label="Frontier"))
    fig.legend(handles=handles, loc="lower center", bbox_to_anchor=(0.53, 0.025),
               ncol=6, frameon=False, labelcolor=INK, fontsize=10)
    fig.subplots_adjust(left=0.10, right=0.97, bottom=0.19, top=0.83)
    fig.savefig(path, dpi=160, facecolor=PAPER)
    plt.close(fig)
    print(f"{path}: {len(weights):,} pairs, {missing:,} missing, {np.isfinite(frontier_outcomes).sum():,} frontier buckets", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=ROOT / "data/simulations_2026-10-24_5ms.csv")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "figures")
    parser.add_argument("--bucket-width", type=float, default=0.5)
    parser.add_argument("--recipes-dir", type=Path,
                        help="Directory containing Table 4 recipe JSON files; defaults to --output-dir")
    parser.add_argument("--without-recipes", action="store_true",
                        help="Plot frontiers without recipe markers")
    args = parser.parse_args()
    if not math.isfinite(args.bucket_width) or args.bucket_width <= 0:
        parser.error("--bucket-width must be a positive finite number")
    recipes = [] if args.without_recipes else load_recipes(args.recipes_dir or args.output_dir)
    values = load_outcomes(args.results, recipes)
    weights = values["foam_sample_weight_g"]
    edges = weight_edges(weights, args.bucket_width)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for key, title, ylabel, scale, direction in OUTCOMES:
        plot_outcome(weights, values[key] * scale, edges, title, ylabel, direction,
                     args.output_dir / f"figure3-{key}.png", recipes, key, scale)


if __name__ == "__main__":
    main()
