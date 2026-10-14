import os
import json
from collections import Counter
from pathlib import Path

d = json.loads((Path(os.environ["MNL_SENSITIVE_DATA_DIR"]) / "invoice_concepts.json").read_text(encoding="utf-8"))
print("ISSUES", d["issues"])
print("NO LINES", d["invoices_without_lines"])
for family in sorted({c["family"] for c in d["concepts"]}):
    items = [c for c in d["concepts"] if c["family"] == family]
    print("\nFAMILY", family, "concepts", len(items), "lines", sum(c["lines"] for c in items))
    for c in items[:30 if family == "Per revisar" else 15]:
        print(f'{c["lines"]:3} {c["concept"][:115]}')
