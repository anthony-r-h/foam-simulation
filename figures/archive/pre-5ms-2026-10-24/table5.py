"""Plot peak force against peak loading rate over 0.5 ms, colored by sample weight.

Include every stack with all three values, without a weight or status filter.
Impact conditions must be constant, as checked by Table 3's results loader.
Point order is shuffled with a fixed seed to avoid CSV ordering controlling
which weights appear on top. No points are sampled or aggregated.
"""

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import numpy as np

from table3 import INK, LINE, MUTED, PAPER, QUINTILE_COLORS, load_outcomes

ROOT = Path(__file__).resolve().parent


def plot_relationship(values, path):
    force = values["peak_force_n"] / 1000
    rate = values["peak_loading_rate_n_s"] / 1_000_000
    weight = values["foam_sample_weight_g"]
    available = np.isfinite(force) & np.isfinite(rate) & np.isfinite(weight)
    indices = np.flatnonzero(available)
    if not len(indices):
        raise ValueError("No available force, loading rate, and sample weight triples")
    np.random.default_rng(0).shuffle(indices)
    cmap = LinearSegmentedColormap.from_list("sample_weight", QUINTILE_COLORS)
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
        fig.suptitle("Peak force and response", fontsize=20, x=0.10, ha="left", y=0.95)
        points = ax.scatter(force[indices], rate[indices], c=weight[indices], cmap=cmap,
                            s=2, linewidths=0, rasterized=True, zorder=2)
        ax.set_xlabel("Peak force (kN)", labelpad=12)
        ax.set_ylabel("Peak loading rate over 0.5 ms (kN/ms)", labelpad=12)
        ax.grid(axis="y", color=LINE, linewidth=0.6)
        ax.set_axisbelow(True)
        ax.spines[["top", "right", "left"]].set_visible(False)
        ax.spines["bottom"].set_color("#636b6d")
        ax.tick_params(axis="both", which="both", length=0, pad=9)
        fig.subplots_adjust(left=0.10, right=0.86, bottom=0.19, top=0.83)
        color_axis = fig.add_axes([0.90, 0.19, 0.018, 0.64])
        colorbar = fig.colorbar(points, cax=color_axis)
        colorbar.set_label("Stack sample weight (g)", labelpad=12)
        colorbar.outline.set_visible(False)
        colorbar.ax.tick_params(length=0, pad=9)
        fig.savefig(path, dpi=160, facecolor=PAPER)
        plt.close(fig)
    print(f"{path}: {len(indices):,} stacks, {int((~available).sum()):,} missing", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=ROOT / "data/results_full_2026-10-23.csv")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "figures")
    args = parser.parse_args()
    values = load_outcomes(args.results)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    plot_relationship(values, args.output_dir / "figure5-peak-force-vs-peak-loading-rate.png")


if __name__ == "__main__":
    main()
