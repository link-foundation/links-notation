#!/usr/bin/env python3
"""
UTF-8 Character Count Benchmark for Links Notation vs JSON, YAML, and XML

This benchmark measures the UTF-8 character count efficiency of Links Notation
compared to other popular data serialization formats.
"""

import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


@dataclass
class BenchmarkCase:
    """Represents a single benchmark test case."""
    name: str
    description: str
    lino: str
    json_content: str
    yaml: str
    xml: str


@dataclass
class BenchmarkResult:
    """Represents the results of a single benchmark."""
    name: str
    description: str
    lino_chars: int
    json_chars: int
    yaml_chars: int
    xml_chars: int
    lino_vs_json: float
    lino_vs_yaml: float
    lino_vs_xml: float


@dataclass
class AggregatedResults:
    """Represents aggregated results across all benchmarks."""
    total_lino_chars: int
    total_json_chars: int
    total_yaml_chars: int
    total_xml_chars: int
    avg_lino_vs_json: float
    avg_lino_vs_yaml: float
    avg_lino_vs_xml: float


def count_utf8_chars(text: str) -> int:
    """Count UTF-8 characters in a string.

    In Python 3, len(str) already returns the number of Unicode code points,
    which is what we want for UTF-8 character counting.
    """
    return len(text)


def calculate_savings(lino_chars: int, other_chars: int) -> float:
    """Calculate the percentage savings of Lino vs another format."""
    if other_chars == 0:
        return 0.0
    return ((other_chars - lino_chars) / other_chars) * 100


def find_data_dir() -> Optional[Path]:
    """Find the data directory by checking multiple possible paths."""
    script_dir = Path(__file__).parent
    cwd = Path.cwd()

    possible_paths = [
        script_dir / "../data",           # Running from benchmarks/python/
        script_dir / "../../benchmarks/data",  # Running from repo root
        cwd / "benchmarks/data",          # CWD is repo root
        cwd / "../data",                  # CWD is benchmarks/
        cwd / "data",                     # CWD is benchmarks/
    ]

    for path in possible_paths:
        resolved = path.resolve()
        if resolved.exists():
            return resolved

    return None


def find_output_dir() -> Path:
    """Find the output directory for reports."""
    script_dir = Path(__file__).parent
    cwd = Path.cwd()

    possible_paths = [
        script_dir / "..",               # Running from benchmarks/python/
        cwd / "benchmarks",              # CWD is repo root
        cwd,                             # Fallback to current directory
    ]

    for path in possible_paths:
        resolved = path.resolve()
        if resolved.exists():
            return resolved

    return cwd


def load_benchmark_cases(data_dir: Path) -> List[BenchmarkCase]:
    """Load all benchmark test cases from the data directory."""
    cases_config = [
        ("employees", "Employee records with nested structure"),
        ("simple_doublets", "Simple doublet links (2-tuples)"),
        ("triplets", "Triplet relations (3-tuples)"),
        ("nested_structure", "Deeply nested company structure"),
        ("config", "Application configuration"),
    ]

    cases = []
    for name, description in cases_config:
        try:
            lino = (data_dir / f"{name}.lino").read_text(encoding="utf-8")
            json_content = (data_dir / f"{name}.json").read_text(encoding="utf-8")
            yaml = (data_dir / f"{name}.yaml").read_text(encoding="utf-8")
            xml = (data_dir / f"{name}.xml").read_text(encoding="utf-8")

            cases.append(BenchmarkCase(
                name=name,
                description=description,
                lino=lino,
                json_content=json_content,
                yaml=yaml,
                xml=xml,
            ))
        except FileNotFoundError as e:
            print(f"Warning: Could not load {name}: {e}", file=sys.stderr)

    return cases


def run_benchmark(case: BenchmarkCase) -> BenchmarkResult:
    """Run the benchmark for a single test case."""
    lino_chars = count_utf8_chars(case.lino)
    json_chars = count_utf8_chars(case.json_content)
    yaml_chars = count_utf8_chars(case.yaml)
    xml_chars = count_utf8_chars(case.xml)

    return BenchmarkResult(
        name=case.name,
        description=case.description,
        lino_chars=lino_chars,
        json_chars=json_chars,
        yaml_chars=yaml_chars,
        xml_chars=xml_chars,
        lino_vs_json=calculate_savings(lino_chars, json_chars),
        lino_vs_yaml=calculate_savings(lino_chars, yaml_chars),
        lino_vs_xml=calculate_savings(lino_chars, xml_chars),
    )


def aggregate_results(results: List[BenchmarkResult]) -> AggregatedResults:
    """Aggregate results across all benchmark cases."""
    total_lino = sum(r.lino_chars for r in results)
    total_json = sum(r.json_chars for r in results)
    total_yaml = sum(r.yaml_chars for r in results)
    total_xml = sum(r.xml_chars for r in results)

    avg_vs_json = sum(r.lino_vs_json for r in results) / len(results)
    avg_vs_yaml = sum(r.lino_vs_yaml for r in results) / len(results)
    avg_vs_xml = sum(r.lino_vs_xml for r in results) / len(results)

    return AggregatedResults(
        total_lino_chars=total_lino,
        total_json_chars=total_json,
        total_yaml_chars=total_yaml,
        total_xml_chars=total_xml,
        avg_lino_vs_json=avg_vs_json,
        avg_lino_vs_yaml=avg_vs_yaml,
        avg_lino_vs_xml=avg_vs_xml,
    )


def main():
    """Main function to run the benchmark."""
    data_dir = find_data_dir()
    if data_dir is None:
        print("Error: Could not find benchmarks/data directory", file=sys.stderr)
        print("Please run from the repository root or benchmarks directory", file=sys.stderr)
        sys.exit(1)

    print(f"Loading benchmark cases from {data_dir}...")
    cases = load_benchmark_cases(data_dir)

    if not cases:
        print("Error: No benchmark cases found", file=sys.stderr)
        sys.exit(1)

    print(f"Running {len(cases)} benchmark cases...\n")

    results = [run_benchmark(case) for case in cases]
    aggregated = aggregate_results(results)

    # Print summary to console
    print("=== Links Notation Character Count Benchmark (Python) ===\n")
    print("Summary:")
    print(f"  Total Lino characters:  {aggregated.total_lino_chars}")
    print(f"  Total JSON characters:  {aggregated.total_json_chars}")
    print(f"  Total YAML characters:  {aggregated.total_yaml_chars}")
    print(f"  Total XML characters:   {aggregated.total_xml_chars}")
    print()
    print("Average savings with Lino:")
    print(f"  vs JSON: {aggregated.avg_lino_vs_json:.1f}% fewer characters")
    print(f"  vs YAML: {aggregated.avg_lino_vs_yaml:.1f}% fewer characters")
    print(f"  vs XML:  {aggregated.avg_lino_vs_xml:.1f}% fewer characters")
    print()

    # Generate JSON report
    report = {
        "language": "Python",
        "summary": {
            "total_lino_chars": aggregated.total_lino_chars,
            "total_json_chars": aggregated.total_json_chars,
            "total_yaml_chars": aggregated.total_yaml_chars,
            "total_xml_chars": aggregated.total_xml_chars,
            "avg_lino_vs_json": aggregated.avg_lino_vs_json,
            "avg_lino_vs_yaml": aggregated.avg_lino_vs_yaml,
            "avg_lino_vs_xml": aggregated.avg_lino_vs_xml,
        },
        "results": [
            {
                "name": r.name,
                "description": r.description,
                "lino_chars": r.lino_chars,
                "json_chars": r.json_chars,
                "yaml_chars": r.yaml_chars,
                "xml_chars": r.xml_chars,
                "lino_vs_json": r.lino_vs_json,
                "lino_vs_yaml": r.lino_vs_yaml,
                "lino_vs_xml": r.lino_vs_xml,
            }
            for r in results
        ],
    }

    output_dir = find_output_dir()
    json_path = output_dir / "benchmark_results_python.json"

    try:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"JSON report written to {json_path}")
    except IOError as e:
        print(f"Warning: Could not write JSON report: {e}", file=sys.stderr)

    print("\nBenchmark completed successfully!")


if __name__ == "__main__":
    main()
