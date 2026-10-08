# Rust MSRV regression (#334)

Before the fix, Rust 1.86 compiles dependencies and then fails in
`rust/links-notation/src/quotes.rs` with E0658 (`unsigned_is_multiple_of`).
The standard library stabilized `usize::is_multiple_of` in Rust 1.87:
[Rust documentation](https://doc.rust-lang.org/std/primitive.usize.html#method.is_multiple_of).

Install the two toolchains and run the regression from the repository root:

```sh
rustup toolchain install 1.86.0 1.87.0 --profile minimal
bash experiments/issue-334/check-msrv.sh
```

The script fails before the fix because Cargo does not report the MSRV. After
the fix it verifies that Cargo rejects both published crates on 1.86 with
`requires rustc 1.87`, including the parser without its optional macro.
Logs are saved under `ci-logs/issue-334/`.

Verify that the declared minimum actually builds and passes the full suite:

```sh
cd rust
cargo +1.87.0 build --release
cargo +1.87.0 test
cargo +1.87.0 test -p links-notation --no-default-features
```

The Rust workflow runs these checks on 1.87 and stable, and runs the rejection
regression on 1.86. The crate MSRV is declared directly in each published
manifest so it also appears in crates.io metadata.
