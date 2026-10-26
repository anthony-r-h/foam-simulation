#!/usr/bin/env python3
"""Build a supplier-independent computation catalog using only the standard library.

Run: python3 scripts/build_analytical_foams.py [--input SOURCE] [--output DEST]

The default source is data/commercial-foams.csv, which already contains one row per
commercial profile. Preserve its IDs and material names without merging profiles.
Map source curve families to the simulation references and normalize the numeric,
sorted thickness lists. Preserve the source measurement fields and leave missing
measurements blank. Source links are omitted from the computation catalog.
The default destination, data/analytical-foams.csv, is regenerated entirely from the source.
"""

import argparse
import csv
from decimal import Decimal, InvalidOperation
import json
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
ANCHOR_COLUMNS = (
    "firmness_p1_value", "firmness_p1_at_pct",
    "firmness_p2_value", "firmness_p2_at_pct",
    "firmness_p3_value", "firmness_p3_at_pct",
)
REQUIRED_COLUMNS = (
    "foam_id", "materials", "family", "subtype", "reference_curve", "density_kg_m3",
    *ANCHOR_COLUMNS, "firmness_units", "thicknesses_mm",
)
REFERENCE_CURVES = {"pu": ("PU", "pu55"), "hr": ("PU", "hr40"),
                    "eva": ("EVA", "eva35"), "latex": ("Latex", "latex85")}
FIRMNESS_UNITS = {"Pa", "kPa", "N", "lbf"}
OUTPUT_COLUMNS = (
    "foam_id", "materials", "family", "subtype", "reference_curve", "density_kg_m3",
    "firmness_units", *ANCHOR_COLUMNS, "thicknesses_mm",
)


def positive_number(value, field):
    if not value:
        return None
    try:
        number = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(f"{field}: invalid number {value!r}") from exc
    if not number.is_finite() or number <= 0:
        raise ValueError(f"{field}: expected a finite positive number, got {value!r}")
    return number


def number_text(value):
    return "" if value is None else format(value.normalize(), "f")


def json_cell(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def consolidate(rows):
    profiles = []
    seen_ids = set()
    for line, original in enumerate(rows, start=2):
        try:
            if None in original or any(original.get(key) is None for key in REQUIRED_COLUMNS):
                raise ValueError("missing columns or malformed CSV row")
            row = {key: original[key].strip() for key in REQUIRED_COLUMNS}
            foam_id = row["foam_id"]
            if not foam_id or foam_id in seen_ids:
                raise ValueError(f"missing or duplicate foam_id: {foam_id!r}")
            seen_ids.add(foam_id)
            materials = json.loads(row["materials"])
            if (not isinstance(materials, list) or not materials or
                    any(not isinstance(name, str) or not name.strip() for name in materials)):
                raise ValueError("materials must be a nonempty JSON array of names")
            curve = row["reference_curve"]
            if curve not in REFERENCE_CURVES:
                raise ValueError(f"unknown reference_curve: {curve!r}")
            family, reference_curve = REFERENCE_CURVES[curve]
            if row["family"] != family:
                raise ValueError(f"reference_curve {curve!r} does not match family {row['family']!r}")
            units = row["firmness_units"]
            if units and units not in FIRMNESS_UNITS:
                raise ValueError(f"unknown firmness_units: {units!r}")
            density = number_text(positive_number(row["density_kg_m3"], "density_kg_m3"))
            thicknesses = json.loads(row["thicknesses_mm"], parse_float=Decimal, parse_int=Decimal)
            if not isinstance(thicknesses, list):
                raise ValueError("thicknesses_mm must be a JSON array")
            if any(not isinstance(value, Decimal) for value in thicknesses):
                raise ValueError("thicknesses_mm must contain only numbers")
            thicknesses = sorted({positive_number(str(value), "thicknesses_mm") for value in thicknesses})
            profile = {
                "foam_id": foam_id, "materials": json_cell(materials), "family": family,
                "subtype": row["subtype"], "reference_curve": reference_curve,
                "density_kg_m3": density, "firmness_units": units,
                "thicknesses_mm": "[" + ",".join(number_text(t) for t in thicknesses) + "]",
            }
            for field in ANCHOR_COLUMNS:
                profile[field] = number_text(positive_number(row[field], field))
            profiles.append(profile)
        except ValueError as exc:
            raise ValueError(f"CSV row {line}: {exc}") from exc
    return sorted(profiles, key=lambda profile: profile["foam_id"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DATA_DIR / "commercial-foams.csv")
    parser.add_argument("--output", type=Path, default=DATA_DIR / "analytical-foams.csv")
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        parser.error("input and output must be different files")
    try:
        with args.input.open(encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source)
            missing = set(REQUIRED_COLUMNS) - set(reader.fieldnames or [])
            if missing:
                raise ValueError(f"missing columns: {', '.join(sorted(missing))}")
            rows = list(reader)
        profiles = consolidate(rows)
        if not profiles:
            raise ValueError("input contains no foam listings")
        with args.output.open("w", encoding="utf-8", newline="") as destination:
            writer = csv.DictWriter(destination, fieldnames=OUTPUT_COLUMNS, lineterminator="\n")
            writer.writeheader()
            writer.writerows(profiles)
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Error: {exc}\n")
    print(f"{len(rows)} listings -> {len(profiles)} analytical profiles: {args.output}")


if __name__ == "__main__":
    main()
