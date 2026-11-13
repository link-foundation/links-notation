"""Restore exact upstream inputs for the updated configuration snapshots.

Applications are temporary validation inputs, outside repository sources.
Overlay tracked snapshots and reuse generated dependency trees.
"""

import json
import pathlib
import re
import shutil
import subprocess
import tarfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
DESTINATION = pathlib.Path("/tmp/issue-405-template-validation")
REGISTRY = json.loads(
    (
        ROOT / "dev/log/issues/405/pulls/406/research/registry-all.json"
    ).read_text()
)

for issue, pull, languages in [
    (330, 331, ["js", "php"]),
    (377, 378, ["js", "php", "csharp"]),
]:
    snapshots = ROOT / f"dev/log/issues/{issue}/pulls/{pull}/templates"
    revisions = dict(
        line.split()
        for line in (snapshots / "SHAS.txt").read_text().splitlines()
    )
    for language in languages:
        repository = (
            "link-foundation/"
            f"{language}-ai-driven-development-pipeline-template"
        )
        destination = DESTINATION / f"{issue}-{language}"
        archive = DESTINATION / f"{issue}-{language}.tar.gz"
        DESTINATION.mkdir(parents=True, exist_ok=True)
        if not archive.exists():
            with archive.open("wb") as output:
                subprocess.run(
                    [
                        "gh",
                        "api",
                        f"repos/{repository}/tarball/{revisions[language]}",
                    ],
                    stdout=output,
                    check=True,
                )
        destination.mkdir(exist_ok=True)
        with tarfile.open(archive) as source:
            for member in source.getmembers():
                parts = pathlib.PurePosixPath(member.name).parts[1:]
                if not parts:
                    continue
                member.name = str(pathlib.PurePosixPath(*parts))
                source.extract(member, destination, filter="data")
        snapshot = snapshots / language
        tracked = (
            subprocess.check_output(
                ["git", "ls-files", "-z", str(snapshot.relative_to(ROOT))],
                cwd=ROOT,
            )
            .decode()
            .split("\0")
        )
        for filename in filter(None, tracked):
            source = ROOT / filename
            target = destination / source.relative_to(snapshot)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        for generated in ["node_modules"]:
            source = snapshot / generated
            target = destination / generated
            if source.exists() and not target.exists():
                target.symlink_to(source, target_is_directory=True)
        source = snapshot / "vendor"
        target = destination / "vendor"
        if source.exists() and (target.is_symlink() or not target.exists()):
            if target.is_symlink():
                target.unlink()
            # Reuse packages; give Composer its own generated maps.
            subprocess.run(["cp", "-al", str(source), str(target)], check=True)
            shutil.rmtree(target / "composer")
            shutil.copytree(source / "composer", target / "composer")
            (target / "autoload.php").unlink()
            subprocess.run(
                [
                    "php",
                    "/tmp/issue-405-composer.phar",
                    "dump-autoload",
                    "--no-scripts",
                ],
                cwd=destination,
                check=True,
            )
        # The historical capture intentionally renamed dead-link fixtures.
        for source in destination.rglob("lychee-report.md.txt"):
            shutil.copy2(source, source.with_suffix(""))
        if language == "js":
            # Full upstream inputs include workflows and a Deno mirror lock
            # outside the partial capture. Align those validation inputs too.
            for workflow in (destination / ".github").rglob("*.yml"):
                source = workflow.read_text()

                def current_action(match):
                    action, version = match.groups()
                    selected = REGISTRY.get("github:" + action)
                    return (
                        f"uses: {action}@{selected}"
                        if selected and version.startswith("v")
                        else match[0]
                    )

                workflow.write_text(
                    re.sub(
                        r"uses:\s*([^@\s]+)@([^\s]+)",
                        current_action,
                        source,
                    )
                )
            subprocess.run(
                [
                    "deno",
                    "install",
                    "--lockfile-only",
                    "--frozen-lockfile=false",
                    "--minimum-dependency-age",
                    "0",
                ],
                cwd=destination,
                check=True,
            )
            # The policies intentionally inspect tracked files. Keep this
            # disposable repository separate from the actual PR branch.
            subprocess.run(
                ["git", "init", "--initial-branch=main"],
                cwd=destination,
                check=True,
            )
            subprocess.run(["git", "add", "."], cwd=destination, check=True)
            subprocess.run(
                [
                    "git",
                    "-c",
                    "user.name=Issue 405 validation",
                    "-c",
                    "user.email=issue405@example.invalid",
                    "-c",
                    "core.hooksPath=/dev/null",
                    "commit",
                    "--allow-empty",
                    "-m",
                    "Restore exact upstream validation inputs",
                ],
                cwd=destination,
                check=True,
            )
        print(
            f"{repository}@{revisions[language]} -> {destination}", flush=True
        )
