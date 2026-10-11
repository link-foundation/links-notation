# Repository workflow

Follow [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md). They are
the single source for JavaScript-first development, parity evidence, the single
push gate, bounded Rust builds, and release verification. Drafting agents never
push; the designated CI/CD agent waits for completed runs and collects every
failure before one push. Run JS tests by default and the affected native suites
when changing their behavior.
