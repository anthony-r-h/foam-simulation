import csv
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from build_analytical_foams import DATA_DIR, OUTPUT_COLUMNS, consolidate


def listing(foam_id="foam-a", **changes):
    row = {
        "foam_id": foam_id, "materials": '["Shop Foam A"]', "family": "EVA",
        "subtype": "closed_cell_EVA", "reference_curve": "eva", "density_kg_m3": "50",
        "firmness_p1_value": "50", "firmness_p1_at_pct": "25",
        "firmness_p2_value": "116", "firmness_p2_at_pct": "50",
        "firmness_p3_value": "", "firmness_p3_at_pct": "", "firmness_units": "kPa",
        "thicknesses_mm": "[10,6,10.0,0.75]",
    }
    row.update(changes)
    return row


class ConsolidationTests(unittest.TestCase):
    def test_source_identity_and_numeric_lists_are_preserved(self):
        rows = [listing(), listing("foam-b", materials='["Other Foam", "Alias"]')]
        profiles = consolidate(rows)
        self.assertEqual([row["foam_id"] for row in profiles], ["foam-a", "foam-b"])
        self.assertEqual(json.loads(profiles[0]["materials"]), ["Shop Foam A"])
        self.assertEqual(json.loads(profiles[1]["materials"]), ["Other Foam", "Alias"])
        self.assertEqual(profiles[0]["thicknesses_mm"], "[0.75,6,10]")
        self.assertEqual(profiles[0]["density_kg_m3"], "50")
        self.assertEqual(profiles[0]["subtype"], "closed_cell_EVA")
        self.assertEqual(profiles, consolidate(list(reversed(rows))))

    def test_missing_measurements_remain_missing(self):
        profile = consolidate([listing(density_kg_m3="", firmness_p1_value="",
                                       firmness_units="", thicknesses_mm="[]")])[0]
        for field in ("density_kg_m3", "firmness_p1_value", "firmness_units"):
            self.assertEqual(profile[field], "")
        self.assertEqual(profile["firmness_p1_at_pct"], "25")
        self.assertEqual(profile["thicknesses_mm"], "[]")

    def test_explicit_curves_override_name_heuristics(self):
        for family, source, expected in (("PU", "pu", "pu55"), ("PU", "hr", "hr40"),
                                         ("EVA", "eva", "eva35"), ("Latex", "latex", "latex85")):
            with self.subTest(curve=source):
                profile = consolidate([listing(family=family, reference_curve=source,
                                               materials='["Qualux HR"]')])[0]
                self.assertEqual(profile["reference_curve"], expected)
        with self.assertRaisesRegex(ValueError, "does not match family"):
            consolidate([listing(reference_curve="hr")])

    def test_all_anchor_positions_and_values_survive(self):
        row = listing(firmness_p1_at_pct="20", firmness_p2_at_pct="45",
                      firmness_p3_value="200", firmness_p3_at_pct="65")
        profile = consolidate([row])[0]
        for i in (1, 2, 3):
            for suffix in ("value", "at_pct"):
                field = f"firmness_p{i}_{suffix}"
                self.assertEqual(profile[field], row[field])

    def test_duplicate_ids_and_invalid_rows_fail_with_row_number(self):
        with self.assertRaisesRegex(ValueError, "CSV row 3:.*duplicate foam_id"):
            consolidate([listing(), listing()])
        invalid = [
            {"foam_id": ""}, {"materials": "[]"}, {"materials": '[""]'},
            {"materials": "{}"}, {"materials": "bad JSON"}, {"family": ""},
            {"reference_curve": "unknown"}, {"firmness_units": "unknown"},
            {"thicknesses_mm": "{}"}, {"thicknesses_mm": '["10"]'},
            {"thicknesses_mm": "[null]"}, {"thicknesses_mm": "[true]"},
            {"density_kg_m3": None},
        ]
        for value in ("NaN", "Infinity", "0", "-1", "abc"):
            invalid.append({"density_kg_m3": value})
            invalid.append({"firmness_p1_value": value})
            invalid.append({"thicknesses_mm": f"[{value}]"})
        for changes in invalid:
            with self.subTest(changes=changes), self.assertRaisesRegex(ValueError, "CSV row 2"):
                consolidate([listing(**changes)])

    def test_default_source_and_repeatable_output(self):
        script = Path(__file__).with_name("build_analytical_foams.py")
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "analytical.csv"
            command = [sys.executable, str(script), "--output", str(output)]
            subprocess.run(command, check=True, capture_output=True, text=True)
            first = output.read_bytes()
            subprocess.run(command, check=True, capture_output=True, text=True)
            self.assertEqual(output.read_bytes(), first)
            with output.open(newline="") as stream:
                actual = list(csv.DictReader(stream))
        with (DATA_DIR / "commercial-foams2.csv").open(newline="") as stream:
            source = list(csv.DictReader(stream))
        self.assertEqual(actual, consolidate(source))
        self.assertEqual(list(actual[0]), list(OUTPUT_COLUMNS))
        self.assertEqual({row["foam_id"] for row in actual}, {row["foam_id"] for row in source})


if __name__ == "__main__":
    unittest.main()
