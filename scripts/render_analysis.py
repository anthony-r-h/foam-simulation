"""Expand table directives in docs/ANALYSIS.md into a separate rendered file."""

import argparse
import csv
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "docs" / "ANALYSIS.md"
DEFAULT_OUTPUT = ROOT / "docs" / "ANALYSIS_rendered.md"
TABLE_DIRECTIVE = re.compile(r'^\s*\{%\s*table\s+"([^"]+)"\s*%\}\s*$')


def escape_cell(value):
    return value.replace("\\", "\\\\").replace("|", "\\|").replace("\n", "<br>")


def numeric_column(values):
    populated = [value.strip() for value in values if value.strip()]
    return bool(populated) and all(re.match(r"^[+-]?(?:\d|\.\d)", value) for value in populated)


def render_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as source:
        rows = list(csv.reader(source))
    if not rows or not rows[0]:
        raise ValueError(f"Table CSV has no header: {path}")
    width = len(rows[0])
    if any(len(row) != width for row in rows):
        raise ValueError(f"Table CSV has inconsistent row widths: {path}")

    escaped = [[escape_cell(value) for value in row] for row in rows]
    columns = list(zip(*rows[1:])) if len(rows) > 1 else [()] * width
    alignment = ["---:" if numeric_column(column) else "---" for column in columns]
    lines = [
        "| " + " | ".join(escaped[0]) + " |",
        "| " + " | ".join(alignment) + " |",
    ]
    lines.extend("| " + " | ".join(row) + " |" for row in escaped[1:])
    return "\n".join(lines)


def render_document(source_path, output_path):
    source_path = Path(source_path).resolve()
    output_path = Path(output_path).resolve()
    if source_path == output_path:
        raise ValueError("Rendered output must not overwrite the authored source")

    rendered = []
    for line in source_path.read_text(encoding="utf-8").splitlines():
        match = TABLE_DIRECTIVE.fullmatch(line)
        if not match:
            rendered.append(line)
            continue
        table_path = (source_path.parent / match.group(1)).resolve()
        if table_path.suffix.lower() != ".csv":
            raise ValueError(f"Table directive must reference a CSV file: {table_path}")
        if not table_path.is_file():
            raise FileNotFoundError(f"Missing table CSV: {table_path}")
        rendered.extend(render_csv(table_path).splitlines())

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(rendered) + "\n", encoding="utf-8")
    return output_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    print(render_document(args.source, args.output), flush=True)


if __name__ == "__main__":
    main()
