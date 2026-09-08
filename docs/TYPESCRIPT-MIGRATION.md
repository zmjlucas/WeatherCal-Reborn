# TypeScript migration verification

The Codex worktree initially pointed at documentation-only commit
`35c31ec1c2be18971ed67b78b786f0364c5ea08e`. The actual JavaScript
implementation on `dev`, commit `727bc49232b9a62f26b1e95cd4396c9787f8c426`,
was clean and is the behavior baseline for this migration.

Before changing implementation, `npm run check` passed all 97 tests, built
the existing three scripts, and verified deterministic output. That baseline
run used the host's Node 25.9.0. The migrated toolchain pins Node 24.20.0 and
pnpm 11.19.0. Every requested dependency version was verified against npm
before installation; none was substituted. Node type definitions are pinned
separately to 24.10.1 for tests and build tools.

The package remains `weathercal-reborn` version `1.0.0`, licensed under MIT.
Generated files in `dist/` and local planning files in `.superpowers/` are
excluded from commits.
