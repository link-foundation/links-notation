#!/usr/bin/env python3
"""Compare archived template checks without inventing absent snapshot files."""

import io
import json
import subprocess
import tarfile
import tempfile
from pathlib import Path

from inventory import BASE, ROOT

logs = ROOT / "ci-logs/issue-408"
results = []
for issue in (330, 377):
    relative = f"dev/log/issues/{issue}/pulls/{issue + 1}/templates/js"
    with tempfile.TemporaryDirectory(prefix="issue408-baseline-") as directory:
        archive = subprocess.check_output(["git", "archive", BASE, relative], cwd=ROOT)
        with tarfile.open(fileobj=io.BytesIO(archive)) as source:
            source.extractall(directory, filter="data")
        project = Path(directory) / relative
        (project / "node_modules").symlink_to(ROOT / relative / "node_modules")
        for label, command in (
            ("test", ["npm", "test"]),
            ("lint", ["npm", "run", "lint"]),
        ):
            with (logs / f"baseline-template-{issue}-{label}.log").open("w") as log:
                result = subprocess.run(
                    command, cwd=project, stdout=log, stderr=subprocess.STDOUT
                )
            results.append(
                dict(issue=issue, command=command, status=result.returncode, sha=BASE)
            )
(logs / "baseline-template-results.json").write_text(
    json.dumps(results, indent=2) + "\n"
)
print(json.dumps(results))
