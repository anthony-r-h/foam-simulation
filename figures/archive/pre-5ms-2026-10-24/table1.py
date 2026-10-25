"""Write descriptive statistics for each layer to a separate CSV.

Outer, main-cushion, and comfort tables group stacks by foam family. The support
table compares three EVA grades selected to span the available density and
firmness range. Row count includes every simulation row in the applicable group,
with no status filter. Available count records the nonmissing values for that
outcome. SD is the sample SD (n - 1) and is blank when fewer than two values are
available.
"""

import argparse
import csv
from dataclasses import dataclass
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LAYERS = ("Outer", "Main cushion", "Support", "Comfort")
FAMILIES = ("PU", "HR", "EVA", "Latex")
LAYER_SLUGS = {
    "Outer": "outer",
    "Main cushion": "main-cushion",
    "Support": "support",
    "Comfort": "comfort",
}
SUPPORT_GRADE_IDS = (
    "cutfoam-eva75",
    "aortha-eva-a35",
    "aortha-eva-a50",
)
# CSV column, display label, unit conversion for display.
STACK_OUTCOMES = (
    ("peak_force_n", "Peak force, kN", 0.001),
    ("loading_rate_10_90_n_s", "10%-90% loading rate, kN/s", 0.001),
    ("peak_loading_rate_n_s", "Peak loading rate over 0.5 ms, kN/s", 0.001),
    ("maximum_glove_compression_mm", "Maximum glove compression, mm", 1),
    ("maximum_glove_compression_percent", "Maximum glove compression, %", 1),
    ("foam_sample_weight_g", "Stack sample weight, g", 1),
    ("glove_total_work_j", "Glove loading work, J", 1),
    ("glove_total_work_share_percent", "Glove loading work share, %", 1),
)


def number(value):
    if value is None or str(value).strip() == "":
        return None
    result = float(value)
    if not math.isfinite(result):
        raise ValueError(f"Expected a finite number, got {value!r}")
    return result


@dataclass
class Summary:
    count: int = 0
    mean: float = 0.0
    m2: float = 0.0
    minimum: float = math.inf
    maximum: float = -math.inf

    def add(self, value):
        if value is None:
            return
        # Welford's algorithm avoids retaining the full results dataset.
        self.count += 1
        delta = value - self.mean
        self.mean += delta / self.count
        self.m2 += delta * (value - self.mean)
        self.minimum = min(self.minimum, value)
        self.maximum = max(self.maximum, value)

    @property
    def sd(self):
        if self.count < 2:
            return None
        return math.sqrt(max(0.0, self.m2 / (self.count - 1)))


def load_catalog(path):
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
                materials = json.loads(row["materials"])
                name = materials[0]
            except (json.JSONDecodeError, IndexError, TypeError) as error:
                raise ValueError(f"Invalid materials for {foam_id}") from error
            catalog[foam_id] = {"family": family, "name": name}
    missing_support_grades = set(SUPPORT_GRADE_IDS) - set(catalog)
    if missing_support_grades:
        raise ValueError(
            "Missing support grades: " + ", ".join(sorted(missing_support_grades))
        )
    return catalog


def descriptive_statistics(results_path, catalog):
    """Stream the CSV into family summaries and selected support-grade summaries."""
    tables = {layer: {} for layer in LAYERS}
    keys = [key for key, _, _ in STACK_OUTCOMES]
    required = {key for key, _, _ in STACK_OUTCOMES}
    for layer in range(1, 5):
        required.add(f"layer_{layer}_foam_id")

    with Path(results_path).open(newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Missing results columns: {', '.join(sorted(missing))}")
        for row_number, row in enumerate(reader, start=2):
            try:
                if None in row or any(value is None for value in row.values()):
                    raise ValueError("Malformed CSV row")
                outcomes = {}
                for key, _, factor in STACK_OUTCOMES:
                    value = number(row[key])
                    outcomes[key] = None if value is None else value * factor
                for index, layer in enumerate(LAYERS, start=1):
                    foam_id = row[f"layer_{index}_foam_id"]
                    foam = catalog[foam_id]
                    if layer == "Support":
                        if foam_id not in SUPPORT_GRADE_IDS:
                            continue
                        group_key = foam_id
                        group_type = "grade"
                        group_name = foam["name"]
                    else:
                        group_key = foam["family"]
                        group_type = "family"
                        group_name = foam["family"]
                    if group_key not in tables[layer]:
                        tables[layer][group_key] = {
                            "group_type": group_type,
                            "group": group_name,
                            "foam_id": foam_id if group_type == "grade" else "",
                            "N": 0,
                            "variables": {key: Summary() for key in keys},
                        }
                    group = tables[layer][group_key]
                    group["N"] += 1
                    for key, value in outcomes.items():
                        group["variables"][key].add(value)
            except (KeyError, ValueError) as error:
                raise ValueError(f"Results row {row_number}: {error}") from error
    if not tables[LAYERS[0]]:
        raise ValueError("The results CSV has no data rows")
    return tables


def write_csv(layer, groups, destination):
    """Write one row per comparison group and stack outcome for one layer."""
    fields = (
        "layer",
        "group_type",
        "group",
        "foam_id",
        "row_count",
        "outcome",
        "available_count",
        "mean",
        "sd",
        "minimum",
        "maximum",
    )
    writer = csv.DictWriter(destination, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    group_order = SUPPORT_GRADE_IDS if layer == "Support" else FAMILIES
    for group_key in group_order:
        if group_key not in groups:
            continue
        group = groups[group_key]
        for key, label, _ in STACK_OUTCOMES:
            summary = group["variables"][key]
            writer.writerow(
                {
                    "layer": layer,
                    "group_type": group["group_type"],
                    "group": group["group"],
                    "foam_id": group["foam_id"],
                    "row_count": group["N"],
                    "outcome": label,
                    "available_count": summary.count,
                    "mean": summary.mean if summary.count else "",
                    "sd": summary.sd if summary.sd is not None else "",
                    "minimum": summary.minimum if summary.count else "",
                    "maximum": summary.maximum if summary.count else "",
                }
            )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results", type=Path, default=ROOT / "data/results_full_2026-10-23.csv")
    parser.add_argument("--catalog", type=Path, default=ROOT / "data/analytical-foams2.csv")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "figures")
    args = parser.parse_args()
    catalog = load_catalog(args.catalog)
    tables = descriptive_statistics(args.results, catalog)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for layer in LAYERS:
        output_path = args.output_dir / f"table1-{LAYER_SLUGS[layer]}.csv"
        with output_path.open("w", newline="", encoding="utf-8") as destination:
            write_csv(layer, tables[layer], destination)
        print(output_path)


if __name__ == "__main__":
    main()
