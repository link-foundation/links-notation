"""One-time extraction of publishing behind the seven-language test barrier.

Preserve job bodies, provider dependencies, and C# PDF generation. Refuse to
overwrite the final reusable publisher workflows when rerun.
"""

import re
from pathlib import Path

WORKFLOWS = Path(".github/workflows")
LANGUAGES = ["javascript", "rust", "python", "java", "go", "csharp", "php"]
if (WORKFLOWS / "release.yml").exists():
    raise SystemExit("Publisher extraction already exists; refusing to overwrite.")

secrets_by_language = {}
for language in LANGUAGES:
    path = WORKFLOWS / f"{language}.yml"
    header, body = path.read_text().split("\njobs:\n", 1)
    secrets = re.search(r"    secrets:\n.*?(?=\npermissions:)", header, re.S)
    secrets_by_language[language] = (
        re.findall(r"^      (\w+):", secrets.group(), re.M) if secrets else []
    )
    native, publishing = [], []
    for match in re.finditer(
        r"^  ([\w-]+):\n.*?(?=^  [\w-]+:\n|\Z)", body, re.M | re.S
    ):
        name, job = match.group(1), match.group()
        if "publish" in name.lower() or name == "pushToNuget":
            # Internal provider-to-release dependencies stay intact. Native
            # dependencies move to the single release caller's needs barrier.
            job = re.sub(
                r"^    needs: \[(?:format|lint|test|parity|msrv-rejection|"
                r"generatePdfWithCode)(?:, [\w-]+)*\]\n",
                "",
                job,
                flags=re.M,
            )
            publishing.append(job)
        else:
            native.append(job)
    provider = "js" if language == "javascript" else language
    publish_header = re.sub(r"^name: .*", f"name: publish-{provider}", header)
    (WORKFLOWS / f"publish-{provider}.yml").write_text(
        publish_header + "\njobs:\n" + "".join(publishing).rstrip() + "\n"
    )
    if secrets:
        header = header[: secrets.start()] + "\n" + header[secrets.end() :]
    path.write_text(header + "\njobs:\n" + "".join(native).rstrip() + "\n")

entry = WORKFLOWS / "js.yml"
header, body = entry.read_text().split("\njobs:\n", 1)
jobs = []
for match in re.finditer(r"^  ([\w-]+):\n.*?(?=^  [\w-]+:\n|\Z)", body, re.M | re.S):
    name, job = match.group(1), match.group()
    if name in ["js", *LANGUAGES[1:]]:
        job = re.sub(r"    secrets:\n.*?(?=    permissions:)", "", job, flags=re.S)
        job = re.sub(r"    permissions:\n(?:      .*\n)+", "", job)
    jobs.append(job)

release = """  release:
    needs: [js, rust, python, java, go, csharp, php]
    if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
    uses: ./.github/workflows/release.yml
    with:
      verbose: ${{ inputs.verbose || false }}
    secrets:
"""
for secret in [s for names in secrets_by_language.values() for s in names]:
    release += f"      {secret}: ${{{{ secrets.{secret} }}}}\n"
release += "    permissions:\n      contents: write\n      id-token: write\n\n"
body = "".join(jobs).replace("  release_audit:\n", release + "  release_audit:\n")
body = body.replace(
    "  release_audit:\n    needs: [js, rust, python, java, go, csharp, php]",
    "  release_audit:\n    needs: [js, rust, python, java, go, csharp, php, release]",
)
entry.write_text(header + "\njobs:\n" + body)

callee = """name: release

on:
  workflow_call:
    inputs:
      verbose:
        description: 'Print extra diagnostics (never secret values)'
        type: boolean
        required: false
        default: false
    secrets:
"""
for secret in [s for names in secrets_by_language.values() for s in names]:
    callee += f"      {secret}:\n        required: false\n"
callee += "\npermissions:\n  contents: read\n\njobs:\n"
for language in LANGUAGES:
    provider = "js" if language == "javascript" else language
    callee += (
        f"  {provider}:\n"
        f"    uses: ./.github/workflows/publish-{provider}.yml\n"
        "    with:\n      verbose: ${{ inputs.verbose || false }}\n"
    )
    if secrets_by_language[language]:
        callee += "    secrets:\n"
        for secret in secrets_by_language[language]:
            callee += f"      {secret}: ${{{{ secrets.{secret} }}}}\n"
    callee += "    permissions:\n      contents: write\n      id-token: write\n\n"
(WORKFLOWS / "release.yml").write_text(callee.rstrip() + "\n")
