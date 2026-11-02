"""Add the issue #364 rows to parity/language-features.json.

Both rows use the shared-syntax contract: every binding runs
parity/syntax-fixtures.json (or its TSV twin) and the CST round trip over every
text and syntax fixture. Run from anywhere, then refresh the inventory:

    python3 experiments/issue-364/add_parity_rows.py
    node scripts/ci/check-parity.mjs --refresh-inventory
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JAVA = "java/src/main/java/io/github/linkfoundation/linksnotation/"
JAVA_TESTS = "java/src/test/java/io/github/linkfoundation/linksnotation/"
CS = "csharp/Link.Foundation.Links.Notation/"
CS_TESTS = "csharp/Link.Foundation.Links.Notation.Tests/"

METADATA = {
    "js": ["js/src/Link.js", "js/src/Parser.js", "js/src/grammar.pegjs", "js/src/references.js"],
    "rust": ["rust/links-notation/src/syntax.rs", "rust/links-notation/src/lib.rs", "rust/links-notation/src/parser.rs", "rust/links-notation/src/stream_parser.rs"],
    "python": ["python/links_notation/link.py", "python/links_notation/quotes.py", "python/links_notation/parser.py"],
    "java": [JAVA + "Link.java", JAVA + "Parser.java"],
    "go": ["go/lino.go", "go/parser.go"],
    "csharp": [CS + "Link.cs", CS + "Parser.peg", CS + "Parser.cs", CS + "Quotes.cs"],
    "php": ["php/src/Link.php", "php/src/Parser.php"],
    "cpp": ["cpp/include/links_notation/link.hpp", "cpp/include/links_notation/parser.hpp", "cpp/include/links_notation/references.hpp", "cpp/src/link.cpp", "cpp/src/parser.cpp", "cpp/src/references.cpp"],
}
CST = {
    "js": ["js/src/Cst.js"],
    "rust": ["rust/links-notation/src/cst.rs"],
    "python": ["python/links_notation/cst.py"],
    "java": [JAVA + "CstNode.java", JAVA + "CstKind.java", JAVA + "CstBuilder.java"],
    "go": ["go/cst.go"],
    "csharp": [CS + "CstNode.cs", CS + "CstKind.cs", CS + "CstBuilder.cs"],
    "php": ["php/src/CstNode.php", "php/src/CstKind.php", "php/src/CstBuilder.php"],
    "cpp": ["cpp/include/links_notation/cst.hpp", "cpp/src/cst.cpp"],
}
PARITY = {
    "js": "js/tests/SharedSyntaxParity.test.js",
    "rust": "rust/links-notation/tests/shared_syntax_parity_tests.rs",
    "python": "python/tests/test_shared_syntax_parity.py",
    "java": JAVA_TESTS + "SharedSyntaxParityTest.java",
    "go": "go/shared_syntax_parity_test.go",
    "csharp": CS_TESTS + "SharedSyntaxParityTests.cs",
    "php": "php/tests/SharedSyntaxParityTest.php",
    "cpp": "cpp/tests/shared_syntax_parity_tests.cpp",
}
METADATA_TESTS = {
    "js": "js/tests/SyntaxMetadata.test.js",
    "rust": "rust/links-notation/tests/syntax_metadata_tests.rs",
    "python": "python/tests/test_syntax_metadata.py",
    "java": JAVA_TESTS + "SyntaxMetadataTest.java",
    "go": "go/syntax_metadata_test.go",
    "csharp": CS_TESTS + "SyntaxMetadataTests.cs",
    "php": "php/tests/SyntaxMetadataTest.php",
    "cpp": "cpp/tests/syntax_metadata_tests.cpp",
}
CST_TESTS = {
    "js": "js/tests/Cst.test.js",
    "rust": "rust/links-notation/tests/cst_tests.rs",
    "python": "python/tests/test_cst.py",
    "java": JAVA_TESTS + "CstTest.java",
    "go": "go/cst_test.go",
    "csharp": CS_TESTS + "CstTests.cs",
    "php": "php/tests/CstTest.php",
    "cpp": "cpp/tests/cst_tests.cpp",
}


def row(feature, description, implementation, tests, languages):
    return {
        "id": feature,
        "description": description,
        "contract": "shared-syntax",
        "implementations": {
            language: {
                "status": "implemented",
                "implementation": implementation[language],
                "evidence": [PARITY[language], tests[language]],
            }
            for language in languages
        },
    }


path = ROOT / "parity/language-features.json"
manifest = json.loads(path.read_text())
languages = manifest["languages"]
for files in (METADATA, CST, PARITY, METADATA_TESTS, CST_TESTS):
    for language, names in files.items():
        for name in [names] if isinstance(names, str) else names:
            if not (ROOT / name).is_file():
                raise SystemExit(f"{language}: missing {name}")
features = [f for f in manifest["features"] if f["id"] not in ("syntax-metadata", "concrete-syntax-tree")]
features += [
    row(
        "syntax-metadata",
        "parsed links record how their ID was written (raw ID text and quote), ignored by equality and formatting, with an AST mode that leaves it out",
        METADATA,
        METADATA_TESTS,
        languages,
    ),
    row(
        "concrete-syntax-tree",
        "lossless concrete syntax tree whose tokens hold every character of the document, so its text is the input",
        CST,
        CST_TESTS,
        languages,
    ),
]
manifest["features"] = features
path.write_text(json.dumps(manifest, indent=2) + "\n")
print("added syntax-metadata and concrete-syntax-tree for", ", ".join(languages))
