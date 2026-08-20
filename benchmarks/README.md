# Links Notation Benchmarks

This directory contains UTF-8 character count benchmarks comparing Links Notation (lino) against JSON, YAML, and XML formats.

## Overview

The benchmarks measure the UTF-8 character count efficiency of Links Notation compared to other popular data serialization formats. This is useful for understanding the data size impact when using Links Notation, particularly in contexts where character count matters (e.g., LLM context windows, storage optimization).

## Benchmark Results

See [BENCHMARK_RESULTS.md](BENCHMARK_RESULTS.md) for the latest benchmark results.

## Test Cases

The benchmark includes 5 test cases representing different data structures:

| Test Case | Description |
|-----------|-------------|
| employees | Employee records with nested structure |
| simple_doublets | Simple doublet links (2-tuples) |
| triplets | Triplet relations (3-tuples) |
| nested_structure | Deeply nested company structure |
| config | Application configuration |

Test data files are located in the `data/` directory.

## Running Benchmarks

### Rust (Primary - Used in CI/CD)

```bash
cd rust
cargo run -p links-notation-benchmark --release
```

### JavaScript

```bash
node benchmarks/js/benchmark.mjs
```

### Python

```bash
python3 benchmarks/python/benchmark.py
```

### C#

```bash
dotnet run --project benchmarks/csharp/Benchmark.csproj
```

### Go

```bash
cd benchmarks/go
go run benchmark.go
```

### Java

```bash
cd benchmarks/java
mvn compile exec:java
```

## CI/CD Integration

The benchmarks are automatically run on push to the `main` branch when:
- Files in `benchmarks/` are changed
- Files in `rust/links-notation-benchmark/` are changed
- The `.github/workflows/benchmarks.yml` workflow is changed

When running on the `main` branch, the workflow will:
1. Run the Rust benchmark
2. Compare results with existing `BENCHMARK_RESULTS.md`
3. If results have changed, commit the updated markdown file

## Directory Structure

```
benchmarks/
├── README.md                    # This file
├── BENCHMARK_RESULTS.md         # Generated benchmark results (auto-updated by CI)
├── benchmark_results.json       # JSON report from Rust benchmark
├── data/                        # Test data files
│   ├── *.lino                   # Links Notation format
│   ├── *.json                   # JSON format
│   ├── *.yaml                   # YAML format
│   └── *.xml                    # XML format
├── js/                          # JavaScript benchmark
│   └── benchmark.mjs
├── python/                      # Python benchmark
│   └── benchmark.py
├── csharp/                      # C# benchmark
│   ├── Benchmark.csproj
│   └── Program.cs
├── go/                          # Go benchmark
│   ├── go.mod
│   └── benchmark.go
└── java/                        # Java benchmark
    ├── pom.xml
    └── src/main/java/.../Benchmark.java
```

## Methodology

The benchmark counts UTF-8 characters (not bytes) in equivalent data representations across all formats:
- **Lino**: Links Notation format
- **JSON**: Standard JSON format
- **YAML**: YAML 1.2 format
- **XML**: Standard XML format

The "savings" percentage indicates how much smaller the Lino representation is compared to each format. A positive savings percentage means Lino uses fewer characters.

## Adding New Test Cases

1. Create equivalent representations in all four formats:
   - `data/{name}.lino`
   - `data/{name}.json`
   - `data/{name}.yaml`
   - `data/{name}.xml`

2. Add the test case to each benchmark implementation:
   - Rust: `rust/links-notation-benchmark/src/main.rs`
   - JavaScript: `benchmarks/js/benchmark.mjs`
   - Python: `benchmarks/python/benchmark.py`
   - C#: `benchmarks/csharp/Program.cs`
   - Go: `benchmarks/go/benchmark.go`
   - Java: `benchmarks/java/src/.../Benchmark.java`

3. Run the benchmarks to verify and update results.
