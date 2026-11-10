"""Refresh the standalone dashboard's bundled logs (standard library only)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Only these log dates are bundled and published. Add a date to include it.
DATES = ("20261030", "20261031")
files = [{"name": path.name, "text": path.read_text(encoding="utf-8-sig")}
         for date in DATES
         for path in sorted((ROOT / "Logs").glob(f"SessionLog_{date}*.csv"))]
# JavaScript bundle also works when index.html is opened directly with file://.
payload = json.dumps(files, ensure_ascii=True).replace("<", "\\u003c")
(ROOT / "docs" / "data.js").write_text(
    "window.BUNDLED_LOGS = " + payload + ";\n", encoding="utf-8")
print(f"Bundled {len(files)} log files")
