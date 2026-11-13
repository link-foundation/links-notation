#!/usr/bin/env python3
"""Update build toolchains; retain explicitly tested consumer compatibility floors."""

import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
evidence = root / "dev/log/issues/405/pulls/406/research"
rows = []
for relative in (
    subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
):
    if not relative:
        continue
    path = root / relative
    if "/research/" in relative or "/ci-logs/" in relative:
        continue
    source = (
        path.read_text()
        if path.suffix in {".yml", ".yaml", ".csproj"} or path.name == "global.json"
        else None
    )
    if source is None:
        continue
    updated = source
    if path.suffix in {".yml", ".yaml"}:
        for label, latest in [
            ("node-version", "26.13.1"),
            ("java-version", "27.0.1"),
            ("go-version", "1.27.4"),
        ]:
            pattern = r"(" + label + r":\s*)([\"\']?)(\d+(?:\.\d+)*(?:\.x)?)([\"\']?)"

            def replace(match):
                before = match[3]
                rows.append(
                    {"path": relative, "tool": label, "before": before, "after": latest}
                )
                return match[1] + match[2] + latest + match[4]

            updated = re.sub(pattern, replace, updated)
        updated = updated.replace("Set up JDK 25", "Set up JDK 27").replace(
            "Setup JDK 25", "Setup JDK 27"
        )
        updated = updated.replace(
            "swift@sha256:bca121f6eb59fd80340d1296887b2698ed8f3eb9eca7d80c181f8af769dc7ee0 # 6.4-noble",
            "swift@sha256:23d9b28ad97fb1cf1999edc3a0cb265ee915ed42299a9344e7173d5a6d2b05f4 # 6.4.2-noble",
        )
    if path.name == "global.json":
        data = json.loads(source)
        if "sdk" in data:
            before = data["sdk"]["version"]
            data["sdk"]["version"] = "11.0.100"
            rows.append(
                {
                    "path": relative,
                    "tool": ".NET SDK",
                    "before": before,
                    "after": "11.0.100",
                }
            )
            updated = json.dumps(data, indent=2) + "\n"
    # Test and executable projects run on the latest runtime. The published
    # net10 library deliberately retains its supported consumer API surface.
    if (
        path.suffix == ".csproj"
        and relative
        != "csharp/Link.Foundation.Links.Notation/Link.Foundation.Links.Notation.csproj"
    ):
        updated = re.sub(
            r"<TargetFramework>net(?:[0-9]+)\.0</TargetFramework>",
            "<TargetFramework>net11.0</TargetFramework>",
            updated,
        )
    if source != updated:
        path.write_text(updated)
(evidence / "toolchain-changes.json").write_text(json.dumps(rows, indent=2) + "\n")
print(f"Reviewed {len(rows)} runtime pins")
