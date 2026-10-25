"""Model checks: run python3 -m unittest discover -s . -p 'test_*.py'."""

import copy
import csv
import json
import math
from pathlib import Path
import tempfile
import unittest

from simulation import (
    DIRECTORY, contact_state, interpolate, load_assumptions, material_curve,
    peak_window_rate, prepare_column, prepare_integrals, reference_response, simulate, summarize,
)


HD36 = "foam-factory-hd36-hq"
EV50 = "evazote-ev50"
LAYERS = [{"layer": 1, "foam_id": HD36, "thickness_mm": 20},
          {"layer": 2, "foam_id": EV50, "thickness_mm": 20}]
TARGET = {"foam_id": EV50, "thickness_mm": 50}


class SimulationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.assumptions = load_assumptions()
        cls.result = simulate(2.597, 7.7, LAYERS, TARGET)

    def close(self, actual, expected, relative=1e-6):
        self.assertAlmostEqual(actual, expected, delta=relative * max(1e-12, abs(expected)))

    def test_energy_movement_and_work_shares(self):
        result = self.result
        self.assertEqual(result["status"], "complete")
        self.close(result["punch"]["energy_j"], 0.5 * 2.597 * 7.7**2)
        self.assertEqual(result["trace"][0]["force_n"], 0)
        self.assertEqual(result["reached"]["speed_m_s"], 0)
        self.close(sum(part["work_share_percent"] for part in result["metrics"]["components"]), 100)
        self.close(result["metrics"]["foam_sample_weight_g"], (44.851697 + 50) * 0.03**2 * 20)
        for row in result["trace"]:
            self.close(row["total_work_j"] + row["kinetic_energy_j"], result["punch"]["energy_j"])
            self.close(row["dome_advance_mm"], row["glove_compression_mm"] + row["target"]["compression_mm"])
            self.close(row["mass_advance_mm"], row["dome_advance_mm"] + row["hand"]["compression_mm"])
            self.close(row["total_work_j"], row["glove_work_j"] + row["target"]["work_j"] + row["hand"]["work_j"])
        for left, right in zip(result["trace"], result["trace"][1:]):
            self.assertGreater(right["time_s"], left["time_s"])
            self.assertGreater(right["force_n"], left["force_n"])
            self.assertLess(right["speed_m_s"], left["speed_m_s"])
        self.close(result["checks"]["integrated_force_n_s"], 2.597 * 7.7, relative=1e-4)
        json.dumps(result, allow_nan=False)

    def test_slow_anchors_and_fast_calibration(self):
        for foam in self.result["foams"]:
            slow = material_curve(foam, self.assumptions, fast=False)
            for strain, pressure in foam["anchors"]:
                self.close(interpolate(slow["strain"], slow["pressure_pa"], strain), pressure)
        foam = self.result["foams"][1]
        reference = self.assumptions["reference_curves"]["eva35"]
        s1 = reference_response(0.25, reference, False)[0]
        fast_reference = reference_response(0.25, reference, True)[0]
        expected = 50000 * fast_reference / s1
        fast = material_curve(foam, self.assumptions)
        self.close(interpolate(fast["strain"], fast["pressure_pa"], 0.25), expected)
        self.assertGreater(expected, 50000)

    def test_one_anchor_eva_check_from_methodology(self):
        foam = {"density_kg_m3": 35, "reference_curve": "eva35", "anchors": [[0.25, 52000]]}
        slow = material_curve(foam, self.assumptions, fast=False)
        predicted = interpolate(slow["strain"], slow["pressure_pa"], 0.5)
        self.close(predicted, 122600, relative=0.001)

    def test_arbitrary_one_two_and_three_anchor_calibration(self):
        reference = self.assumptions["reference_curves"]["eva35"]
        for count in (1, 2, 3):
            points = []
            for strain in (0.10, 0.35, 0.60):
                pressure = 1.7 * math.exp(-0.4 * strain) * reference_response(strain, reference, False)[0]
                points.append([strain, pressure])
            foam = {"density_kg_m3": 35, "reference_curve": "eva35", "anchors": points[:count]}
            slow = material_curve(foam, self.assumptions, fast=False)
            for strain, pressure in foam["anchors"]:
                self.close(interpolate(slow["strain"], slow["pressure_pa"], strain), pressure)
            expected_skew = 0 if count == 1 else -0.4
            expected_scale = 1.7 * math.exp(-0.04) if count == 1 else 1.7
            self.assertAlmostEqual(slow["fit"]["skew"], expected_skew)
            self.close(slow["fit"]["scale"], expected_scale)
            # The same smooth multiplier continues beyond the observations.
            strain = 0.72
            raw = reference_response(strain, reference, False)[0]
            expected = expected_scale * math.exp(expected_skew * strain) * raw
            self.close(interpolate(slow["strain"], slow["pressure_pa"], strain), expected, relative=2e-5)

    def test_log_fit_residuals_and_fast_slow_ratio(self):
        reference = self.assumptions["reference_curves"]["eva35"]
        # These equally spaced log residuals leave the OLS scale and skew unchanged.
        points = []
        for strain, residual in ((0.1, 0.1), (0.35, -0.2), (0.6, 0.1)):
            pressure = 1.7 * math.exp(-0.4 * strain + residual) * reference_response(strain, reference, False)[0]
            points.append([strain, pressure])
        foam = {"density_kg_m3": 35, "reference_curve": "eva35", "anchors": points}
        slow = material_curve(foam, self.assumptions, fast=False)
        fast = material_curve(foam, self.assumptions)
        self.close(slow["fit"]["scale"], 1.7)
        self.close(slow["fit"]["skew"], -0.4)
        self.assertEqual(slow["fit"], fast["fit"])
        for observation in slow["fit"]["observations"]:
            strain = observation["strain"]
            fitted = 1.7 * math.exp(-0.4 * strain) * reference_response(strain, reference, False)[0]
            self.close(observation["fitted_pressure_pa"], fitted)
            self.close(observation["difference_percent"], 100 * (fitted / observation["supplier_pressure_pa"] - 1))
        for strain in (0.05, 0.1, 0.2, 0.35, 0.6, 0.75):
            ratio = interpolate(fast["strain"], fast["pressure_pa"], strain) / interpolate(slow["strain"], slow["pressure_pa"], strain)
            expected = reference_response(strain, reference, True)[0] / reference_response(strain, reference, False)[0]
            self.close(ratio, expected, relative=1e-4)

    def test_repeated_strain_fits_geometric_mean_pressure(self):
        foam = {"density_kg_m3": 35, "reference_curve": "eva35",
                "anchors": [[0.1, 20000], [0.1, 80000]]}
        curve = material_curve(foam, self.assumptions, fast=False)
        self.assertEqual(curve["fit"]["skew"], 0)
        for observation in curve["fit"]["observations"]:
            self.close(observation["fitted_pressure_pa"], 40000)

    def test_constrained_fit_is_monotone_for_both_loading_curves(self):
        for name, reference in self.assumptions["reference_curves"].items():
            # Unconstrained skew is -20, forcing a constrained refit in every family.
            points = [[strain, math.exp(8 - 20 * strain) * reference_response(strain, reference, False)[0]]
                      for strain in (0.1, 0.4, 0.6)]
            foam = {"density_kg_m3": 50, "reference_curve": name, "anchors": points}
            slow = material_curve(foam, self.assumptions, fast=False)
            fit = slow["fit"]
            self.assertTrue(fit["constrained"])
            mean_strain = (0.1 + 0.4 + 0.6) / 3
            self.close(math.log(fit["scale"]), 8 - (20 + fit["skew"]) * mean_strain)
            minimum_ratio = math.inf
            for fast in (False, True):
                curve = material_curve(foam, self.assumptions, fast=fast)
                self.assertEqual(curve["fit"], fit)
                self.assertTrue(all(b > a for a, b in zip(curve["pressure_pa"], curve["pressure_pa"][1:])))
                for i in range(1, 10001):
                    strain = curve["join_strain"] * i / 10000
                    pressure, slope = reference_response(strain, reference, fast)
                    self.assertGreaterEqual(slope + fit["skew"] * pressure, 0)
                    minimum_ratio = min(minimum_ratio, slope / pressure)
                self.assertGreater(slope + fit["skew"] * pressure, 0)
            # The optimum is at the slope bound, rather than simply reverting to b=0.
            self.assertAlmostEqual(fit["skew"], -minimum_ratio, delta=1e-5)

    def simulate_catalog_change(self, changes):
        with (DIRECTORY / "data" / "analytical-foams2.csv").open(newline="", encoding="utf-8") as source:
            reader = csv.DictReader(source)
            fields, entries = reader.fieldnames, list(reader)
        for entry in entries:
            if entry["foam_id"] == EV50:
                entry.update(changes)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "foams.csv"
            with path.open("w", newline="", encoding="utf-8") as destination:
                writer = csv.DictWriter(destination, fieldnames=fields)
                writer.writeheader()
                writer.writerows(entries)
            return simulate(2.597, 7.7, LAYERS, TARGET, catalog_path=path)

    def test_catalog_three_anchors_and_material_metadata(self):
        result = self.simulate_catalog_change({"firmness_p1_value": "20", "firmness_p1_at_pct": "10",
                                              "firmness_p2_value": "65", "firmness_p2_at_pct": "35",
                                              "firmness_p3_value": "175", "firmness_p3_at_pct": "65"})
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["foams"][1]["anchors"], [[0.1, 20000], [0.35, 65000], [0.65, 175000]])
        self.assertEqual(result["foams"][1]["firmness_units"], "kPa")
        self.assertEqual(result["foams"][1]["subtype"], "closed-cell crosslinked ethylene vinyl acetate copolymer")
        self.assertNotIn("firmness_test", result["foams"][1])
        self.assertTrue(all("slow" not in curve for curve in result["curves"]))
        self.close(result["checks"]["integrated_force_n_s"], 2.597 * 7.7, relative=1e-4)

    def test_partial_anchor_pair_is_incomplete_data(self):
        result = self.simulate_catalog_change({"firmness_p3_value": "175"})
        self.assertEqual(result["reason"], "incomplete data")
        self.assertIn("firmness_p3_at_pct", result["errors"][0]["missing_fields"])

    def test_tail_conflict_is_explicit_and_join_anchor_is_supported(self):
        at_join = self.simulate_catalog_change({"firmness_p3_value": "400", "firmness_p3_at_pct": "80"})
        self.assertEqual(at_join["status"], "complete")
        conflict = self.simulate_catalog_change({"firmness_p3_value": "400", "firmness_p3_at_pct": "81"})
        self.assertEqual(conflict["status"], "error")
        self.assertEqual(conflict["foam_id"], EV50)
        self.assertIn("81%", conflict["message"])
        self.assertIn("tail start at 80%", conflict["message"])

    def test_observations_are_sorted_and_can_repeat_or_decrease(self):
        reordered = self.simulate_catalog_change({"firmness_p1_value": "116", "firmness_p1_at_pct": "50",
                                                 "firmness_p2_value": "50", "firmness_p2_at_pct": "25"})
        self.close(reordered["metrics"]["peak_force_n"], self.result["metrics"]["peak_force_n"])
        for changes in ({"firmness_p2_at_pct": "25"}, {"firmness_p2_value": "40"}):
            result = self.simulate_catalog_change(changes)
            self.assertEqual(result["status"], "complete")
        for changes in ({"firmness_p2_at_pct": "0"}, {"firmness_p2_value": "0"}):
            result = self.simulate_catalog_change(changes)
            self.assertEqual(result["reason"], "invalid anchors")

    def test_each_family_tail_matches_calibrated_pressure_and_slope(self):
        for reference_name, reference in self.assumptions["reference_curves"].items():
            points = [[strain, 1.7 * math.exp(0.4 * strain) * reference_response(strain, reference, False)[0]]
                      for strain in (0.25, 0.5)]
            foam = {"density_kg_m3": 50, "reference_curve": reference_name, "anchors": points}
            for fast in (False, True):
                with self.subTest(reference=reference_name, fast=fast):
                    curve = material_curve(foam, self.assumptions, fast=fast)
                    join, cap = curve["join_strain"], curve["cap_strain"]
                    pressure, slope = reference_response(join, reference, fast)
                    multiplier = 1.7 * math.exp(0.4 * join)
                    slope = multiplier * (slope + 0.4 * pressure)
                    pressure *= multiplier
                    index = curve["strain"].index(join)
                    self.close(curve["pressure_pa"][index], pressure)
                    strain = curve["strain"][index + 1]
                    expected = pressure + slope * (cap - join) / 2 * (((cap - join) / (cap - strain))**2 - 1)
                    self.close(curve["pressure_pa"][index + 1], expected)
                    self.close(cap, 1 - 50 / reference["solid_density_kg_m3"])
                    self.assertTrue(all(b > a for a, b in zip(curve["pressure_pa"], curve["pressure_pa"][1:])))

    def test_linear_column_against_analytic_dome_contact(self):
        stiffness = 1e7  # Pressure per metre of local shortening.
        thickness = 0.1
        foams = [{"thickness_mm": 100}]
        column = {"pressure_pa": [0, stiffness * thickness], "shortening_m": [0, thickness],
                  "strain": [[0, 1]], "work_j_m2": [[0, stiffness * thickness**2 / 2]]}
        prepare_integrals(column, foams)
        for advance in (0.0001, 0.004, 0.008, 0.03):
            state = contact_state(advance, column, foams, self.assumptions)
            radius = 0.1
            gap = min(advance, radius - math.sqrt(radius**2 - 0.04**2))
            exact_force = 2 * math.pi * stiffness * (radius * advance * gap
                            - (radius + advance) * gap**2 / 2 + gap**3 / 3)
            exact_work = math.pi * stiffness * (radius * advance**2 * gap
                           - (advance**2 + 2 * radius * advance) * gap**2 / 2
                           + (2 * advance + radius) * gap**3 / 3 - gap**4 / 4)
            self.close(state["force_n"], exact_force, relative=1e-10)
            self.close(state["foam_work_j"][0], exact_work, relative=1e-10)
            self.close(state["hand_work_j"], state["force_n"]**2 / (2 * 1e6))

    def test_force_is_derivative_of_foam_work(self):
        foams = self.result["foams"]
        curves = [material_curve(foam, self.assumptions) for foam in foams]
        column = prepare_column(foams, curves)
        for advance in (0.002, 0.02, 0.07, 0.082):
            step = 1e-8
            left = contact_state(advance - step, column, foams, self.assumptions)
            right = contact_state(advance + step, column, foams, self.assumptions)
            center = contact_state(advance, column, foams, self.assumptions)
            derivative = (sum(right["foam_work_j"]) - sum(left["foam_work_j"])) / (2 * step)
            self.close(center["force_n"], derivative, relative=1e-6)

    def test_layer_order_and_split_layer_invariance(self):
        reversed_result = simulate(2.597, 7.7, list(reversed(LAYERS)), TARGET)
        split_layers = [{"layer": 1, "foam_id": HD36, "thickness_mm": 10},
                        {"layer": 2, "foam_id": HD36, "thickness_mm": 10}, dict(LAYERS[1], layer=3)]
        split_result = simulate(2.597, 7.7, split_layers, TARGET)
        for result in (reversed_result, split_result):
            for key in ("peak_force_n", "time_to_peak_s", "maximum_glove_compression_mm", "foam_sample_weight_g"):
                self.close(result["metrics"][key], self.result["metrics"][key])

    def test_equal_energy_preserves_force_and_changes_time(self):
        heavier = simulate(2.597 * 4, 7.7 / 2, LAYERS, TARGET)
        self.close(heavier["metrics"]["peak_force_n"], self.result["metrics"]["peak_force_n"])
        self.close(heavier["metrics"]["time_to_peak_s"], 2 * self.result["metrics"]["time_to_peak_s"])
        self.close(heavier["metrics"]["loading_rate_10_90_n_s"], self.result["metrics"]["loading_rate_10_90_n_s"] / 2)

    def test_catalog_density_and_arbitrary_integer_thickness(self):
        layers = [{"layer": 7, "foam_id": "foamonline-high-resilience-medium", "thickness_mm": 17}]
        result = simulate(2.597, 7.7, layers, {"foam_id": EV50, "thickness_mm": 31})
        self.assertEqual(result["status"], "complete")
        self.close(result["foams"][0]["density_kg_m3"], 44.050774)
        self.assertEqual(result["foams"][0]["reference_curve"], "hr40")
        self.assertEqual(result["foams"][0]["thickness_mm"], 17)
        self.assertEqual(result["metrics"]["components"][0]["layer"], 7)

    def test_missing_selected_data_returns_reason_for_glove_and_target(self):
        for field in ("firmness_p1_value", "density_kg_m3"):
            result = self.simulate_catalog_change({field: ""})
            self.assertEqual(result["status"], "error")
            self.assertEqual(result["reason"], "incomplete data")
            self.assertEqual({error["role"] for error in result["errors"]}, {"glove", "target"})
            for error in result["errors"]:
                self.assertIn(field, error["missing_fields"])
                self.assertEqual(error["foam_id"], EV50)

    def test_newtons_at_40_percent_and_lbf_at_60_percent(self):
        layers = [{"layer": 1, "foam_id": "cutfoam-h35-200", "thickness_mm": 20},
                  {"layer": 2, "foam_id": "foam-factory-dryfast", "thickness_mm": 20}]
        result = simulate(2.597, 7.7, layers, TARGET)
        self.assertEqual(result["status"], "complete")
        force_factor = self.assumptions["pound_force_n"]
        area = self.assumptions["indenter_area_m2"]
        expected = [[[0.4, 200 / area]], [[0.25, 60 * force_factor / area], [0.6, 105 * force_factor / area]]]
        for foam, anchors in zip(result["foams"], expected):
            self.assertEqual(len(foam["anchors"]), len(anchors))
            for actual, wanted in zip(foam["anchors"], anchors):
                self.assertEqual(actual[0], wanted[0])
                self.close(actual[1], wanted[1])
            slow = material_curve(foam, self.assumptions, fast=False)
            for strain, pressure in anchors:
                self.close(interpolate(slow["strain"], slow["pressure_pa"], strain), pressure)

    def test_numerical_limit_does_not_report_a_peak(self):
        assumptions = copy.deepcopy(self.assumptions)
        assumptions["numerics"]["maximum_pressure_pa"] = 1000
        result = simulate(2.597, 7.7, LAYERS, TARGET, assumptions=assumptions)
        self.assertEqual(result["status"], "incomplete")
        for key in ("peak_force_n", "time_to_peak_s", "loading_rate_10_90_n_s", "components"):
            self.assertIsNone(result["metrics"][key])
        self.assertGreater(result["reached"]["speed_m_s"], 0)
        self.assertGreater(result["reached"]["force_n"], 0)
        self.assertAlmostEqual(result["checks"]["energy_residual_j"], 0, places=10)

    def test_early_peak_and_short_window(self):
        result = simulate(2.597 / 10000, 7.7 * 100, LAYERS, TARGET)
        metrics = result["metrics"]
        self.assertIsNone(metrics["peak_loading_rate_n_s"])
        self.assertIsNone(metrics["force_at_early_time_n"])
        self.assertIsNone(metrics["force_at_5ms_n"])
        self.assertIsNone(metrics["kinetic_energy_at_early_time_j"])
        self.assertTrue(metrics["peak_before_early_time"])
        self.close(metrics["early_force_percent_of_peak"], 100)
        self.close(metrics["early_sample_time_s"], metrics["time_to_peak_s"])

    def test_force_at_5ms_uses_only_the_reached_loading_trace(self):
        rows = [{"time_s": 0, "force_n": 0},
                {"time_s": 0.004, "force_n": 100},
                {"time_s": 0.006, "force_n": 200}]
        def metrics(trace):
            return summarize(trace, self.result["foams"], [], self.assumptions, 77, False)
        self.close(metrics(rows)["force_at_5ms_n"], 150)
        self.assertIsNone(metrics(rows[:2])["force_at_5ms_n"])
        at_five = rows[:2] + [{"time_s": 0.005, "force_n": 150}]
        self.close(metrics(at_five)["force_at_5ms_n"], 150)
        self.assertIsNone(metrics(rows)["peak_force_n"])

    def test_window_rate_includes_shifted_knots(self):
        # Best window ends at the last steep-rise knot; its start is not a knot.
        times = [0, 0.001, 0.0012, 0.002]
        forces = [0, 1, 101, 101]
        self.close(peak_window_rate(times, forces, 0.0005), 200600)
        self.assertIsNone(peak_window_rate([0, 0.0001], [0, 10], 0.0005))

    def test_resolution_convergence(self):
        assumptions = copy.deepcopy(self.assumptions)
        for key in ("curve_steps", "tail_steps", "trajectory_steps"):
            assumptions["numerics"][key] *= 2
        refined = simulate(2.597, 7.7, LAYERS, TARGET, assumptions=assumptions)
        for key in ("peak_force_n", "time_to_peak_s", "loading_rate_10_90_n_s", "peak_loading_rate_n_s",
                    "maximum_glove_compression_mm", "force_at_5ms_n"):
            with self.subTest(metric=key):
                self.close(self.result["metrics"][key], refined["metrics"][key], relative=0.002)
        self.close(refined["checks"]["integrated_force_n_s"], 2.597 * 7.7, relative=1e-4)

    def test_thin_layers_resolve_sharp_centre_pressure(self):
        layers = [{"layer": 1, "foam_id": "foam-factory-super-soft", "thickness_mm": 7}]
        target = {"foam_id": "evazote-va35", "thickness_mm": 7}
        result = simulate(2.597, 7.7, layers, target)
        self.assertEqual(result["status"], "complete")
        self.assertGreater(result["reached"]["center_pressure_pa"], 1e8)
        self.close(result["checks"]["integrated_force_n_s"], 2.597 * 7.7, relative=1e-4)
        settings = copy.deepcopy(self.assumptions)
        settings["numerics"]["tail_steps"] *= 2
        refined = simulate(2.597, 7.7, layers, target, assumptions=settings)
        self.close(result["metrics"]["peak_force_n"], refined["metrics"]["peak_force_n"], relative=0.002)

    def test_catalog_declarations_and_all_complete_profiles(self):
        with (DIRECTORY / "data" / "analytical-foams2.csv").open(newline="", encoding="utf-8") as source:
            entries = list(csv.DictReader(source))
        settings = copy.deepcopy(self.assumptions)
        settings["numerics"]["trajectory_steps"] = 120
        for entry in entries:
            with self.subTest(foam=entry["materials"]):
                reference = self.assumptions["reference_curves"][entry["reference_curve"]]
                self.assertEqual(reference["family"], entry["family"])
                result = simulate(2.597, 7.7, [{"layer": 1, "foam_id": entry["foam_id"], "thickness_mm": 40}],
                                  TARGET, assumptions=settings)
                self.assertEqual(result["status"], "complete", result.get("message"))
                self.assertGreater(result["metrics"]["peak_force_n"], 0)
                json.dumps(result, allow_nan=False)


if __name__ == "__main__":
    unittest.main()
