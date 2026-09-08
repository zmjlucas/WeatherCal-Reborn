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

## Verified migrated implementation

- `pnpm install --frozen-lockfile`: passed using pnpm 11.19.0.
- `pnpm node --version`: v24.20.0; TypeScript 7.0.2 and Vitest 4.1.11 verified.
- `pnpm check`: passed in the required order: typecheck, test, build, bundle validation.
- Vitest: 130 tests passed across 16 files. Ninety original test names remain;
  seven tests coupled to the old packager were replaced with standalone
  delivery checks. All test execution uses migrated source or fresh bundles.
- Both final scripts ran in an isolated Node VM with Scriptable boundary
  doubles, including normal execution, setup cancellation, custom errors,
  converter cancellation/invalid input/picker failure and completion counts.
- Actual `one.js` ran with all built-in items, custom components and background,
  local/iCloud storage, missing permissions and corrupt settings. The suite also
  covers object/text/ASCII layouts, numeric/empty settings, stale offline caches,
  short forecasts and independent contexts.
- A customized final `one.js` was exported with settings and both image
  appearances, imported under a new name, and executed again. Other widget
  files remained unchanged. Updates preserve installed metadata and user code;
  invalid downloads, syntax, regions, conflicting declarations and wrong widget
  targets are rejected before writing.
- Acorn validates executable AST references rather than matching source text.
  All runtime imports/exports, dynamic imports, import metadata, CommonJS and
  unsupported Node/browser globals are rejected. `module.filename` is retained
  solely as the Scriptable storage/identity API.
- Consecutive builds are identical, and SHA256SUMS matches both files.
- `git diff --check`: passed.

The full MIT notices for WeatherCal and the bundled Acorn parser are included
in the generated widget. Two unsupported, inert legacy assignments to
`WidgetImage.size` and `WidgetText.size` were removed rather than introducing
new visible sizing behavior. Legacy service overrides can continue to mutate
`this.data` and return nothing; custom objects may retain their own state.

## Device validation boundary

The checks above are Node simulations using production code and generated
scripts. No real iOS device validation, paid weather request, release publication
or push was performed. Native typography, OS permission dialogs, iCloud behavior
on a device and home-screen refresh still require the on-device acceptance steps
in [DEVELOPMENT.md](DEVELOPMENT.md).
