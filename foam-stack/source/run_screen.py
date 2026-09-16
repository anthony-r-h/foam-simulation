from pathlib import Path
import json, subprocess
p = Path(__file__).resolve().parent
for total in (35, 40, 45):
    subprocess.run(["node", str(p / "screen_v12.cjs"), str(total)], check=True)
chunks = [json.loads((p / f"screen_v12_{t}.json").read_text(encoding="utf-8")) for t in (35, 40, 45)]
meta = dict(chunks[0]["meta"])
for key in ("candidateCount", "thicknessDistributions", "impactCases", "elapsedSeconds"):
    meta[key] = sum(c["meta"][key] for c in chunks)
rows = [r for c in chunks for r in c["rows"]]
(p / "screen_v12.json").write_text(json.dumps({"meta": meta, "rows": rows}, separators=(",", ":")), encoding="utf-8", newline="\n")
subprocess.run(["node", str(p / "select_presets.cjs")], check=True)
