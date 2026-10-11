"""Keep raw evidence lossless while respecting the 1000 KiB contribution limit."""

import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path("docs/case-studies/issue-339/data")
LIMIT = 900_000

for path in ROOT.glob("*.json"):
    data = path.read_bytes()
    if len(data) > LIMIT:
        target = path.with_suffix(".json.gz")
        with gzip.open(target, "wb") as output:
            output.write(data)
        assert gzip.decompress(target.read_bytes()) == data
        path.unlink()

for path in ROOT.glob("gist-*.txt.gz"):
    if path.stat().st_size <= LIMIT:
        continue
    text = gzip.decompress(path.read_bytes()).decode("utf8")
    chunks = []
    pending = []
    pending_bytes = 0
    for line in text.splitlines(keepends=True):
        # A single unusually long line is split on character boundaries.
        for offset in range(0, len(line), LIMIT // 4):
            piece = line[slice(offset, offset + LIMIT // 4)]
            size = len(piece.encode("utf8"))
            if pending_bytes + size > LIMIT:
                chunks.append("".join(pending))
                pending = []
                pending_bytes = 0
            pending.append(piece)
            pending_bytes += size
    if pending:
        chunks.append("".join(pending))
    names = []
    for index, chunk in enumerate(chunks, 1):
        target = path.with_name(
            path.name.replace(".txt.gz", f".part-{index:03}.txt.gz")
        )
        with gzip.open(target, "wt", encoding="utf8", newline="") as output:
            output.write(chunk)
        assert target.stat().st_size < 1_024_000
        names.append(target.name)
    restored = b"".join(gzip.decompress((ROOT / name).read_bytes()) for name in names)
    assert restored == text.encode("utf8")
    index = {
        "parts": names,
        "sha256": hashlib.sha256(restored).hexdigest(),
        "bytes": len(restored),
    }
    path.with_name(path.name.replace(".txt.gz", ".index.json")).write_text(
        json.dumps(index, indent=2) + "\n"
    )
    path.unlink()
    # Remove temporary alternative-compression probes of the same evidence.
    path.with_suffix(".xz").unlink(missing_ok=True)
    print(f"{path.name}: {len(names)} lossless parts")
