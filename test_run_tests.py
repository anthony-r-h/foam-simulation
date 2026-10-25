"""Checks for catalog coverage and sequential/parallel sweep output."""

import copy
from concurrent.futures.process import BrokenProcessPool
import csv
import hashlib
import io
from itertools import islice
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import run_tests


def terminate_worker(layers, **kwargs):
    os._exit(31)


class SweepTests(unittest.TestCase):
    def test_full_catalog_and_layer_families(self):
        with (run_tests.DIRECTORY / "data" / "analytical-foams2.csv").open() as source:
            catalog = {row["foam_id"]: row for row in csv.DictReader(source)}
        ids = [foam for family in run_tests.FOAM_FAMILIES.values() for foam in family]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(ids), set(catalog))
        for family, foams in run_tests.FOAM_FAMILIES.items():
            for foam in foams:
                expected = "HR" if catalog[foam]["reference_curve"] == "hr40" else catalog[foam]["family"]
                self.assertEqual(family, expected)
        self.assertEqual(run_tests.TESTS["layers"][0]["families"], ["PU", "HR", "Latex"])
        self.assertEqual(run_tests.TESTS["layers"][1]["families"], ["PU", "HR", "EVA", "Latex"])

    def test_declared_exclusions_filter_the_run_without_changing_catalog(self):
        tests = copy.deepcopy(run_tests.TESTS)
        candidates = [
            ["cutfoam-df-soft", "foam-factory-hd36-hq"],
            ["foamonline-qualux-medium", "foamonline-high-resilience-medium"],
            ["evazote-ev50"],
            ["foam-factory-super-soft"],
        ]
        for layer, ids, thickness in zip(tests["layers"], candidates, [5, 39, 3, 3]):
            layer["foam_ids"] = ids
            if layer["role"] != "main_padding":
                layer["thicknesses_mm"] = [thickness]
        compositions = list(run_tests.generate_compositions(tests))
        self.assertEqual(len(compositions), 1)
        self.assertEqual([layer["foam_id"] for layer in compositions[0]],
                         [ids[-1] for ids in candidates])
        self.assertIn("cutfoam-df-soft", run_tests.FOAM_FAMILIES["PU"])
        self.assertIn("foamonline-qualux-medium", run_tests.FOAM_FAMILIES["HR"])
        tests["excluded_foam_ids"] = []
        self.assertEqual(len(list(run_tests.generate_compositions(tests))), 4)

    def test_main_cushion_fills_remainder_for_all_thickness_choices(self):
        tests = copy.deepcopy(run_tests.TESTS)
        for layer, foam in zip(tests["layers"], ["foam-factory-hd36-hq",
                              "foamonline-high-resilience-medium", "cutfoam-eva75",
                              "foam-factory-super-soft"]):
            layer["foam_ids"] = [foam]
        self.assertNotIn("thicknesses_mm", tests["layers"][1])
        compositions = list(run_tests.generate_compositions(tests))
        self.assertEqual(len(compositions), 45)
        self.assertEqual(sum(layers[0]["thickness_mm"] == 25 for layers in compositions), 9)
        main = [layers[1]["thickness_mm"] for layers in compositions]
        self.assertEqual((min(main), max(main)), (15, 39))
        for layers in compositions:
            self.assertEqual(sum(layer["thickness_mm"] for layer in layers), 50)

    def test_parallel_csv_matches_sequential_with_custom_inputs(self):
        tests = copy.deepcopy(run_tests.TESTS)
        tests["speed_m_s"] = 5.0
        tests["target"]["thickness_mm"] = 25
        compositions = list(islice(run_tests.generate_compositions(tests), 20))
        with tempfile.TemporaryDirectory() as directory:
            serial = Path(directory) / "nested" / "serial.csv"
            parallel = Path(directory) / "parallel.csv"
            run_tests.run(serial, iter(compositions), tests, workers=1)
            run_tests.run(parallel, iter(compositions), tests, workers=2)
            self.assertEqual(serial.read_bytes(), parallel.read_bytes())
            with parallel.open() as source:
                rows = list(csv.DictReader(source))
            self.assertEqual(len(rows), len(compositions))
            self.assertTrue(all(row["status"] == "complete" for row in rows))
            self.assertTrue(all(float(row["speed_m_s"]) == 5.0 for row in rows))
            self.assertTrue(all(0 < float(row["force_at_5ms_n"]) <= float(row["peak_force_n"])
                                for row in rows))

    def test_worker_error_reaches_caller(self):
        layers = next(run_tests.generate_compositions())
        layers[0]["foam_id"] = "missing-foam"
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(KeyError):
                run_tests.run(Path(directory) / "error.csv", [layers], workers=2)

    def test_invalid_worker_count_does_not_overwrite_output(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "existing.csv"
            output.write_text("existing results")
            with self.assertRaises(ValueError):
                run_tests.run(output, workers=0)
            self.assertEqual(output.read_text(), "existing results")


class RecoveryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.directory.cleanup)
        cls.layers = list(islice(run_tests.generate_compositions(), 40))
        path = Path(cls.directory.name) / "baseline.csv"
        run_tests.run(path, cls.layers)
        cls.baseline = path.read_bytes()
        cls.lines = cls.baseline.splitlines(keepends=True)
        cls.checkpoint = json.loads(Path(str(path) + ".checkpoint.json").read_text())
        rows = list(csv.DictReader(io.StringIO(cls.baseline.decode())))
        cls.rows = {cls.key(layers): row for layers, row in zip(cls.layers, rows)}

    @staticmethod
    def key(layers):
        return tuple((layer["foam_id"], layer["thickness_mm"]) for layer in layers)

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.output = Path(self.directory.name) / "results.csv"
        self.metadata = Path(str(self.output) + ".checkpoint.json")

    def save_prefix(self, count):
        data = b"".join(self.lines[:count + 1])
        self.output.write_bytes(data)
        checkpoint = {**self.checkpoint, "rows": count, "offset": len(data),
                      "sha256": hashlib.sha256(data).hexdigest()}
        self.metadata.write_text(json.dumps(checkpoint))

    def saved_row(self, layers, **kwargs):
        return self.rows[self.key(layers)]

    def test_resume_keeps_complete_uncheckpointed_rows_and_discards_partial_tail(self):
        self.save_prefix(3)
        with self.output.open("ab") as output:
            output.write(b"".join(self.lines[4:6]))
            output.write(self.lines[6][:80])
        with patch.object(run_tests, "simulate_composition", side_effect=self.saved_row) as simulation:
            run_tests.run(self.output, self.layers, resume=True)
        self.assertEqual(simulation.call_count, 35)
        self.assertEqual(self.output.read_bytes(), self.baseline)
        self.assertEqual(json.loads(self.metadata.read_text())["rows"], 40)

    def test_completed_run_does_not_repeat_results(self):
        self.save_prefix(40)
        with patch.object(run_tests, "simulate_composition", side_effect=AssertionError("Already completed")):
            run_tests.run(self.output, self.layers, workers=2, resume=True)
        self.assertEqual(self.output.read_bytes(), self.baseline)

    def test_unfinished_quoted_utf8_or_unterminated_record_is_recomputed(self):
        for tail in (b'"unfinished\n', b'\xe2\x82', self.lines[4][:-2]):
            with self.subTest(tail=tail[:20]):
                self.save_prefix(3)
                with self.output.open("ab") as output:
                    output.write(tail)
                with patch.object(run_tests, "simulate_composition", side_effect=self.saved_row) as simulation:
                    run_tests.run(self.output, self.layers, resume=True)
                self.assertEqual(simulation.call_count, 37)
                self.assertEqual(self.output.read_bytes(), self.baseline)

    def test_complete_malformed_record_is_not_silently_removed(self):
        self.save_prefix(3)
        with self.output.open("ab") as output:
            output.write(b"bad,complete,record\r\n")
        before = self.output.read_bytes(), self.metadata.read_bytes()
        with self.assertRaisesRegex(ValueError, "field count"):
            run_tests.run(self.output, self.layers, resume=True)
        self.assertEqual((self.output.read_bytes(), self.metadata.read_bytes()), before)

    def test_multiline_error_result_is_kept_without_retry(self):
        self.save_prefix(3)
        row = dict(self.rows[self.key(self.layers[3])])
        row.update(status="error", reason="first line\nsecond line, \"quoted\" \u00e9")
        buffer = io.StringIO(newline="")
        csv.DictWriter(buffer, fieldnames=run_tests.fieldnames()).writerow(row)
        data = buffer.getvalue().encode()
        with self.output.open("ab") as output:
            output.write(data)
        with patch.object(run_tests, "simulate_composition", side_effect=self.saved_row) as simulation:
            run_tests.run(self.output, self.layers, resume=True)
        self.assertEqual(simulation.call_count, 36)
        self.assertEqual(self.output.read_bytes(), b"".join(self.lines[:4]) + data + b"".join(self.lines[5:]))

    def test_checkpoint_replace_failure_retains_old_checkpoint_and_recovers_new_rows(self):
        self.save_prefix(3)
        original = run_tests.os.replace
        calls = 0

        def fail_after_batch(source, destination):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("Injected checkpoint failure")
            return original(source, destination)

        with patch.object(run_tests.os, "replace", side_effect=fail_after_batch):
            with patch.object(run_tests, "simulate_composition", side_effect=self.saved_row):
                with self.assertRaisesRegex(OSError, "Injected"):
                    run_tests.run(self.output, self.layers, resume=True)
        self.assertEqual(json.loads(self.metadata.read_text())["rows"], 3)
        self.assertEqual(len(self.output.read_bytes().splitlines()), 20)
        with patch.object(run_tests, "simulate_composition", side_effect=self.saved_row) as simulation:
            run_tests.run(self.output, self.layers, resume=True)
        self.assertEqual(simulation.call_count, 21)
        self.assertEqual(self.output.read_bytes(), self.baseline)

    def test_new_run_refuses_to_overwrite_results(self):
        self.save_prefix(3)
        before = self.output.read_bytes(), self.metadata.read_bytes()
        with self.assertRaises(FileExistsError):
            run_tests.run(self.output, self.layers)
        self.assertEqual((self.output.read_bytes(), self.metadata.read_bytes()), before)

    def test_resume_rejects_missing_metadata(self):
        self.output.write_bytes(self.baseline)
        with self.assertRaisesRegex(ValueError, "checkpoint"):
            run_tests.run(self.output, self.layers, resume=True)
        self.assertEqual(self.output.read_bytes(), self.baseline)

    def test_changed_test_settings_are_rejected_before_writing(self):
        self.save_prefix(3)
        before = self.output.read_bytes(), self.metadata.read_bytes()
        tests = copy.deepcopy(run_tests.TESTS)
        tests["speed_m_s"] += 1
        with self.assertRaisesRegex(ValueError, "changed"):
            run_tests.run(self.output, self.layers, tests=tests, resume=True)
        self.assertEqual((self.output.read_bytes(), self.metadata.read_bytes()), before)

    def test_changed_catalog_assumptions_and_code_are_rejected(self):
        self.save_prefix(3)
        before = self.output.read_bytes(), self.metadata.read_bytes()
        source_directory = Path(self.directory.name) / "inputs"
        (source_directory / "data").mkdir(parents=True)
        files = run_tests.capture_inputs(run_tests.TESTS)[1]
        paths = {name: source_directory / "data" / name if name.endswith(".csv")
                 else source_directory / name for name in files}
        for name, data in files.items():
            paths[name].write_bytes(data)
        with patch.object(run_tests, "DIRECTORY", source_directory):
            for name, data in files.items():
                with self.subTest(file=name):
                    paths[name].write_bytes(data + b"\n")
                    with self.assertRaisesRegex(ValueError, "changed"):
                        run_tests.run(self.output, self.layers, resume=True)
                    self.assertEqual((self.output.read_bytes(), self.metadata.read_bytes()), before)
                    paths[name].write_bytes(data)

    def test_corrupt_completed_result_is_rejected_without_truncation(self):
        self.save_prefix(3)
        data = self.output.read_bytes().replace(b"complete", b"incomplete", 1)
        self.output.write_bytes(data)
        with self.assertRaisesRegex(ValueError, "checkpoint"):
            run_tests.run(self.output, self.layers, resume=True)
        self.assertEqual(self.output.read_bytes(), data)

    def test_wrong_composition_order_is_rejected(self):
        self.save_prefix(3)
        data = self.output.read_bytes()
        layers = [self.layers[1], self.layers[0], *self.layers[2:]]
        with self.assertRaisesRegex(ValueError, "requested grid"):
            run_tests.run(self.output, layers, resume=True)
        self.assertEqual(self.output.read_bytes(), data)

    def test_truncated_checkpointed_output_is_rejected(self):
        self.save_prefix(3)
        data = self.output.read_bytes()[:-20]
        self.output.write_bytes(data)
        with self.assertRaisesRegex(ValueError, "checkpoint"):
            run_tests.run(self.output, self.layers, resume=True)
        self.assertEqual(self.output.read_bytes(), data)

    def test_unfinished_initial_header_can_be_recovered(self):
        for initial in (None, b"mass_kg,spe"):
            with self.subTest(initial=initial):
                if initial is None:
                    self.output.unlink(missing_ok=True)
                else:
                    self.output.write_bytes(initial)
                checkpoint = {**self.checkpoint, "rows": 0, "offset": 0,
                              "sha256": hashlib.sha256().hexdigest()}
                self.metadata.write_text(json.dumps(checkpoint))
                with patch.object(run_tests, "simulate_composition", side_effect=self.saved_row):
                    run_tests.run(self.output, self.layers, resume=True)
                self.assertEqual(self.output.read_bytes(), self.baseline)

    def test_snapshot_is_used_and_source_edits_stop_before_committing_batch(self):
        source_directory = Path(self.directory.name) / "inputs"
        (source_directory / "data").mkdir(parents=True)
        files = run_tests.capture_inputs(run_tests.TESTS)[1]
        paths = {name: source_directory / "data" / name if name.endswith(".csv")
                 else source_directory / name for name in files}
        for name, data in files.items():
            paths[name].write_bytes(data)

        def edit_source(layers, **kwargs):
            self.assertNotEqual(kwargs["catalog_path"].parent, source_directory / "data")
            self.assertEqual(kwargs["catalog_path"].read_bytes(), files["analytical-foams2.csv"])
            self.assertEqual(kwargs["assumptions"], run_tests.load_assumptions())
            (source_directory / "data" / "analytical-foams2.csv").write_bytes(b"changed")
            return self.saved_row(layers)

        with patch.object(run_tests, "DIRECTORY", source_directory):
            with patch.object(run_tests, "simulate_composition", side_effect=edit_source):
                with self.assertRaisesRegex(ValueError, "changed during execution"):
                    run_tests.run(self.output, self.layers)
        self.assertEqual(self.output.read_bytes(), self.lines[0])
        self.assertEqual(json.loads(self.metadata.read_text())["rows"], 0)

    def test_second_process_cannot_open_locked_output_even_through_symlink(self):
        self.save_prefix(3)
        alias = Path(self.directory.name) / "alias.csv"
        alias.symlink_to(self.output)
        script = """
import sys
sys.path.insert(0, sys.argv[1])
import run_tests
try:
    run_tests.run(sys.argv[2], resume=True)
except RuntimeError as error:
    print(error)
else:
    raise AssertionError('Competing writer was allowed')
"""
        before = self.output.read_bytes(), self.metadata.read_bytes()
        with run_tests.output_lock(self.output):
            child = subprocess.run([sys.executable, "-c", script, str(run_tests.DIRECTORY), str(alias)],
                                   capture_output=True, text=True, timeout=20)
        self.assertEqual(child.returncode, 0, child.stderr)
        self.assertIn("Another runner", child.stdout)
        self.assertEqual((self.output.read_bytes(), self.metadata.read_bytes()), before)

    def test_killed_writer_releases_lock_and_resumes_without_duplicates(self):
        script = """
import csv, io, os, signal, sys
from itertools import islice
sys.path.insert(0, sys.argv[1])
import run_tests
original = run_tests.write_csv_rows
calls = 0
def interrupted_write(output, rows, digest, header=False):
    global calls
    calls += 1
    if calls == 3:
        buffer = io.StringIO(newline='')
        writer = csv.DictWriter(buffer, fieldnames=run_tests.fieldnames())
        writer.writerow(rows[0])
        output.write(buffer.getvalue().encode()[:80])
        output.flush()
        os.fsync(output.fileno())
        os.kill(os.getpid(), signal.SIGKILL)
    original(output, rows, digest, header)
run_tests.write_csv_rows = interrupted_write
run_tests.run(sys.argv[2], list(islice(run_tests.generate_compositions(), 40)))
"""
        child = subprocess.run([sys.executable, "-c", script, str(run_tests.DIRECTORY), str(self.output)],
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, -signal.SIGKILL, child.stderr)
        self.assertEqual(json.loads(self.metadata.read_text())["rows"], 16)
        run_tests.run(self.output, self.layers, workers=2, resume=True)
        self.assertEqual(self.output.read_bytes(), self.baseline)

    def test_dead_worker_leaves_saved_results_resumable(self):
        self.save_prefix(3)
        with patch.object(run_tests, "simulate_composition", terminate_worker):
            with self.assertRaises(BrokenProcessPool):
                run_tests.run(self.output, self.layers, workers=2, resume=True)
        self.assertEqual(self.output.read_bytes(), b"".join(self.lines[:4]))
        run_tests.run(self.output, self.layers, workers=2, resume=True)
        self.assertEqual(self.output.read_bytes(), self.baseline)


if __name__ == "__main__":
    unittest.main()
