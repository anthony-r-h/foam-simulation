"""Shared paths, settings, and input helpers for the analysis scripts."""

import csv
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESULTS_PATH = ROOT / "data/simulations.csv"
CATALOG_PATH = ROOT / "data/analytical-foams.csv"
ANALYSIS_PATH = ROOT / "docs/ANALYSIS.md"
FIGURES_PATH = ROOT / "figures"
LAYERS = ("Outer", "Main cushion", "Support", "Comfort")
FAMILIES = ("PU", "HR", "EVA", "Latex")
SOFT_FORCE_LIMIT_N = 500
RESPONSIVE_FORCE_MIN_N = 700
PAPER = "#303638"
INK = "#e7e9e8"
MUTED = "#b4bab8"
LINE = "#4c5355"
FRONTIER_COLOR = "#5ba6ff"
RANK_COLORS = ("#3b0f70", "#7c1d6f", "#bc3754", "#ed6925", "#fbb61a")
RESPONSE_BAND_COLORS = {
    "Soft": RANK_COLORS[0],
    "Neutral": RANK_COLORS[2],
    "Responsive": RANK_COLORS[4],
}
THICKNESS_LINE_COLORS = (
    "#a46be1",
    "#8d46c7",
    "#7c1d6f",
    "#982762",
    "#bc3754",
    "#d7513b",
    "#ed6925",
    "#fbb61a",
)
SENSITIVITY_HEATMAP = "magma"
WEIGHT_BAND_COLORS = (
    "#3b0f70",
    "#65186f",
    "#922564",
    "#bc3754",
    "#ed6925",
    "#fbb61a",
)
REFERENCE_RECIPE_COLORS = {
    "Soft": "#f2a6c6",
    "Responsive": "#a3e635",
}
REFERENCE_RECIPE_MARKER = "o"
LAYER_COLORS = {
    "Outer": "#22d3ee",
    "Main cushion": "#60a5fa",
    "Support": "#f472b6",
    "Comfort": "#4ade80",
}
TIME_SERIES_COLORS = {
    "Force": "#f8fafc",
    "Glove work": "#a3e635",
    "Speed": "#22d3ee",
}


def add_figure_heading(
    figure,
    title,
    subtitle,
    *,
    x=0.10,
    title_y=0.95,
    subtitle_y=0.89,
    title_size=20,
):
    """Apply the shared title and descriptive-subtitle hierarchy."""
    figure.suptitle(title, fontsize=title_size, x=x, ha="left", y=title_y)
    figure.text(x, subtitle_y, subtitle, fontsize=10, color=MUTED, ha="left", va="top")


def number(value):
    if value is None or str(value).strip() == "":
        return None
    result = float(value)
    if not math.isfinite(result):
        raise ValueError(f"Expected a finite number, got {value!r}")
    return result


def load_catalog(path=CATALOG_PATH):
    catalog = {}
    with Path(path).open(newline="", encoding="utf-8-sig") as source:
        for row in csv.DictReader(source):
            foam_id = row["foam_id"]
            if not foam_id or foam_id in catalog:
                raise ValueError(f"Missing or duplicate foam ID: {foam_id!r}")
            family = row["family"]
            if family == "PU" and row["reference_curve"] == "hr40":
                family = "HR"
            if family not in FAMILIES:
                raise ValueError(f"Unknown family for {foam_id}: {family!r}")
            try:
                name = json.loads(row["materials"])[0]
            except (json.JSONDecodeError, IndexError, TypeError) as error:
                raise ValueError(f"Invalid materials for {foam_id}") from error
            catalog[foam_id] = {"family": family, "name": name}
    return catalog


def replace_markdown_block(path, start_marker, end_marker, content):
    """Replace one marker-delimited block without changing surrounding text."""
    source = Path(path).read_text(encoding="utf-8")
    if source.count(start_marker) != 1 or source.count(end_marker) != 1:
        raise ValueError("Expected exactly one Markdown block start and end marker")

    start = source.index(start_marker)
    end = source.index(end_marker, start)
    if start >= end:
        raise ValueError("Markdown block markers are out of order")

    block = f"{start_marker}\n\n{content}\n\n{end_marker}"
    updated = source[:start] + block + source[end + len(end_marker) :]
    Path(path).write_text(updated, encoding="utf-8")
