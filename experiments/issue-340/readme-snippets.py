"""Compiles every ```cpp block of cpp/README.md (and the Quick Start of the
root READMEs), each inside its own function, so the README cannot show code
that does not build. Usage: readme-snippets.py BUILD_DIR README..."""
import pathlib
import re
import subprocess
import sys
import tempfile

build = pathlib.Path(sys.argv[1])
library = next(build.rglob("liblinks_notation*.a"))
root = pathlib.Path(__file__).resolve().parents[2]
blocks = []
for readme in sys.argv[2:]:
    blocks += re.findall(r"```cpp\n(.*?)```", pathlib.Path(readme).read_text(), re.S)
source = ["#include <cassert>", "#include <iostream>", '#include "links_notation.hpp"',
          "using links_notation::Link;", "std::string document = \"a\";"]
for index, block in enumerate(blocks):
    if "int main()" in block or "class Link {" in block or block.lstrip().startswith("std::vector<Link> parse("):
        source.append(f"namespace snippet{index} {{\nusing namespace links_notation;\n{block.replace('#include', '// #include')}\n}}")
    else:
        source.append(f"void snippet{index}() {{\n{block}\n}}")
source.append("int main() {}")
with tempfile.TemporaryDirectory() as directory:
    path = pathlib.Path(directory) / "snippets.cpp"
    path.write_text("\n".join(source))
    result = subprocess.run(["g++", "-std=c++17", "-Wall", f"-I{root}/cpp/include", f"-I{build}/generated",
                             str(path), str(library), "-o", str(pathlib.Path(directory) / "snippets")],
                            capture_output=True, text=True)
    print(result.stderr[-4000:])
    print(f"{len(blocks)} snippets", "compile" if result.returncode == 0 else "FAIL")
    sys.exit(result.returncode)
