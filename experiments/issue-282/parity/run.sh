#!/usr/bin/env bash
#
# Parse one document with all seven implementations and fail unless they agree.
#
# The document is the one from issue #282: a parenthesised group whose body is
# written across several lines. Before that issue was fixed, the body collapsed
# into a flat list of references and the record boundaries were unrecoverable.
# The point of this script is that the fix is the same fix everywhere, so the
# seven implementations must print the same thing.
#
# Usage: bash experiments/issue-282/parity/run.sh
#
# Languages whose toolchain is not installed are reported as skipped rather than
# failed, so the script is still useful on a machine that has only some of them.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
expected="$(cat "$here/expected.txt")"

failures=0
skipped=()

report() {
    local language="$1" actual="$2"
    if [ "$actual" = "$expected" ]; then
        printf '%-12s %s\n' "$language" "$actual"
    else
        printf '%-12s %s  <- expected %s\n' "$language" "$actual" "$expected"
        failures=$((failures + 1))
    fi
}

run_if() {
    # run_if <language> <tool> <command...>
    local language="$1" tool="$2"
    shift 2
    if ! command -v "$tool" > /dev/null 2>&1; then
        skipped+=("$language (no $tool)")
        return
    fi
    report "$language" "$("$@" | tail -n 1)"
}

echo "Document:"
sed 's/^/    /' "$here/document.lino"
echo

run_if JavaScript node node "$here/check.mjs"
run_if Python python3 python3 "$here/check.py"

# The PHP package requires a newer PHP than several distributions install as
# `php`, and composer's platform check aborts on an older one, so pick the first
# interpreter on the machine that is new enough rather than trusting the name.
required="$(sed -n 's/.*"php": ">=\([0-9.]*\)".*/\1/p' "$root/php/composer.json")"
php_binary=""
for candidate in php8.5 php8.4 php; do
    command -v "$candidate" > /dev/null 2>&1 || continue
    version="$("$candidate" -r 'echo PHP_MAJOR_VERSION . "." . PHP_MINOR_VERSION;')"
    if [ "$(printf '%s\n%s\n' "$required" "$version" | sort -V | head -n 1)" = "$required" ]; then
        php_binary="$candidate"
        break
    fi
done

if [ -z "$php_binary" ]; then
    skipped+=("PHP (no interpreter >= $required)")
elif [ ! -d "$root/php/vendor" ]; then
    skipped+=("PHP (run composer install in php/)")
else
    report PHP "$("$php_binary" "$here/check.php" | tail -n 1)"
fi

run_if Rust cargo cargo run --quiet --manifest-path "$here/rust/Cargo.toml"

if command -v go > /dev/null 2>&1; then
    report Go "$(cd "$here/go" && go run . | tail -n 1)"
else
    skipped+=("Go (no go)")
fi

if command -v javac > /dev/null 2>&1 && command -v java > /dev/null 2>&1; then
    classes="$(mktemp -d)"
    trap 'rm -rf "$classes"' EXIT
    # shellcheck disable=SC2046 # the file list must word-split into arguments
    javac -nowarn -d "$classes" $(find "$root/java/src/main/java" -name '*.java') "$here/java/Check.java"
    report Java "$(java -cp "$classes" Check "$here/document.lino" | tail -n 1)"
else
    skipped+=("Java (no javac/java)")
fi

# The library targets a recent .NET, and an older SDK fails the build with
# NETSDK1045 rather than skipping, so ask the SDK what it can target before
# running it - the same reason the PHP interpreter is chosen by version above.
dotnet_required="$(sed -n 's/.*<TargetFramework>net\([0-9]*\)\..*/\1/p' "$here/csharp/parity.csproj")"
if ! command -v dotnet > /dev/null 2>&1; then
    skipped+=("C# (no dotnet)")
else
    dotnet_newest="$(dotnet --list-sdks | sed -n 's/^\([0-9]*\)\..*/\1/p' | sort -n | tail -n 1)"
    if [ -z "$dotnet_newest" ] || [ "$dotnet_newest" -lt "$dotnet_required" ]; then
        skipped+=("C# (no SDK >= $dotnet_required)")
    else
        report "C#" "$(dotnet run --project "$here/csharp/parity.csproj" | tail -n 1)"
    fi
fi

echo
for skip in ${skipped+"${skipped[@]}"}; do
    echo "skipped: $skip"
done

if [ "$failures" -gt 0 ]; then
    echo "$failures implementation(s) disagree."
    exit 1
fi

echo "Every implementation that ran agrees."
