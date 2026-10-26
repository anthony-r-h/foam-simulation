"""Plot protection against early response for Analysis Section 5.

The figure includes every complete stack with peak force, force at 5 ms, and
sample weight. Color represents six sample-weight ranges. Point order is
shuffled with a fixed seed so CSV order does not determine which ranges remain
visible. The selected soft and responsive recipes are marked for reference. No
points are sampled.
"""

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import Patch
import numpy as np

from analysis.analysis3 import INK, LINE, MUTED, PAPER, load_outcomes, load_recipes
from analysis.common import (
    FIGURES_PATH,
    RESULTS_PATH,
    WEIGHT_BAND_COLORS,
    add_figure_heading,
)


WEIGHT_BAND_EDGES_G = np.array([1.5, 2.0, 2.5, 3.0, 5.0])
WEIGHT_BAND_LABELS = (
    "< 1.5 g",
    "1.5-2.0 g",
    "2.0-2.5 g",
    "2.5-3.0 g",
    "3.0-5.0 g",
    "5.0+ g",
)


def plot_relationship(values, path, recipes):
    peak_force = values["peak_force_n"] / 1000
    early_force = values["force_at_5ms_n"] / 1000
    sample_weight = values["foam_sample_weight_g"]
    available = (
        np.isfinite(peak_force)
        & np.isfinite(early_force)
        & np.isfinite(sample_weight)
    )
    indices = np.flatnonzero(available)
    if not len(indices):
        raise ValueError("No available force, early force, and sample weight triples")
    np.random.default_rng(0).shuffle(indices)
    weight_bands = np.digitize(sample_weight, WEIGHT_BAND_EDGES_G)
    point_colors = np.asarray(WEIGHT_BAND_COLORS)[weight_bands[indices]]
    with plt.rc_context({
        "font.family": "monospace",
        "font.monospace": ["SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", "DejaVu Sans Mono"],
        "font.size": 10,
        "text.color": INK,
        "axes.facecolor": PAPER,
        "axes.labelcolor": MUTED,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
    }):
        fig, ax = plt.subplots(figsize=(12, 7.5), facecolor=PAPER)
        add_figure_heading(
            fig,
            "Protection and early response",
            "All complete 50 mm stacks colored by sample weight, with selected recipes marked",
        )
        ax.scatter(
            early_force[indices],
            peak_force[indices],
            c=point_colors,
            s=2,
            linewidths=0,
            rasterized=True,
            zorder=2,
        )
        for index, recipe in enumerate(recipes):
            x = recipe["outcomes"]["force_at_5ms_n"] / 1000
            y = recipe["outcomes"]["peak_force_n"] / 1000
            ax.scatter(
                [x],
                [y],
                marker=recipe["marker"],
                s=85,
                facecolor=recipe["color"],
                edgecolor=PAPER,
                linewidth=1.5,
                zorder=6,
            )
            ax.annotate(
                recipe["label"],
                (x, y),
                xytext=(-35 if index == 0 else 35, 45),
                textcoords="offset points",
                ha="right" if index == 0 else "left",
                color=PAPER,
                bbox={
                    "boxstyle": "round,pad=0.3",
                    "facecolor": recipe["color"],
                    "edgecolor": "none",
                },
                arrowprops={"arrowstyle": "-", "color": recipe["color"]},
                zorder=7,
            )
        ax.set_xlabel("Force at 5 ms (kN)", labelpad=12)
        ax.set_ylabel("Peak force (kN)", labelpad=12)
        ax.grid(axis="y", color=LINE, linewidth=0.6)
        ax.set_axisbelow(True)
        ax.spines[["top", "right", "left"]].set_visible(False)
        ax.spines["bottom"].set_color("#636b6d")
        ax.tick_params(axis="both", which="both", length=0, pad=9)
        handles = [
            Patch(facecolor=color, label=label)
            for color, label in zip(WEIGHT_BAND_COLORS, WEIGHT_BAND_LABELS)
        ]
        fig.legend(
            handles=handles,
            loc="lower center",
            bbox_to_anchor=(0.53, 0.025),
            ncol=6,
            frameon=False,
            labelcolor=INK,
            fontsize=10,
        )
        fig.subplots_adjust(left=0.10, right=0.97, bottom=0.19, top=0.81)
        fig.savefig(path, dpi=160, facecolor=PAPER)
        plt.close(fig)
    print(f"{path}: {len(indices):,} stacks, {int((~available).sum()):,} missing", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=RESULTS_PATH)
    parser.add_argument("--output-dir", type=Path, default=FIGURES_PATH)
    args = parser.parse_args()
    recipes = load_recipes(args.output_dir)
    values = load_outcomes(args.results, recipes)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    plot_relationship(
        values,
        args.output_dir / "figure5-peak-force-vs-force-at-5ms.png",
        recipes,
    )


if __name__ == "__main__":
    main()
