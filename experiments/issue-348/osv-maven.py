#!/usr/bin/env python3
"""Query OSV for every artifact in `mvn dependency:list -DoutputFile=...` files.

Maven has no built-in audit command, so issue #348 checked the resolved
trees against the OSV database (https://osv.dev), the source pip-audit and
govulncheck also use. Usage: osv-maven.py deps.txt [deps.txt ...]
"""

import json
import re
import sys
import urllib.request


def artifacts(paths):
    found = set()
    for path in paths:
        for line in open(path):
            match = re.match(
                r"\s+([\w.-]+):([\w.-]+):[\w-]+:(?:[\w-]+:)?([\w.-]+):\w+", line
            )
            if match:
                found.add((f"{match[1]}:{match[2]}", match[3]))
    return sorted(found)


def main(paths):
    found = artifacts(paths)
    queries = [
        {"package": {"ecosystem": "Maven", "name": name}, "version": version}
        for name, version in found
    ]
    request = urllib.request.Request(
        "https://api.osv.dev/v1/querybatch",
        data=json.dumps({"queries": queries}).encode(),
        headers={"Content-Type": "application/json"},
    )
    results = json.load(urllib.request.urlopen(request, timeout=60))["results"]
    vulnerable = 0
    for (name, version), result in zip(found, results):
        ids = [v["id"] for v in result.get("vulns", [])]
        vulnerable += bool(ids)
        print(f"{name} {version}: {', '.join(ids) or 'no known vulnerabilities'}")
    print(f"{len(found)} artifacts, {vulnerable} with known vulnerabilities")
    return 1 if vulnerable else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
