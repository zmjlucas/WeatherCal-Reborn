# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Migrated the complete widget engine, converter and behavior tests to strict TypeScript, preserving persisted widget settings and backgrounds.
- Replaced the two-file widget installation with self-contained `one.js`, preserving editable layout/custom regions during validated updates. Legacy installations migrate manually.
- Pinned Node 24.20.0 and pnpm 11.19.0, added esbuild bundles, AST runtime checks, deterministic SHA256SUMS and strict CI checks.

### Added

- Full upstream Weather-Cal functionality in focused JavaScript modules, preserving all 71 public methods and all 101 existing preferences.
- All widget items, both layout syntaxes, localization, preference editing, backgrounds, setup, preview, export/import, updates, reset and the converter companion.
- Dependency-free Scriptable builds, SHA-256 checksums, behavioral tests and CI/release-asset workflow for version 1.0.0.
- Feature parity, installation, migration and on-device verification documentation.

### Fixed

- Isolated widget state, iCloud hydration, default merging and denied-permission handling.
- Event date windows, forecast bounds, unavailable data, equal-temperature drawing, font drafts, reminder formatting and optional symbol sizing.
- Layout parameter parsing, final ASCII rows, RSS/Atom decoding, missing feed dates and zero-valued statistics.
- Portable custom-code/image exports, scoped reset and converter expression handling.

### Changed

- Scoped provider caches prevent units, locale, location and feed settings from mixing between widgets.
- Engine download/update paths target WeatherCal-Reborn release assets.
- Replaced the unavailable COVID endpoint with a configurable compatible endpoint; the default source provides historical totals and is documented accordingly.
