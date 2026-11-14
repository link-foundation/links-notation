"""Bounded reproduction of KGP's untracked Yarn resolution input.

Runs only package-JSON generation: no compilation or package installation.
"""

import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOGS = ROOT / "ci-logs"
BUILD = """plugins { kotlin("multiplatform") version "2.4.21" }
repositories { mavenCentral() }
kotlin { js { nodejs() } }
plugins.withType<org.jetbrains.kotlin.gradle.targets.js.yarn.YarnPlugin> {
    the<org.jetbrains.kotlin.gradle.targets.js.yarn.YarnRootExtension>()
        .resolution("minimatch",
            providers.gradleProperty("probeResolution").get())
}
"""

with tempfile.TemporaryDirectory(prefix="issue405-kgp-inputs-") as directory:
    project = pathlib.Path(directory)
    (project / "settings.gradle.kts").write_text(
        "pluginManagement { repositories { google(); mavenCentral(); "
        "gradlePluginPortal() } }\n"
        'rootProject.name = "root-input-probe"\n'
    )
    (project / "build.gradle.kts").write_text(BUILD)
    selected = []
    for number, version, rerun in [
        (1, "^11.0.7", True),
        (2, "^11.0.8", False),
        (3, "^11.0.8", True),
    ]:
        command = [
            str(ROOT / "kotlin/gradlew"),
            "--no-daemon",
            "--no-configuration-cache",
            "--max-workers=1",
            "-Dorg.gradle.jvmargs=-Xmx384m -XX:MaxMetaspaceSize=256m",
            "-p",
            str(project),
            f"-PprobeResolution={version}",
            "rootPackageJson",
        ]
        if rerun:
            command.append("--rerun")
        with (LOGS / f"issue405-root-inputs-{number}.log").open("w") as log:
            subprocess.run(
                command, stdout=log, stderr=subprocess.STDOUT, check=True
            )
        output = json.loads((project / "build/js/package.json").read_text())
        selected.append(output.get("resolutions", {}).get("minimatch"))
    evidence = dict(
        requested=["^11.0.7", "^11.0.8", "^11.0.8"], generated=selected
    )
    (LOGS / "issue405-root-inputs-result.json").write_text(
        json.dumps(evidence, indent=2) + "\n"
    )
    print(json.dumps(evidence))
    # KGP serializes caret constraints into their equivalent range form.
    assert selected == [
        ">=11.0.7 <12.0.0",
        ">=11.0.7 <12.0.0",
        ">=11.0.8 <12.0.0",
    ], evidence
