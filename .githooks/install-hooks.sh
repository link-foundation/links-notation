#!/bin/bash
#
# Install git hooks from .githooks directory
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

echo "Installing git hooks..."

for hook in "$SCRIPT_DIR"/*; do
    hook_name=$(basename "$hook")

    # Skip this install script and README
    if [[ "$hook_name" == "install-hooks.sh" ]] || [[ "$hook_name" == "README.md" ]]; then
        continue
    fi

    # Skip if not a file
    if [[ ! -f "$hook" ]]; then
        continue
    fi

    target="$HOOKS_DIR/$hook_name"

    # Copy hook
    cp "$hook" "$target"
    chmod +x "$target"

    echo "✓ Installed $hook_name"
done

echo ""
echo "Git hooks installed successfully!"
echo "These hooks will now run automatically on git operations."
