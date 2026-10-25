"""Selection invariants for the three-dimension recipe comparison."""
import unittest
import copy
import csv
from pathlib import Path
import tempfile

import numpy as np

from table4 import (WEIGHT, best_stack, percentile_scores, protection_eligible,
                    score_stacks, select_top, load_results, responsiveness_masks)
from table3 import CONDITIONS, OUTCOMES, load_outcomes


class ScoringTests(unittest.TestCase):
    def values(self):
        return {WEIGHT: np.full(4, 2.5),
                "peak_force_n": np.array([2800., 2800., 2800., 2800.]),
                "maximum_glove_compression_percent": np.full(4, 60.),
                "force_at_5ms_n": np.array([300., 500., 500., 700.])}

    def test_percentiles_preserve_ties_and_reverse_direction(self):
        data = np.array([10., 20., 20., 30.])
        np.testing.assert_allclose(percentile_scores(data), [12.5, 50, 50, 87.5])
        np.testing.assert_allclose(percentile_scores(data, False), [87.5, 50, 50, 12.5])
        np.testing.assert_allclose(percentile_scores([5., 5.]), [50, 50])

    def test_styles_share_reference_and_reverse_only_response(self):
        scores, components, available = score_stacks(self.values())
        self.assertTrue(available.all())
        np.testing.assert_allclose(components["protection"], 50)
        np.testing.assert_allclose(components["reserve"], 50)
        self.assertEqual(np.argmax(scores["pillowy"]), 0)
        self.assertEqual(np.argmax(scores["poppy"]), 3)
        np.testing.assert_allclose(scores["pillowy"] + scores["poppy"], 100)
        self.assertEqual(scores["pillowy"][1], scores["pillowy"][2])

    def test_protection_ceiling_cannot_be_compensated_by_response(self):
        values = self.values()
        values["peak_force_n"][3] = 3200
        scores, components, available = score_stacks(values)
        eligible = protection_eligible(values, available, 3026)
        self.assertFalse(eligible[3])
        selected, _ = select_top(scores["poppy"], eligible, 90)
        self.assertFalse(selected[3])
        # Gate is applied after percentile construction: its failed row remains in reference.
        np.testing.assert_allclose(components["protection"][:3], 62.5)

    def test_missing_metric_excludes_row_from_every_component(self):
        values = self.values()
        values["force_at_5ms_n"][3] = np.nan
        scores, components, available = score_stacks(values)
        self.assertFalse(available[3])
        self.assertTrue(np.isnan(scores["pillowy"][3]))
        self.assertTrue(np.isnan(components["protection"][3]))
        self.assertAlmostEqual(components["response"][0], 100 / 6)

    def test_top_cutoff_includes_all_ties(self):
        overall = np.array([0., 1., 2., 3., 3.])
        selected, cutoff = select_top(overall, np.ones(5, dtype=bool), 90)
        self.assertEqual(cutoff, 3)
        np.testing.assert_equal(selected, [False, False, False, True, True])

    def test_recipe_ties_use_stack_id_not_csv_order(self):
        index, identifier, count = best_stack(np.array([90., 90.]), np.array([True, True]),
                                             np.array([[1], [0]]), np.array([[50.], [50.]]),
                                             ["a", "b"])
        self.assertEqual((index, identifier, count), (1, "a@50mm", 2))

    def test_invalid_weights_and_empty_eligible_group_fail(self):
        with self.assertRaises(ValueError):
            score_stacks(self.values(), (0.6, 0.2, 0.3))
        with self.assertRaises(ValueError):
            select_top(np.array([50.]), np.array([False]), 90)

    def test_response_classes_have_exact_nonoverlapping_boundaries(self):
        values = {"force_at_5ms_n": np.array([499.999, 500., 699.999, 700., np.nan])}
        masks = responsiveness_masks(values)
        np.testing.assert_equal(masks["pillowy"], [True, False, False, False, False])
        np.testing.assert_equal(masks["neutral"], [False, True, True, False, False])
        np.testing.assert_equal(masks["poppy"], [False, False, False, True, False])

    def test_better_protection_cannot_put_a_poppy_stack_in_soft_selection(self):
        values = {WEIGHT: np.array([2.5, 2.5]),
                  "peak_force_n": np.array([3000., 2700.]),
                  "maximum_glove_compression_percent": np.array([85., 60.]),
                  "force_at_5ms_n": np.array([480., 750.])}
        scores, _, available = score_stacks(values)
        self.assertGreater(scores["pillowy"][1], scores["pillowy"][0])
        protected = protection_eligible(values, available, 3026)
        masks = responsiveness_masks(values)
        soft, _ = select_top(scores["pillowy"], protected & masks["pillowy"], 90)
        poppy, _ = select_top(scores["poppy"], protected & masks["poppy"], 90)
        np.testing.assert_equal(soft, [True, False])
        np.testing.assert_equal(poppy, [False, True])
        with self.assertRaises(ValueError):
            select_top(scores["pillowy"], protected & masks["neutral"], 90)


class ResultLoadingTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "results.csv"
        self.row = dict(zip(CONDITIONS, (2.597, 7.7, "target", 50)))
        self.row.update({"status": "complete", WEIGHT: 2.5, "peak_force_n": 2800,
                         "maximum_glove_compression_percent": 60, "force_at_5ms_n": 500})
        for layer in range(1, 5):
            self.row[f"layer_{layer}_foam_id"] = f"foam{layer}"
            self.row[f"layer_{layer}_thickness_mm"] = 12.5

    def write(self, rows):
        with self.path.open("w", newline="") as source:
            writer = csv.DictWriter(source, fieldnames=list(self.row))
            writer.writeheader()
            writer.writerows(rows)

    def test_incomplete_simulations_do_not_enter_score_reference(self):
        incomplete = {**self.row, "status": "incomplete", "force_at_5ms_n": ""}
        self.write([incomplete, self.row])
        values, _, _, _, _ = load_results(self.path, {f"foam{i}": {} for i in range(1, 5)})
        self.assertEqual(len(values[WEIGHT]), 1)

    def test_same_recipe_can_be_marked_for_both_objectives(self):
        self.write([self.row])
        layers = tuple((f"foam{i}", 12.5) for i in range(1, 5))
        record = {"request": {"mass_kg": 2.597, "speed_m_s": 7.7,
                               "target": {"foam_id": "target", "thickness_mm": 50}},
                  "source_outcomes": {key: self.row[key] for key in (WEIGHT, *(x[0] for x in OUTCOMES))}}
        recipes = [{"label": label, "layers": layers, "record": copy.deepcopy(record)}
                   for label in ("Soft", "Responsive")]
        load_outcomes(self.path, recipes)
        self.assertEqual(recipes[0]["outcomes"], recipes[1]["outcomes"])
        recipes[1]["record"]["source_outcomes"]["peak_force_n"] += 1
        with self.assertRaisesRegex(ValueError, "changed; rerun table4"):
            load_outcomes(self.path, recipes)


if __name__ == "__main__":
    unittest.main()
