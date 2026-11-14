# Embedded Cargo tools: before, after and latest stable

Registry queried on 2026-11-14 UTC; raw metadata: `cargo-tools-registry.json`.
These supplement manifest declarations: install-action inputs, shell installer
defaults and synthetic workflow-checker test inputs. Test inputs do not install
tools, but their illustrative versions are aligned as well.

| Location | Tool | Before | After | Latest stable | Decision |
| --- | --- | --- | --- | --- | --- |
| `dev/log/issues/290/pulls/291/templates/rust/.github/workflows/security.yml:27` | cargo-audit | 0.22.2 | 0.23.0 | 0.23.0 | Current crates.io stable release |
| `dev/log/issues/298/pulls/299/templates/rust/security.yml:27` | cargo-audit | 0.22.2 | 0.23.0 | 0.23.0 | Current crates.io stable release |
| `dev/log/issues/330/pulls/331/templates/rust/.github/workflows/security.yml:29` | cargo-audit | 0.22.2 | 0.23.0 | 0.23.0 | Current crates.io stable release |
| `dev/log/issues/377/pulls/378/templates/rust/.github/workflows/security.yml:35` | cargo-audit | 0.22.2 | 0.23.0 | 0.23.0 | Current crates.io stable release |
| `dev/log/issues/377/pulls/378/templates/rust/scripts/check-workflow-tools.rs:228` | rust-script | 0.36.0 | 0.36.0 | 0.36.0 | Current crates.io stable release |
| `dev/log/issues/377/pulls/378/templates/rust/scripts/check-workflow-tools.rs:255` | cargo-cyclonedx | 0.5.9 | 0.5.10 | 0.5.10 | Current crates.io stable release |
| `dev/log/issues/377/pulls/378/templates/rust/scripts/check-workflow-tools.rs:263` | rust-script | 0.36.0 | 0.36.0 | 0.36.0 | Current crates.io stable release |
| `dev/log/issues/377/pulls/378/templates/rust/scripts/check-workflow-tools.rs:269` | cargo-llvm-cov | 0.9.1 | 0.9.1 | 0.9.1 | Current crates.io stable release |
| `dev/log/issues/377/pulls/378/templates/rust/scripts/check-workflow-tools.rs:283` | cargo-audit | 0.22.2 | 0.23.0 | 0.23.0 | Current crates.io stable release |
| `dev/log/issues/377/pulls/378/templates/rust/scripts/install-rust-script.sh:10` | rust-script | 0.36.0 | 0.36.0 | 0.36.0 | Current crates.io stable release |
