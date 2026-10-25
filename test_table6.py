"""Checks for sensitivity-study input construction and saved-run integrity."""

import copy
import gzip
import json
import math
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from table6 import response_class, run_case, scaled_request


class SensitivityTests(unittest.TestCase):
    def setUp(self):
        self.request = {
            "mass_kg": 2.597, "speed_m_s": 7.7,
            "layers": [{"layer": i + 1, "foam_id": f"foam-{i}", "thickness_mm": thickness}
                       for i, thickness in enumerate((10, 34, 3, 3))],
            "target": {"foam_id": "target", "thickness_mm": 50},
        }

    def test_fractional_layers_preserve_composition_and_target(self):
        original = copy.deepcopy(self.request)
        actual = scaled_request(self.request, 35, 120)
        self.assertEqual(self.request, original)
        self.assertAlmostEqual(sum(layer["thickness_mm"] for layer in actual["layers"]), 35)
        for before, after in zip(original["layers"], actual["layers"]):
            self.assertEqual(after["foam_id"], before["foam_id"])
            self.assertAlmostEqual(after["thickness_mm"] / before["thickness_mm"], 0.7)
        self.assertAlmostEqual(actual["layers"][2]["thickness_mm"], 2.1)
        self.assertEqual(actual["target"], original["target"])
        self.assertEqual(actual["mass_kg"], original["mass_kg"])
        self.assertAlmostEqual(0.5 * actual["mass_kg"] * actual["speed_m_s"] ** 2, 120)

    def test_baseline_energy_recovers_original_request(self):
        energy = 0.5 * self.request["mass_kg"] * self.request["speed_m_s"] ** 2
        actual = scaled_request(self.request, 50, energy)
        self.assertEqual(actual["layers"], self.request["layers"])
        self.assertAlmostEqual(actual["speed_m_s"], 7.7)

    def test_invalid_sweep_inputs_fail(self):
        for invalid in (0, -1, math.nan, math.inf):
            with self.assertRaises(ValueError):
                scaled_request(self.request, invalid, 90)
            with self.assertRaises(ValueError):
                scaled_request(self.request, 50, invalid)

    def test_response_boundaries_and_unavailable_values(self):
        self.assertEqual([response_class(value) for value in (None, 499.999, 500, 699.999, 700)],
                         ["unavailable", "soft", "neutral", "neutral", "responsive"])

    def test_failed_run_is_saved_and_changed_inputs_cannot_reuse_it(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "run.json.gz"
            with patch("table6.simulate", return_value={"status": "error", "reason": "test error"}) as engine:
                with self.assertRaisesRegex(ValueError, "test error"):
                    run_case(path, self.request, {}, Path("catalog"), "engine-hash", "catalog-hash")
                engine.assert_called_once()
            with gzip.open(path, "rt") as source:
                saved = json.load(source)
            self.assertEqual(saved["inputs"]["request"], self.request)
            self.assertEqual(saved["result"]["reason"], "test error")
            with patch("table6.simulate") as engine:
                with self.assertRaisesRegex(ValueError, "Saved inputs changed"):
                    run_case(path, self.request, {}, Path("catalog"), "changed-engine", "catalog-hash")
                engine.assert_not_called()


if __name__ == "__main__":
    unittest.main()
