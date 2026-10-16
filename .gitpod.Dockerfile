# The newest workspace image, pinned by tag and digest so Dependabot can bump
# it; `latest` had not moved since 2025-11-26 (issue #348).
FROM gitpod/workspace-dotnet:2026-02-12-23-06-03@sha256:253772ffe6d042a39b7802e3101ace08b6b21914e8116d9bf6d9f84332b78e11

# The image ships .NET SDK 8.0.100, which cannot satisfy csharp/global.json.
# Install the SDK that file pins, so this workspace and CI use the same one.
COPY --chown=gitpod:gitpod csharp/global.json /tmp/global.json
RUN curl -fsSL https://dot.net/v1/dotnet-install.sh \
    | bash /dev/stdin --jsonfile /tmp/global.json --install-dir "$DOTNET_ROOT"

# Install gh and bun
RUN brew install gh
RUN brew install oven-sh/bun/bun

ENV BUN_INSTALL="/home/gitpod/.bun"
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

# Install Claude Code
RUN bun install -g @anthropic-ai/claude-code
