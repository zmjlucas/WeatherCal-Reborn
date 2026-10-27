# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Breaking:** Replaced line-based layout commands, ASCII layouts and settings-object input with one recursive `row`/`column`/`auto`/`flow` DSL. Automatic regions preserve every selected instance; `auto` may reorder direct children and `flow` preserves their reading order. Existing user regions require manual migration.
- **Breaking:** Custom items now register under `custom.items` and return prepared variants, measurements and synchronous rendering. Removed opaque item callbacks, shared layout/alignment state and empty event/reminder callback dispatch. Custom backgrounds set styles only.
- **Breaking:** Root padding moves to the layout DSL; the old `widgetPadding` preference is removed. Unknown viewports produce a diagnostic widget with manual override instructions.
- Built-in content now uses prepared snapshots, shared data requests and field-preserving orientation variants. Empty/error content remains visible, rain displays QWeather's summary with a source link, and explicitly selected sun events remain visible outside the old time window.
- Removed obsolete orientation, sun-window/automatic-event and empty-item dispatch preference controls. Set item orientation with the layout's `variant` property; empty calendar/reminder items use their localized message.
- Releases upload only `WeatherCal-Reborn-v<version>.js`, alongside GitHub's automatic source ZIP and tar.gz archives. Local builds and CI artifacts still include the converter and checksums.
- Update and reset discover the versioned script through the latest stable GitHub release metadata. Older installations using the fixed `one.js` URL require one manual upgrade.

### Added

- Family-specific layout presets before general auto/flow search, including side panels beside stacked items. When original fonts do not fit, automatic content tries measured 90%/80%/70% fonts with a 10pt floor, preserving selected content and manual constraints. Custom prepared items can opt in through `atFontScale`.
- Bounded, deterministic layout planning with width-dependent height estimates, fixed/min/max dimensions, local alignment, explicit gaps/padding and complete-plan diagnostics.
- Automatic viewport detection for small, medium and large widgets using sourced screen-size profiles. Blank or `auto` settings select detection; manual per-family and programmatic dimensions take priority. Home-screen runs and app previews use their own selected family. Profiles assume standard icons; unknown screens require a manual override.
- Layout syntax, custom-module and viewport-calibration documentation. Automated geometry tests and reference size tables do not replace device validation.

### Fixed

- Small weather layouts no longer rely only on fixed-font row/band structures. Duplicate structures are deduplicated, search budgets are shared across fallback stages, and frontier pruning alone no longer reports `SEARCH_LIMIT_REACHED`.

## [0.1.0] - 2026-10-26

Initial beta release. On-device Scriptable verification is still required; automated weather-provider tests use offline doubles.

### Removed

- Removed COVID statistics and RSS/Atom news, including their widget items, data services, settings, fonts and localization. Existing layouts and custom code must remove references to these features; no compatibility layer is provided.

### Changed

- Migrated the complete widget engine, converter and behavior tests to strict TypeScript, preserving persisted widget settings and backgrounds.
- Replaced the two-file widget installation with self-contained `one.js`, preserving editable layout/custom regions during validated updates. Legacy installations migrate manually.
- Pinned Node 24.20.0 and pnpm 11.19.0, added esbuild bundles, AST runtime checks, deterministic SHA256SUMS and strict CI checks.
- Scoped provider caches prevent units, locale and location settings from mixing between widgets.
- Engine download/update paths target WeatherCal-Reborn release assets.

### Added

- QWeather as the default weather provider, with per-widget selection of QWeather or OpenWeather and separate credential configuration.
- QWeather current, hourly and daily weather, timestamp-aligned forecasts, cached requests and persistent rate-limit cooldowns.
- Automatic temperature units based on the device region, with manual overrides.
- Safe iCloud test-widget uploads with backups and preservation of installed customizations.

- Weather-Cal functionality in focused modules, with public customization methods and editable preferences.
- Date, calendar, reminder, weather and utility widget items, both layout syntaxes, localization, preference editing, backgrounds, setup, preview, export/import, updates, reset and the converter companion.
- Dependency-free Scriptable builds, SHA-256 checksums, behavioral tests and CI/release-asset workflow for version 0.1.0.
- Feature coverage, installation, migration and on-device verification documentation.

### Fixed

- Isolated widget state, iCloud hydration, default merging and denied-permission handling.
- Event date windows, forecast bounds, unavailable data, equal-temperature drawing, font drafts, reminder formatting and optional symbol sizing.
- Layout parameter parsing and final ASCII rows.
- Portable custom-code/image exports, scoped reset and converter expression handling.
