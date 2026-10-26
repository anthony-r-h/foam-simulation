"""Serve the foam UI and expose the simulation locally."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
sys.path.insert(0, str(ROOT))

from simulation import simulate


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


class FoamHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def send_json(self, payload, status=200):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/simulate":
            self.send_json({"message": "Unknown endpoint."}, 404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 65536:
                raise ValueError("The simulation request is empty or too large.")
            request = json.loads(self.rfile.read(length))
            result = simulate(
                mass_kg=request["mass_kg"],
                speed_m_s=request["speed_m_s"],
                layers=request["layers"],
                target=request["target"],
            )
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
            self.send_json({"message": str(error)}, 400)
            return

        self.send_json(frontend_result(result))


if __name__ == "__main__":
    port = int(os.environ.get("FOAM_PORT", "8080"))
    server = ThreadingHTTPServer(("127.0.0.1", port), FoamHandler)
    print(f"Foam UI: http://localhost:{port}/simulator.html")
    server.serve_forever()
