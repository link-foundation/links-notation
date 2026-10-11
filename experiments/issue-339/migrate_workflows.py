"""Migrate existing jobs intact to same-commit reusable workflows."""

import re
from pathlib import Path

WORKFLOWS = Path(".github/workflows")
LANGUAGES = ["js", "rust", "python", "java", "go", "csharp", "php"]
REUSABLE = LANGUAGES + [
    "binary-interop",
    "benchmarks",
    "security",
    "docs",
    "release-audit",
]

for name in REUSABLE:
    path = WORKFLOWS / f"{name}.yml"
    text = path.read_text()
    text = re.sub(
        r"on:.*?\npermissions:",
        "on:\n  workflow_call:\n    inputs:\n      verbose:\n"
        "        description: 'Print extra diagnostics (never secret values)'\n"
        "        type: boolean\n        required: false\n"
        "        default: false\n\npermissions:",
        text,
        count=1,
        flags=re.S,
    )
    # The caller's github.workflow is shared by all the called workflows.
    # Preserve distinct job locks; never cancel a gated stage.
    text = text.replace("${{ github.workflow }}", f"ci-{name}")
    text = re.sub(r"cancel-in-progress:.*", "cancel-in-progress: false", text)
    if name in LANGUAGES:
        detection = re.search(r"\n  (findChanged\w+):.*?(?=\n  [\w-]+:)", text, re.S)
        if detection:
            job = detection.group(1)
            text = (
                text[slice(None, detection.start())]
                + text[slice(detection.end(), None)]
            )
            text = re.sub(rf"needs: \[{job}, ([^\]]+)\]", r"needs: [\1]", text)
            text = re.sub(rf"    needs: \[{job}\]\n", "", text)
            text = re.sub(
                rf"    if: \$\{{\{{ needs\.{job}\.outputs\.\w+ == 'true' \}}\}}\n",
                "",
                text,
            )
            text = re.sub(rf"needs\.{job}\.outputs\.\w+ == 'true' && ", "", text)
    if name == "js":
        # Independent checks collect every failure in one run.
        text = text.replace("    needs: [format]\n", "").replace(
            "    needs: [format, lint]\n", ""
        )
        text = text.replace(
            "    needs: [test]\n", "    needs: [format, lint, test, parity]\n", 1
        )
        parity = """
  parity:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7.0.1
        with:
          persist-credentials: false
      - uses: oven-sh/setup-bun@v2.2.0
        with:
          bun-version: latest
      - name: Check every CI entry point and parity contract
        working-directory: .
        run: |
          bun scripts/ci/check-js-gate.mjs
          bun test experiments/issue-339/ci-contract.test.mjs
          node scripts/ci/check-parity.mjs
          node --test experiments/issue-339/parity-contract.test.mjs
          node --test experiments/issue-339/release-audit.test.mjs
          python3 experiments/issue-339/test_workflow_contract.py
"""
        text = text.replace("\n  publishToNpm:", parity + "\n  publishToNpm:")
    if name == "rust":
        text = text.replace(
            "    needs: [test]\n", "    needs: [test, msrv-rejection]\n", 1
        )
        text = text.replace(
            "env:\n",
            "env:\n  CARGO_INCREMENTAL: '0'\n  CARGO_BUILD_JOBS: '2'\n"
            "  CARGO_PROFILE_DEV_DEBUG: '0'\n  CARGO_PROFILE_TEST_DEBUG: '0'\n",
            1,
        )
    if name == "pages":
        raise AssertionError("Pages is updated separately")
    if name == "release-audit":
        # The caller waits for every publisher. Polling other workflows here
        # would deadlock waiting for the enclosing CI run itself.
        start = text.index("      # On a push the audit")
        end = text.index("      - name: Audit declared", start)
        text = text[:start] + text[end:]
    path.write_text(text)

header = """name: CI

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:
    inputs:
      verbose:
        description: 'Print extra diagnostics (never secret values)'
        type: boolean
        default: false

permissions:
  contents: read

# One commit range at a time; drafting agents never push during a run.
concurrency:
  group: ci-${{ github.head_ref || github.ref }}
  cancel-in-progress: false

jobs:
"""
for name in REUSABLE:
    job = name.replace("-", "_")
    header += f"  {job}:\n"
    if name != "js":
        header += (
            "    needs: [js"
            + (
                ", rust, python, java, go, csharp, php"
                if name == "release-audit"
                else ""
            )
            + "]\n"
        )
    if name == "release-audit":
        header += "    if: ${{ always() && needs.js.result == 'success' }}\n"
    header += f"    uses: ./.github/workflows/{name}.yml\n"
    header += "    with:\n      verbose: ${{ inputs.verbose || false }}\n"
    if name in LANGUAGES or name in ("benchmarks", "security"):
        header += "    secrets: inherit\n    permissions:\n      contents: write\n"
        if name in LANGUAGES:
            header += "      id-token: write\n"
        if name == "security":
            header += "      security-events: write\n      pull-requests: write\n"
    elif name == "release-audit":
        header += "    secrets: inherit\n"
    header += "\n"

# These required checks explicitly fail if a stage was skipped or cancelled.
for language, label in zip(
    LANGUAGES, ["JavaScript", "Rust", "Python", "Java", "Go", "CSharp", "PHP"]
):
    header += f"""  {language}_check:
    name: {label}
    needs: [{language}]
    if: ${{{{ always() }}}}
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - name: Require a successful stage
        env:
          STAGE_RESULT: ${{{{ needs.{language}.result }}}}
        run: test "$STAGE_RESULT" = success

"""
(WORKFLOWS / "ci.yml").write_text(header)
