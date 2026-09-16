"""Refresh calculated tables without replacing the reviewed methodology prose."""
from pathlib import Path
import json

source = Path(__file__).resolve().parent
rows = json.loads((source / "preset_selection_v12.json").read_text(encoding="utf-8"))["selection"]
names = {"soft": "Soft HR PU", "hd36": "HD36-HQ PU", "lux": "Lux-HQ PU", "qualux": "Qualux Firm PU", "latex": "Dunlop latex", "ev30": "EV30 EVA", "ev50": "EV50 EVA"}
canonical = {
    row["id"]: {
        "label": row["label"],
        "detail": {"canonicalSoft": "Latex / HR PU", "canonicalMedium": "PU / EVA", "canonicalFirm": "Latex / EVA"}[row["id"]],
        "grades": row["grades"],
        "thicknesses": row["thicknesses"],
    }
    for row in rows
}
engine_path = source / "engine.js"
engine = engine_path.read_text(encoding="utf-8")
start = engine.index(" const CANONICAL=")
end = engine.index(" function recipe", start)
engine = engine[:start] + " const CANONICAL=" + json.dumps(canonical, ensure_ascii=False) + ";\n" + engine[end:]

selection = []
sensitivity = []
for row in rows:
    layers = " + ".join(f"{h} mm {names[g]}" for g, h in zip(row["grades"], row["thicknesses"]))
    selection.append(f'<tr><td>{row["label"]}</td><td>{layers}</td><td>{row["feel10N"]:.2f} N</td><td>{row["tests"]["test10"]["forceN"]:.0f} N</td></tr>')
    values = "".join(f'<td>{point["forceN"]:.0f} N</td>' for point in row["mainOnlySensitivity"])
    sensitivity.append(f'<tr><td>{row["label"]}</td>{values}</tr>')

method_path = source / "methodology.html"
method = method_path.read_text(encoding="utf-8")
for name, table_rows in [("PRESET", selection), ("SENSITIVITY", sensitivity)]:
    opening = f"<!--{name}_ROWS_START-->"
    closing = f"<!--{name}_ROWS_END-->"
    if method.count(opening) != 1 or method.count(closing) != 1:
        raise ValueError(f"Expected one pair of {name} table markers")
    start = method.index(opening) + len(opening)
    end = method.index(closing, start)
    method = method[:start] + "\n" + "\n".join(table_rows) + "\n" + method[end:]

# Validate both source edits before writing either file.
engine_path.write_text(engine, encoding="utf-8", newline="\n")
method_path.write_text(method, encoding="utf-8", newline="\n")
print("Updated preset definitions and methodology tables; prose and LaTeX preserved.")
