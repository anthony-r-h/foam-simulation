"""Generate the responsiveness analysis used in Analysis Section 3.

The main-cushion family is fixed while compatible choices in the other layers
are integrated over. The resulting distributions show which core families can
produce soft, neutral, and responsive early-force behavior. Force at 5 ms
describes the start of the impact response; it is not a protection score.
"""

import math

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from matplotlib.ticker import MaxNLocator, PercentFormatter
import numpy as np
import pandas as pd

from analysis.common import (
    ANALYSIS_PATH,
    CATALOG_PATH,
    FIGURES_PATH,
    FAMILIES,
    RANK_COLORS,
    RESPONSIVE_FORCE_MIN_N,
    RESULTS_PATH,
    SOFT_FORCE_LIMIT_N,
    add_figure_heading,
    load_catalog,
    replace_markdown_block,
)


BINS = 40
OUTPUT_PATH = FIGURES_PATH / "figure2-force_at_5ms_n.png"
START_MARKER = "<!-- analysis2:start -->"
END_MARKER = "<!-- analysis2:end -->"

PAPER = "#303638"
INK = "#e7e9e8"
MUTED = "#b4bab8"
LINE = "#4c5355"


def load_results(results_path=RESULTS_PATH, catalog_path=CATALOG_PATH):
    """Load the main-cushion family and early force for every simulated stack."""
    catalog = load_catalog(catalog_path)
    results = pd.read_csv(
        results_path,
        usecols=["layer_2_foam_id", "force_at_5ms_n"],
        dtype={"layer_2_foam_id": "category"},
    )
    if results.empty:
        raise ValueError("The results CSV has no data rows")
    if results["layer_2_foam_id"].isna().any():
        raise ValueError("Missing foam ID in layer_2_foam_id")

    foam_ids = results["layer_2_foam_id"].astype("string")
    unknown = set(foam_ids.unique()) - set(catalog)
    if unknown:
        raise ValueError("Unknown foam IDs: " + ", ".join(sorted(unknown)))

    results["family"] = foam_ids.map(
        {foam_id: foam["family"] for foam_id, foam in catalog.items()}
    )
    results["family"] = pd.Categorical(
        results["family"], categories=FAMILIES, ordered=True
    )
    results["force_at_5ms_kn"] = (
        pd.to_numeric(results["force_at_5ms_n"], errors="raise") / 1000
    )
    available = results["force_at_5ms_kn"].dropna()
    if not available.map(math.isfinite).all():
        raise ValueError("Expected finite force-at-5-ms values")

    return results[["family", "force_at_5ms_kn"]]


def family_values(results):
    """Return one NumPy array per family in the fixed display order."""
    return {
        family: results.loc[
            results["family"] == family, "force_at_5ms_kn"
        ].dropna().to_numpy()
        for family in FAMILIES
    }


def shared_histogram_axes(groups, bins=BINS):
    """Use common bins and axes so family distributions can be compared."""
    nonempty = [values for values in groups.values() if len(values)]
    if not nonempty:
        raise ValueError("No available early-force values")

    lower = min(0, min(values.min() for values in nonempty))
    upper = max(values.max() for values in nonempty)
    if lower == upper:
        upper = lower + 1
    x_ticks = MaxNLocator(nbins=5).tick_values(lower, upper)
    edges = np.linspace(x_ticks[0], x_ticks[-1], bins + 1)
    max_percent = max(
        np.histogram(values, bins=edges)[0].max() * 100 / len(values)
        for values in nonempty
    )
    y_ticks = MaxNLocator(nbins=4, integer=True).tick_values(
        0, max(1, max_percent * 1.08)
    )
    return edges, x_ticks, y_ticks


def plot_distributions(results, output_path=OUTPUT_PATH):
    """Plot comparable early-force distributions for the four core families."""
    groups = family_values(results)
    edges, x_ticks, y_ticks = shared_histogram_axes(groups)
    plt.rcParams.update(
        {
            "font.family": "monospace",
            "font.monospace": [
                "SFMono-Regular",
                "Consolas",
                "Liberation Mono",
                "Menlo",
                "DejaVu Sans Mono",
            ],
            "font.size": 10,
            "text.color": INK,
            "axes.facecolor": PAPER,
            "axes.labelcolor": MUTED,
            "xtick.color": MUTED,
            "ytick.color": MUTED,
        }
    )
    fig, axes = plt.subplots(
        1, 4, figsize=(16, 5.2), sharex=True, sharey=True, facecolor=PAPER
    )
    add_figure_heading(
        fig,
        "Early response by main cushion",
        "Distribution of force at 5 ms across complete 50 mm stacks",
        x=0.065,
    )
    response_colors = (RANK_COLORS[0], RANK_COLORS[2], RANK_COLORS[4])
    fig.legend(
        handles=[
            Patch(
                facecolor=response_colors[0],
                label=f"Soft < {SOFT_FORCE_LIMIT_N / 1000:.2f} kN",
            ),
            Patch(
                facecolor=response_colors[1],
                label=(
                    f"Neutral {SOFT_FORCE_LIMIT_N / 1000:.2f} to < "
                    f"{RESPONSIVE_FORCE_MIN_N / 1000:.2f} kN"
                ),
            ),
            Patch(
                facecolor=response_colors[2],
                label=f"Responsive >= {RESPONSIVE_FORCE_MIN_N / 1000:.2f} kN",
            ),
        ],
        loc="lower center",
        bbox_to_anchor=(0.5, 0.025),
        frameon=False,
        ncol=3,
        labelcolor=MUTED,
        fontsize=10,
        handlelength=1.4,
        handleheight=0.8,
        columnspacing=2,
    )

    for axis, family in zip(axes.flat, FAMILIES):
        values = groups[family]
        counts, _ = np.histogram(values, bins=edges)
        if int(counts.sum()) != len(values):
            raise ValueError(f"Histogram count mismatch for {family}")
        percentages = counts * (100 / len(values)) if len(values) else counts
        widths = np.diff(edges)
        centers = edges[:-1] + widths / 2
        colors = np.where(
            centers < SOFT_FORCE_LIMIT_N / 1000,
            response_colors[0],
            np.where(
                centers < RESPONSIVE_FORCE_MIN_N / 1000,
                response_colors[1],
                response_colors[2],
            ),
        )
        axis.bar(
            edges[:-1] + widths * 0.03,
            percentages,
            width=widths * 0.94,
            align="edge",
            color=colors,
            edgecolor="none",
        )
        axis.set_title(family, loc="left", fontsize=13, color=INK, pad=15)
        if not len(values):
            axis.text(
                0.5, 0.5, "No available values", transform=axis.transAxes,
                ha="center"
            )
        axis.set_xticks(x_ticks)
        axis.set_yticks(y_ticks)
        axis.set_xlim(edges[0], edges[-1])
        axis.set_ylim(y_ticks[0], y_ticks[-1])
        axis.yaxis.set_major_formatter(PercentFormatter(xmax=100, decimals=0))
        axis.grid(axis="y", color=LINE, linewidth=0.6)
        axis.set_axisbelow(True)
        axis.spines[["top", "right", "left"]].set_visible(False)
        axis.spines["bottom"].set_color("#636b6d")
        axis.spines["bottom"].set_linewidth(0.7)
        axis.tick_params(axis="both", which="both", length=0, pad=9)

    fig.supxlabel("Force at 5 ms (kN)", fontsize=10, color=MUTED, y=0.13)
    fig.supylabel("Share of stacks", fontsize=10, color=MUTED, x=0.018)
    fig.subplots_adjust(left=0.065, right=0.97, bottom=0.19, top=0.75, wspace=0.18)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=160, facecolor=PAPER)
    plt.close(fig)


def render_response_bands():
    """Render the response definitions shared by the chart and analysis text."""
    soft = SOFT_FORCE_LIMIT_N / 1000
    responsive = RESPONSIVE_FORCE_MIN_N / 1000
    return "\n".join(
        [
            "| Response | Force at 5 ms (kN) |",
            "| :--- | :--- |",
            f"| Soft | Below {soft:.2f} |",
            f"| Neutral | {soft:.2f} to below {responsive:.2f} |",
            f"| Responsive | {responsive:.2f} or higher |",
        ]
    )


def main():
    results = load_results()
    plot_distributions(results)
    replace_markdown_block(
        ANALYSIS_PATH, START_MARKER, END_MARKER, render_response_bands()
    )


if __name__ == "__main__":
    main()
