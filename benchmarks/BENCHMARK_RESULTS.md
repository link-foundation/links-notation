# Links Notation Character Count Benchmark

This benchmark compares the UTF-8 character count of Links Notation (lino) against JSON, YAML, and XML.

## Summary

| Format | Total Characters | vs Lino |
|--------|------------------|----------|
| **Lino** | **734** | - |
| JSON | 1332 | +81.5% |
| YAML | 920 | +25.3% |
| XML | 1882 | +156.4% |

## Average Savings with Lino

- **vs JSON**: 47.9% fewer characters
- **vs YAML**: 21.5% fewer characters
- **vs XML**: 61.5% fewer characters

## Detailed Results

| Test Case | Description | Lino | JSON | YAML | XML | Lino vs JSON | Lino vs YAML | Lino vs XML |
|-----------|-------------|------|------|------|-----|--------------|--------------|-------------|
| employees | Employee records with nested structure | 177 | 251 | 142 | 302 | 29.5% | -24.6% | 41.4% |
| simple_doublets | Simple doublet links (2-tuples) | 62 | 155 | 112 | 215 | 60.0% | 44.6% | 71.2% |
| triplets | Triplet relations (3-tuples) | 54 | 229 | 183 | 371 | 76.4% | 70.5% | 85.4% |
| nested_structure | Deeply nested company structure | 254 | 400 | 282 | 615 | 36.5% | 9.9% | 58.7% |
| config | Application configuration | 187 | 297 | 201 | 379 | 37.0% | 7.0% | 50.7% |

## Test Cases

### employees

Employee records with nested structure

| Format | Characters |
|--------|------------|
| Lino | 177 |
| JSON | 251 |
| YAML | 142 |
| XML | 302 |

### simple_doublets

Simple doublet links (2-tuples)

| Format | Characters |
|--------|------------|
| Lino | 62 |
| JSON | 155 |
| YAML | 112 |
| XML | 215 |

### triplets

Triplet relations (3-tuples)

| Format | Characters |
|--------|------------|
| Lino | 54 |
| JSON | 229 |
| YAML | 183 |
| XML | 371 |

### nested_structure

Deeply nested company structure

| Format | Characters |
|--------|------------|
| Lino | 254 |
| JSON | 400 |
| YAML | 282 |
| XML | 615 |

### config

Application configuration

| Format | Characters |
|--------|------------|
| Lino | 187 |
| JSON | 297 |
| YAML | 201 |
| XML | 379 |

## Methodology

This benchmark counts UTF-8 characters (not bytes) in equivalent data representations across all formats.
The "savings" percentage indicates how much smaller the Lino representation is compared to each format.

A positive savings percentage means Lino uses fewer characters.

---

*Generated automatically by links-notation-benchmark*
