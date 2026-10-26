"""Parity checks for the browser port of the Python simulation."""

import csv
import json
import math
from pathlib import Path
import subprocess
import unittest

from simulation import load_assumptions, simulate


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "analytical-foams.csv"
RUNNER = ROOT / "javascript" / "simulation-runner.mjs"
TARGET = {"foam_id": "cutfoam-eva75", "thickness_mm": 50}
PRESETS = {
    "soft": [
        ("foam-factory-dunlop-latex-29-ild", 20),
        ("foamonline-high-resilience-very-soft", 20),
        ("evazote-ev50", 5),
        ("foam-factory-super-soft", 5),
    ],
    "medium": [
        ("foam-factory-dunlop-latex-29-ild", 20),
        ("foamonline-high-resilience-medium-firm", 20),
        ("cutfoam-eva75", 5),
        ("foam-factory-super-soft", 5),
    ],
    "hard": [
        ("foam-factory-dunlop-latex-29-ild", 20),
        ("foamonline-high-resilience-extra-firm", 20),
        ("cutfoam-eva240", 5),
        ("foam-factory-super-soft", 5),
    ],
}
ENERGIES = (5, 20, 45, None, 121, 200)


def frontend_result(result):
    trace = result.get("trace") or []
    step = max(1, len(trace) // 250)
    rows = trace[::step]
    if trace and rows[-1] is not trace[-1]:
        rows.append(trace[-1])
    return {
        key: result[key]
        for key in ("status", "reason", "message", "errors", "metrics")
        if key in result
    } | {
        "trace": [
            {
                "time_s": row["time_s"],
                "force_n": row["force_n"],
                "speed_m_s": row["speed_m_s"],
                "glove_work_j": row["glove_work_j"],
                "glove_remaining_percent": row["glove_remaining_percent"],
                "layers": [
                    {"remaining_mm": layer["remaining_mm"]}
                    for layer in row["layers"]
                ],
            }
            for row in rows
        ]
    }


def browser_catalog():
    with CATALOG_PATH.open(newline="", encoding="utf-8") as source:
        rows = list(csv.DictReader(source))
    return [
        {
            "id": row["foam_id"],
            "name": json.loads(row["materials"])[0],
            "family": row["family"],
            "subtype": row["subtype"],
            "referenceCurve": row["reference_curve"],
            "densityKgM3": float(row["density_kg_m3"]),
            "firmnessUnits": row["firmness_units"],
            "firmness": [
                {
                    "value": float(row[f"firmness_p{point}_value"]),
                    "compressionPercent": float(row[f"firmness_p{point}_at_pct"]),
                }
                for point in (1, 2, 3)
                if row[f"firmness_p{point}_value"]
            ],
        }
        for row in rows
    ]


def requests():
    mass = 2.597
    cases = []
    for preset in PRESETS.values():
        layers = [
            {"layer": index, "foam_id": foam_id, "thickness_mm": thickness}
            for index, (foam_id, thickness) in enumerate(preset, 1)
        ]
        for energy in ENERGIES:
            speed = 7.7 if energy is None else math.sqrt(2 * energy / mass)
            cases.append({"mass_kg": mass, "speed_m_s": speed, "layers": layers, "target": TARGET})
    cases.extend([
        {
            "mass_kg": mass,
            "speed_m_s": 7.7,
            "layers": [
                {"layer": 1, "foam_id": "cutfoam-h35-200", "thickness_mm": 20},
                {"layer": 2, "foam_id": "foam-factory-dryfast", "thickness_mm": 20},
            ],
            "target": TARGET,
        },
        {
            "mass_kg": mass,
            "speed_m_s": 7.7,
            "layers": [
                {"layer": 1, "foam_id": "foam-factory-super-soft", "thickness_mm": 7},
            ],
            "target": {"foam_id": "evazote-va35", "thickness_mm": 7},
        },
    ])
    return cases


class FrontendSimulationParityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.requests = requests()
        payload = json.dumps({"catalog": browser_catalog(), "requests": cls.requests})
        completed = subprocess.run(
            ["node", str(RUNNER)],
            cwd=ROOT,
            input=payload,
            text=True,
            capture_output=True,
            check=True,
        )
        cls.javascript = json.loads(completed.stdout)

    def assert_equivalent(self, python, javascript, path="result"):
        if isinstance(python, dict):
            self.assertEqual(set(python), set(javascript), path)
            for key, value in python.items():
                self.assert_equivalent(value, javascript[key], f"{path}.{key}")
            return
        if isinstance(python, list):
            self.assertEqual(len(python), len(javascript), path)
            for index, value in enumerate(python):
                self.assert_equivalent(value, javascript[index], f"{path}[{index}]")
            return
        if isinstance(python, float):
            self.assertTrue(math.isclose(python, javascript, rel_tol=1e-9, abs_tol=1e-10),
                            f"{path}: Python {python!r}, JavaScript {javascript!r}")
            return
        self.assertEqual(python, javascript, path)

    def test_assumptions_match_python(self):
        self.assertEqual(load_assumptions(), self.javascript["assumptions"])

    def test_frontend_cases_match_python(self):
        for index, (request, javascript) in enumerate(zip(self.requests, self.javascript["results"])):
            with self.subTest(case=index):
                python = frontend_result(simulate(**request))
                self.assert_equivalent(python, javascript)


if __name__ == "__main__":
    unittest.main()
