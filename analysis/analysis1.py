"""Write the display-ready CSV tables used in Analysis Section 2.

Outer, main-cushion, and comfort results are grouped by foam family. Support
results are grouped into soft, medium, and firm EVA categories. All simulation
rows are included. These are descriptive comparisons of complete stacks grouped
by the material in one layer, not estimates of that layer's isolated effect.
"""

import argparse
import math
from pathlib import Path

import pandas as pd

from analysis.common import (
    CATALOG_PATH,
    FAMILIES,
    FIGURES_PATH,
    LAYERS,
    RESULTS_PATH,
    load_catalog,
    number,
)

# Family grouping would reduce the all-EVA support layer to one row. The ten
# simulated grades instead form three separated clusters on catalog firmness.
SUPPORT_FIRMNESS_GROUPS = {
    "Soft EVA": (
        "evazote-ev30",
        "evazote-ev50",
        "evazote-va35",
        "cutfoam-eva75",
        "minicel-t380",
    ),
    "Medium EVA": (
        "minicel-t600",
        "aortha-eva-a25",
        "aortha-eva-a35",
    ),
    "Firm EVA": (
        "cutfoam-eva240",
        "aortha-eva-a50",
    ),
}
SUPPORT_GRADE_GROUPS = {
    foam_id: group
    for group, foam_ids in SUPPORT_FIRMNESS_GROUPS.items()
    for foam_id in foam_ids
}
OUTCOMES = {
    "peak_force_n": ("Peak force (kN)", 0.001),
    "maximum_glove_compression_percent": ("Compression (%)", 1),
    "force_at_5ms_n": ("Force at 5 ms (kN)", 0.001),
    "foam_sample_weight_g": ("Sample weight (g)", 1),
}
OUTCOME_DECIMALS = {
    "Peak force (kN)": 2,
    "Compression (%)": 1,
    "Force at 5 ms (kN)": 2,
    "Sample weight (g)": 2,
}
LAYER_FILENAMES = {
    "Outer": "analysis1-outer.csv",
    "Main cushion": "analysis1-main-cushion.csv",
    "Support": "analysis1-support.csv",
    "Comfort": "analysis1-comfort.csv",
}


def generate_table_data(
    results_path=RESULTS_PATH,
    catalog_path=CATALOG_PATH,
):
    """Return one tidy DataFrame containing the four layer summaries."""
    catalog = load_catalog(catalog_path)
    missing = set(SUPPORT_GRADE_GROUPS) - set(catalog)
    if missing:
        raise ValueError("Missing support grades: " + ", ".join(sorted(missing)))
    foam_columns = [f"layer_{number}_foam_id" for number in range(1, 5)]
    results = pd.read_csv(
        results_path,
        usecols=[*foam_columns, *OUTCOMES],
        dtype={column: "category" for column in foam_columns},
    )
    if results.empty:
        raise ValueError("The results CSV has no data rows")

    for column in foam_columns:
        if results[column].isna().any():
            raise ValueError(f"Missing foam ID in {column}")
        unknown = set(results[column].unique()) - set(catalog)
        if unknown:
            raise ValueError(f"Unknown foam IDs in {column}: {', '.join(sorted(unknown))}")

    for column, (_, factor) in OUTCOMES.items():
        results[column] = pd.to_numeric(results[column], errors="raise") * factor
        if results[column].isin([math.inf, -math.inf]).any():
            raise ValueError(f"Expected finite values in {column}")

    tables = []
    # Each layer gets its own summary so material groups remain rows and the
    # finished tables fit the document width.
    for layer_number, layer in enumerate(LAYERS, start=1):
        foam_column = f"layer_{layer_number}_foam_id"
        if layer == "Support":
            frame = results[list(OUTCOMES)].copy()
            group_order = tuple(SUPPORT_FIRMNESS_GROUPS)
            group_type = "firmness"
            group_names = {group: group for group in group_order}
            group_values = results[foam_column].map(SUPPORT_GRADE_GROUPS)
            if group_values.isna().any():
                unknown = set(results.loc[group_values.isna(), foam_column])
                raise ValueError(
                    "Support grades without a firmness group: "
                    + ", ".join(sorted(unknown))
                )
        else:
            frame = results[list(OUTCOMES)].copy()
            group_order = FAMILIES
            group_type = "family"
            group_names = {family: family for family in FAMILIES}
            group_values = results[foam_column].map(
                {foam_id: foam["family"] for foam_id, foam in catalog.items()}
            )

        frame["group_key"] = pd.Categorical(
            group_values, categories=group_order, ordered=True
        )
        grouped = frame.groupby("group_key", observed=True, sort=True)
        row_counts = grouped.size()

        for outcome, (label, _) in OUTCOMES.items():
            summary = grouped[outcome].agg(
                mean="mean",
                sd="std",
            ).reset_index()
            keys = summary["group_key"].astype(str)
            summary.insert(0, "layer", layer)
            summary.insert(1, "group_type", group_type)
            summary.insert(2, "group", keys.map(group_names))
            summary.insert(3, "foam_id", "")
            summary.insert(
                4,
                "row_count",
                summary["group_key"].map(row_counts).astype("int64"),
            )
            summary.insert(5, "outcome", label)
            tables.append(summary.drop(columns="group_key"))

    return pd.concat(tables, ignore_index=True)


def display_table(table_data, layer):
    """Return one display-ready table with formatted values for the document."""
    outcome_labels = [label for label, _ in OUTCOMES.values()]
    layer_data = table_data.loc[table_data["layer"] == layer]
    headings = ["Material", "Stacks", *outcome_labels]
    rows = []

    for group in layer_data["group"].drop_duplicates():
        group_data = layer_data.loc[layer_data["group"] == group]
        row = [group, f"{group_data['row_count'].iloc[0]:,}"]
        for outcome in outcome_labels:
            value = group_data.loc[group_data["outcome"] == outcome].iloc[0]
            decimals = OUTCOME_DECIMALS[outcome]
            row.append(f"{value['mean']:.{decimals}f} ({value['sd']:.{decimals}f})")
        rows.append(row)

    return pd.DataFrame(rows, columns=headings)


def write_display_tables(table_data, output_dir=FIGURES_PATH):
    """Write one compact CSV for each layer without modifying the analysis text."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for layer in LAYERS:
        output_path = output_dir / LAYER_FILENAMES[layer]
        display_table(table_data, layer).to_csv(
            output_path,
            index=False,
            lineterminator="\n",
        )
        paths.append(output_path)
        print(output_path, flush=True)
    return paths


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=RESULTS_PATH)
    parser.add_argument("--catalog", type=Path, default=CATALOG_PATH)
    parser.add_argument("--output-dir", type=Path, default=FIGURES_PATH)
    args = parser.parse_args()
    write_display_tables(
        generate_table_data(args.results, args.catalog),
        args.output_dir,
    )


if __name__ == "__main__":
    main()
