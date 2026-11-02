"""Refresh the standalone dashboard's bundled logs (standard library only)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
files = [{"name": path.name, "text": path.read_text(encoding="utf-8-sig")}
         for path in sorted((ROOT / "Logs").glob("*.csv"))]
# JavaScript bundle also works when index.html is opened directly with file://.
payload = json.dumps(files, ensure_ascii=True).replace("<", "\\u003c")
(ROOT / "docs" / "data.js").write_text(
    "window.BUNDLED_LOGS = " + payload + ";\n", encoding="utf-8")
print(f"Bundled {len(files)} log files")
