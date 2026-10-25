"""Run the editable role-based TESTS sweep and write one flat CSV row per simulation.

From the repository root:
    .venv/bin/python run_tests.py --workers 8
    .venv/bin/python run_tests.py --workers 8 --resume

New runs refuse to overwrite existing output. Keep the .checkpoint.json file
beside its CSV for recovery. The .lock file stays in place; its operating-system
lock is released when the runner exits, including after a crash.
Resume checks the saved grid and input fingerprint; worker count may change.
Saved error/incomplete simulation results are retained, not retried.

All catalog grades are available through FOAM_FAMILIES. Edit excluded_foam_ids
and the per-layer families, optional foam_ids, or thicknesses below to control the sweep.
Equivalent material/thickness compositions are deduplicated before simulation.
"""

import argparse
from concurrent.futures import ProcessPoolExecutor
from contextlib import contextmanager, nullcontext
import copy
import csv
import fcntl
from functools import partial
import hashlib
import io
from itertools import islice, product
import json
import multiprocessing
import os
from pathlib import Path
import sys
import tempfile

import yaml

from simulation import DIRECTORY, load_assumptions, simulate


def load_foam_families(catalog_path=DIRECTORY / "data" / "analytical-foams2.csv"):
    families = {"PU": [], "HR": [], "EVA": [], "Latex": []}
    with open(catalog_path, encoding="utf-8", newline="") as source:
        for foam in csv.DictReader(source):
            family = foam["family"]
            # The catalog stores HR and Qualux as PU with the HR reference curve.
            if family == "PU" and foam["reference_curve"] == "hr40":
                family = "HR"
            families[family].append(foam["foam_id"])
    return families


FOAM_FAMILIES = load_foam_families()

TESTS = {
    "mass_kg": 2.597,
    "speed_m_s": 7.7,
    "target": {"foam_id": "cutfoam-eva75", "thickness_mm": 50},
    "excluded_foam_ids": [
        # Close to the corresponding HR grades in the model inputs.
        "foamonline-qualux-medium",
        "foamonline-qualux-medium-firm",
        "foamonline-qualux-firm",
        # Set aside reticulated foams and microcellular PORON for separate review.
        "cutfoam-df-soft",
        "cutfoam-df-firm",
        "foam-factory-dryfast",
        "poron-4701-40-15250-04",
        "foamonline-conventional-extra-firm",
        "foamonline-conventional-firm",
        "foamonline-conventional-medium-firm",
        "foamonline-conventional-medium-soft",
        "foamonline-conventional-soft",
        "foamonline-charcoal-extra-firm",
        "foamonline-charcoal-light-medium-firm",
        "foamonline-blue-medium-firm",
        "foam-factory-charcoal-firm",
        "foam-factory-charcoal-regular",
    ],
    "layers": [
        # Layer 1: outside surface that first contacts the target.
        {
            "role": "outer_contact",
            "families": ["PU", "HR", "Latex"],
            "thicknesses_mm": [5, 10, 15, 20, 25],
        },
        # Layer 2: main impact padding fills the remaining thickness to 50 mm.
        {
            "role": "main_padding",
            "families": ["PU", "HR", "EVA", "Latex"],
        },
        # Layer 3: structural support backing.
        {
            "role": "support_backing",
            "families": ["EVA"],
            "foam_ids": [
                "aortha-eva-a25",
                "aortha-eva-a35",
                "aortha-eva-a50",
                "cutfoam-eva75",
                "cutfoam-eva240",
                "evazote-ev30",
                "evazote-ev50",
                "evazote-va35",
                "minicel-t380",
                "minicel-t600",
            ],
            "thicknesses_mm": [3, 4, 5],
        },
        # Layer 4: soft foam against the hand.
        {
            "role": "hand_comfort",
            "families": ["PU", "HR"],
            "foam_ids": [
                "foam-factory-super-soft",
                "foamonline-high-resilience-very-soft",
            ],
            "thicknesses_mm": [3, 4, 5],
        },
    ],
}

OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "simulations.csv"

METRIC_FIELDS = (
    "peak_force_n",
    "time_to_peak_s",
    "loading_rate_10_90_n_s",
    "peak_loading_rate_n_s",
    "loading_rate_window_s",
    "loading_impulse_n_s",
    "speed_at_peak_m_s",
    "maximum_glove_compression_mm",
    "maximum_glove_compression_percent",
    "minimum_glove_thickness_mm",
    "foam_sample_weight_g",
    "force_at_5ms_n",
    "early_time_s",
    "early_force_n",
    "early_force_percent_of_peak",
    "early_sample_time_s",
    "peak_before_early_time",
    "force_at_early_time_n",
    "kinetic_energy_at_early_time_j",
    "kinetic_energy_at_early_time_percent",
)

ENDPOINT_FIELDS = (
    "time_s",
    "force_n",
    "speed_m_s",
    "kinetic_energy_j",
    "loading_impulse_n_s",
    "dome_advance_mm",
    "mass_advance_mm",
    "contact_area_mm2",
    "center_pressure_pa",
    "glove_compression_mm",
    "glove_remaining_mm",
    "glove_remaining_percent",
    "glove_work_j",
    "total_work_j",
)

COMPONENT_FIELDS = (
    "compression_mm",
    "remaining_mm",
    "strain",
    "work_j",
    "work_share_percent",
    "beyond_reference_fit",
)


def generate_compositions(tests=TESTS):
    """Yield the first role assignment for each material/thickness composition."""
    excluded_foam_ids = set(tests.get("excluded_foam_ids", []))
    layer_foam_ids = []
    for layer in tests["layers"]:
        foam_ids = [foam_id for family in layer["families"] for foam_id in FOAM_FAMILIES[family]]
        foam_ids = [foam_id for foam_id in foam_ids if foam_id not in excluded_foam_ids]
        if "foam_ids" in layer:
            foam_ids = [foam_id for foam_id in foam_ids if foam_id in layer["foam_ids"]]
        layer_foam_ids.append(foam_ids)

    outer, _, support, comfort = tests["layers"]
    seen = set()
    for outer_mm, support_mm, comfort_mm in product(
        outer["thicknesses_mm"], support["thicknesses_mm"], comfort["thicknesses_mm"]
    ):
        main_mm = 50 - outer_mm - support_mm - comfort_mm
        if main_mm <= 0:
            raise ValueError("Outer, support, and comfort layers must leave room within 50 mm")
        thicknesses = (outer_mm, main_mm, support_mm, comfort_mm)
        for foam_ids in product(*layer_foam_ids):
            if len(set(foam_ids)) != len(foam_ids):
                continue
            signature = tuple(sorted(zip(foam_ids, thicknesses)))
            if signature in seen:
                continue
            seen.add(signature)
            yield [
                {
                    "layer": layer,
                    "role": layer_test["role"],
                    "foam_id": foam_id,
                    "thickness_mm": thickness_mm,
                }
                for layer, (layer_test, foam_id, thickness_mm) in enumerate(
                    zip(tests["layers"], foam_ids, thicknesses), start=1
                )
            ]


def composition_inputs(layers, tests):
    row = {
        "mass_kg": tests["mass_kg"],
        "speed_m_s": tests["speed_m_s"],
        "impact_energy_j": tests["mass_kg"] * tests["speed_m_s"] ** 2 / 2,
        "target_foam_id": tests["target"]["foam_id"],
        "target_thickness_mm": tests["target"]["thickness_mm"],
    }
    for layer in layers:
        prefix = f"layer_{layer['layer']}"
        row[f"{prefix}_role"] = layer["role"]
        row[f"{prefix}_foam_id"] = layer["foam_id"]
        row[f"{prefix}_thickness_mm"] = layer["thickness_mm"]
    return row


def flatten_result(layers, result, tests=TESTS):
    row = composition_inputs(layers, tests)
    row.update(status=result["status"], reason=result.get("reason"))
    metrics = result.get("metrics", {})
    for field in METRIC_FIELDS:
        row[field] = metrics.get(field)
    for field in ENDPOINT_FIELDS:
        row[f"endpoint_{field}"] = result.get("reached", {}).get(field)
    for field in ("energy_residual_j", "integrated_force_n_s", "impulse_residual_n_s"):
        row[field] = result.get("checks", {}).get(field)

    components = metrics.get("components") or []
    for number, component in enumerate(components[:4], start=1):
        for field in COMPONENT_FIELDS:
            row[f"layer_{number}_{field}"] = component.get(field)
    if len(components) >= 5:
        target = components[4]
        for field in COMPONENT_FIELDS:
            row[f"target_{field}"] = target.get(field)
    if len(components) >= 6:
        hand = components[5]
        for field in ("compression_mm", "work_j", "work_share_percent"):
            row[f"hand_{field}"] = hand.get(field)
    layer_components = components[:4]
    if len(layer_components) == 4:
        row["glove_total_work_j"] = sum(component["work_j"] for component in layer_components)
        row["glove_total_work_share_percent"] = sum(
            component["work_share_percent"] for component in layer_components
        )
    return row


def fieldnames():
    names = ["mass_kg", "speed_m_s", "impact_energy_j", "target_foam_id", "target_thickness_mm"]
    for number in range(1, 5):
        names.extend(
            (f"layer_{number}_role", f"layer_{number}_foam_id", f"layer_{number}_thickness_mm")
        )
    names.extend(("status", "reason"))
    names.extend(METRIC_FIELDS)
    names.extend(f"endpoint_{field}" for field in ENDPOINT_FIELDS)
    names.extend(("energy_residual_j", "integrated_force_n_s", "impulse_residual_n_s"))
    for number in range(1, 5):
        names.extend(f"layer_{number}_{field}" for field in COMPONENT_FIELDS)
    names.extend(f"target_{field}" for field in COMPONENT_FIELDS)
    names.extend(("hand_compression_mm", "hand_work_j", "hand_work_share_percent"))
    names.extend(("glove_total_work_j", "glove_total_work_share_percent"))
    return names


def simulate_composition(layers, tests=TESTS, assumptions=None,
                         catalog_path=DIRECTORY / "data" / "analytical-foams2.csv"):
    engine_layers = [
        {"layer": layer["layer"], "foam_id": layer["foam_id"], "thickness_mm": layer["thickness_mm"]}
        for layer in layers
    ]
    result = simulate(tests["mass_kg"], tests["speed_m_s"], engine_layers, tests["target"],
                      assumptions=assumptions, catalog_path=catalog_path)
    return flatten_result(layers, result, tests)


def capture_inputs(tests):
    files = {name: (DIRECTORY / name).read_bytes() for name in
             ("run_tests.py", "simulation.py", "assumptions.yaml")}
    files["analytical-foams2.csv"] = (DIRECTORY / "data" / "analytical-foams2.csv").read_bytes()
    fingerprint = {
        "tests": copy.deepcopy(tests),
        "families": copy.deepcopy(FOAM_FAMILIES),
        "fields": fieldnames(),
        "python": sys.version,
        "pyyaml": yaml.__version__,
        "files": {name: hashlib.sha256(data).hexdigest() for name, data in files.items()},
    }
    return fingerprint, files


@contextmanager
def output_lock(output_path):
    # Never unlink this file: replacing its inode could let two runners lock it.
    with open(str(output_path) + ".lock", "a+b") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise RuntimeError(f"Another runner is using {output_path}") from error
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def save_checkpoint(path, fingerprint, output, rows, digest):
    if output is not None:
        output.flush()
        os.fsync(output.fileno())
    checkpoint = {"version": 1, "fingerprint": fingerprint, "rows": rows,
                  "offset": output.tell() if output is not None else 0,
                  "sha256": digest.hexdigest()}
    # Flush the CSV first, then atomically publish the corresponding checkpoint.
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8") as destination:
            json.dump(checkpoint, destination, sort_keys=True)
            destination.flush()
            os.fsync(destination.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def write_csv_rows(output, rows, digest, header=False):
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=fieldnames())
    if header:
        writer.writeheader()
    writer.writerows(rows)
    data = buffer.getvalue().encode("utf-8")
    output.write(data)
    digest.update(data)


def validate_saved_rows(output, compositions, tests, checkpoint):
    """Validate the saved prefix without modifying it; return its safe end."""
    digest = hashlib.sha256()
    good_digest = digest.copy()
    good_offset = count = 0
    size = os.fstat(output.fileno()).st_size
    checkpoint_seen = checkpoint["offset"] == 0
    if checkpoint_seen and (checkpoint["rows"] != 0 or checkpoint["sha256"] != digest.hexdigest()):
        raise ValueError("Invalid initial checkpoint")
    last_line = b""
    names = fieldnames()

    def lines():
        nonlocal last_line
        for last_line in output:
            digest.update(last_line)
            yield last_line.decode("utf-8")

    reader = csv.reader(lines(), strict=True)
    while True:
        try:
            values = next(reader)
        except StopIteration:
            break
        except (csv.Error, UnicodeDecodeError) as error:
            # A crash can interrupt a UTF-8 character or a quoted CSV field.
            unfinished = not last_line.endswith(b"\n") or str(error) == "unexpected end of data"
            if output.tell() == size and good_offset >= checkpoint["offset"] and unfinished:
                break
            raise ValueError("Invalid CSV data in saved results") from error
        if not last_line.endswith(b"\n"):
            break
        if good_offset == 0:
            if values != names:
                raise ValueError("Saved CSV header does not match this run")
        else:
            if len(values) != len(names):
                raise ValueError(f"Invalid CSV field count at result row {count + 1}")
            row = dict(zip(names, values))
            layers = next(compositions, None)
            if layers is None:
                raise ValueError("Saved CSV contains more results than the requested grid")
            expected = composition_inputs(layers, tests)
            if any(row[key] != str(value) for key, value in expected.items()):
                raise ValueError(f"Saved result row {count + 1} does not match the requested grid")
            if row["status"] not in ("complete", "incomplete", "error"):
                raise ValueError(f"Invalid status at result row {count + 1}")
            count += 1
        good_offset = output.tell()
        good_digest = digest.copy()
        if good_offset == checkpoint["offset"]:
            if count != checkpoint["rows"] or digest.hexdigest() != checkpoint["sha256"]:
                raise ValueError("Saved results do not match their checkpoint")
            checkpoint_seen = True
    if not checkpoint_seen:
        raise ValueError("Saved results are shorter than or inconsistent with their checkpoint")
    return count, good_offset, good_digest


def run(output_path=OUTPUT_PATH, compositions=None, tests=TESTS, workers=1, resume=False):
    if workers < 1:
        raise ValueError("workers must be at least 1")
    output_path = Path(output_path).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    checkpoint_path = Path(str(output_path) + ".checkpoint.json")
    tests = copy.deepcopy(tests)
    if compositions is None:
        compositions = generate_compositions(tests)
    compositions = iter(compositions)
    with output_lock(output_path):
        fingerprint, files = capture_inputs(tests)
        if resume:
            if not checkpoint_path.exists():
                raise ValueError("Cannot resume without the matching .checkpoint.json file")
            checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
            if checkpoint.get("version") != 1 or checkpoint.get("fingerprint") != fingerprint:
                raise ValueError("Run inputs or model code changed; use a new output file")
            if not output_path.exists() and checkpoint["offset"] != 0:
                raise ValueError("Checkpoint exists but its results file is missing")
        else:
            if output_path.exists() or checkpoint_path.exists():
                raise FileExistsError("Output already exists; use --resume or a new --output path")
            save_checkpoint(checkpoint_path, fingerprint, None, 0, hashlib.sha256())

        mode = "r+b" if resume and output_path.exists() else "x+b"
        with open(output_path, mode) as output, tempfile.TemporaryDirectory(prefix="foam-run-") as directory:
            if resume:
                count, offset, digest = validate_saved_rows(output, compositions, tests, checkpoint)
                discarded = os.fstat(output.fileno()).st_size - offset
                output.seek(offset)
                output.truncate()
                print(f"Resuming after {count:,} saved rows; discarded {discarded:,} unfinished bytes.", flush=True)
            else:
                count, offset, digest = 0, 0, hashlib.sha256()
            if offset == 0:
                write_csv_rows(output, [], digest, header=True)
            save_checkpoint(checkpoint_path, fingerprint, output, count, digest)

            # Workers read immutable copies, so edits to source data cannot mix inputs.
            for name in ("analytical-foams2.csv", "assumptions.yaml"):
                (Path(directory) / name).write_bytes(files[name])
            simulate_row = partial(simulate_composition, tests=tests,
                                   assumptions=load_assumptions(Path(directory) / "assumptions.yaml"),
                                   catalog_path=Path(directory) / "analytical-foams2.csv")
            execute_batches(output, compositions, simulate_row, workers, checkpoint_path,
                            fingerprint, tests, count, digest)


def execute_batches(output, compositions, simulate_row, workers, checkpoint_path,
                    fingerprint, tests, count, digest):
    # Spawn avoids inheriting the parent's output file or its lock in workers.
    pool_context = (ProcessPoolExecutor(max_workers=workers, mp_context=multiprocessing.get_context("spawn"))
                    if workers > 1 else nullcontext(None))
    with pool_context as pool:
        while batch := list(islice(compositions, workers * 16)):
            if capture_inputs(tests)[0] != fingerprint:
                raise ValueError("Run inputs or model code changed during execution")
            rows = list(pool.map(simulate_row, batch, chunksize=8) if pool else map(simulate_row, batch))
            if capture_inputs(tests)[0] != fingerprint:
                raise ValueError("Run inputs or model code changed during execution")
            write_csv_rows(output, rows, digest)
            count += len(rows)
            save_checkpoint(checkpoint_path, fingerprint, output, count, digest)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=min(8, os.cpu_count() or 1),
                        help="worker processes (default: up to 8; use 1 for sequential)")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--resume", action="store_true", help="validate saved results and continue this run")
    args = parser.parse_args()
    if args.workers < 1:
        parser.error("--workers must be at least 1")
    run(output_path=args.output, workers=args.workers, resume=args.resume)
