"""Plot the early-force distribution by layer-2 foam family.

All families share bins and axes across PU, HR, EVA, and Latex panels.
Bar heights are percentages of available values within each family. All rows
are included without a status filter; blank outcomes are counted separately.
"""

import argparse
from array import array
import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator, PercentFormatter
import numpy as np

from table1 import FAMILIES, load_catalog, number
from table3 import SOFT_FORCE_LIMIT_N, POPPY_FORCE_MIN_N

ROOT = Path(__file__).resolve().parent
OUTCOMES = (
    ("force_at_5ms_n", "Force at 5 ms", "force-at-5ms"),
)
# All families occupy layer 2, so use its color from frontend/app.js.
LAYER_COLOR = "#a5c7da"
PAPER = "#303638"
INK = "#e7e9e8"
MUTED = "#b4bab8"
LINE = "#4c5355"


def load_outcomes(results_path, catalog):
    values = {
        key: {family: array("d") for family in FAMILIES}
        for key, _, _ in OUTCOMES
    }
    row_counts = dict.fromkeys(FAMILIES, 0)
    with Path(results_path).open(newline="", encoding="utf-8-sig") as source:
        reader = csv.reader(source)
        header = next(reader, [])
        required = {"layer_2_foam_id", *(key for key, _, _ in OUTCOMES)}
        missing = required - set(header)
        if missing:
            raise ValueError(f"Missing results columns: {', '.join(sorted(missing))}")
        foam_index = header.index("layer_2_foam_id")
        outcome_indices = {key: header.index(key) for key, _, _ in OUTCOMES}
        for row_number, row in enumerate(reader, start=2):
            try:
                if len(row) != len(header):
                    raise ValueError("Malformed CSV row")
                family = catalog[row[foam_index]]["family"]
                row_counts[family] += 1
                for key, index in outcome_indices.items():
                    value = number(row[index])
                    if value is not None:
                        values[key][family].append(value / 1000)  # N to kN.
            except (KeyError, ValueError) as error:
                raise ValueError(f"Results row {row_number}: {error}") from error
    if not sum(row_counts.values()):
        raise ValueError("The results CSV has no data rows")
    return values, row_counts


def shared_histogram_axes(outcomes, bins):
    nonempty = [values for groups in outcomes.values() for values in groups.values() if values]
    if not nonempty:
        raise ValueError("No available early-force values")
    lower = min(0, min(min(values) for values in nonempty))
    upper = max(max(values) for values in nonempty)
    if lower == upper:
        upper = lower + 1
    x_ticks = MaxNLocator(nbins=5).tick_values(lower, upper)
    edges = np.linspace(x_ticks[0], x_ticks[-1], bins + 1)
    max_percent = max(
        float(np.histogram(values, bins=edges)[0].max()) * 100 / len(values)
        for values in nonempty
    )
    y_ticks = MaxNLocator(nbins=4, integer=True).tick_values(0, max(1, max_percent * 1.08))
    return edges, x_ticks, y_ticks


def plot_outcome(groups, row_counts, title, edges, x_ticks, y_ticks, output_path):
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
    fig, axes = plt.subplots(1, 4, figsize=(16, 5.2), sharex=True, sharey=True,
                             facecolor=PAPER)
    fig.suptitle(title, fontsize=20, fontweight="normal", x=0.065, ha="left", y=0.95)
    fig.text(0.065, 0.85, "Main impact layer", fontsize=11, color=MUTED)
    fig.text(0.97, 0.85,
             f"Soft < {SOFT_FORCE_LIMIT_N / 1000:.2f}    "
             f"Neutral {SOFT_FORCE_LIMIT_N / 1000:.2f} to < {POPPY_FORCE_MIN_N / 1000:.2f}    "
             f"Responsive >= {POPPY_FORCE_MIN_N / 1000:.2f} kN",
             fontsize=11, color=MUTED, ha="right")
    fig.add_artist(plt.Line2D([0.065, 0.97], [0.805, 0.805], transform=fig.transFigure,
                              color=LINE, linewidth=0.8))
    for ax, family in zip(axes.flat, FAMILIES):
        values = groups[family]
        counts, _ = np.histogram(values, bins=edges)
        if int(counts.sum()) != len(values):
            raise ValueError(f"Histogram count mismatch for {family}: {title}")
        percentages = counts * (100 / len(values)) if values else counts
        widths = np.diff(edges)
        ax.bar(edges[:-1] + widths * 0.03, percentages, width=widths * 0.94,
               align="edge", color=LAYER_COLOR, edgecolor="none")
        for boundary in (SOFT_FORCE_LIMIT_N, POPPY_FORCE_MIN_N):
            ax.axvline(boundary / 1000, color=MUTED, linestyle="--", linewidth=0.8)
        missing = row_counts[family] - len(values)
        ax.set_title(family, loc="left", fontsize=13, color=INK, pad=15)
        ax.text(1, 1.075, f"{len(values):,} stacks", transform=ax.transAxes,
                ha="right", va="baseline", color=MUTED, fontsize=9)
        if not values:
            ax.text(0.5, 0.5, "No available values", transform=ax.transAxes, ha="center")
        ax.set_xticks(x_ticks)
        ax.set_yticks(y_ticks)
        ax.set_xlim(edges[0], edges[-1])
        ax.set_ylim(y_ticks[0], y_ticks[-1])
        ax.yaxis.set_major_formatter(PercentFormatter(xmax=100, decimals=0))
        ax.grid(axis="y", color=LINE, linewidth=0.6)
        ax.set_axisbelow(True)
        ax.spines[["top", "right", "left"]].set_visible(False)
        ax.spines["bottom"].set_color("#636b6d")
        ax.spines["bottom"].set_linewidth(0.7)
        ax.tick_params(axis="both", which="both", length=0, pad=9)
        print(f"  {family}: {len(values):,} available, {missing:,} missing")
    fig.supxlabel("Force at 5 ms (kN)", fontsize=11, color=MUTED, y=0.07)
    fig.supylabel("Share of stacks", fontsize=10, color=MUTED, x=0.018)
    fig.subplots_adjust(left=0.065, right=0.97, bottom=0.2, top=0.68, wspace=0.18)
    fig.savefig(output_path, dpi=160, facecolor=PAPER)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=ROOT / "data/simulations_2026-10-24_5ms.csv")
    parser.add_argument("--catalog", type=Path, default=ROOT / "data/analytical-foams2.csv")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "figures")
    parser.add_argument("--bins", type=int, default=40)
    args = parser.parse_args()
    if args.bins < 1:
        parser.error("--bins must be positive")
    values, row_counts = load_outcomes(args.results, load_catalog(args.catalog))
    edges, x_ticks, y_ticks = shared_histogram_axes(values, args.bins)
    print(f"Shared axes: {edges[0]:g}–{edges[-1]:g} kN, {y_ticks[0]:g}–{y_ticks[-1]:g}%")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for key, title, _ in OUTCOMES:
        path = args.output_dir / f"figure2-{key}.png"
        print(path)
        plot_outcome(values[key], row_counts, title, edges, x_ticks, y_ticks, path)


if __name__ == "__main__":
    main()
