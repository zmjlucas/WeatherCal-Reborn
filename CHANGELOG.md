# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
