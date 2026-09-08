# Feature coverage

Compatibility reference: the project linked in the [README credits](../README.md#credits), revision `5a83840781f94353a3c1f6562e79c9b15a17665e`, audited on 2026-09-08. All 71 callable engine methods, the enum object, and all 101 original preference descriptors are retained. `covid.apiUrl` adds a compatible statistics endpoint override. The inert upstream diagnostic footer is not included.

| Feature | Implementation | Behavioral coverage |
| --- | --- | --- |
| Setup, permissions, API signup/key entry, preview, preferences, updates, export/import, reset | `src/setup/` | setup and distribution tests |
| Local/iCloud launcher, automatic engine download, duplicate widgets, custom object | `src/scriptable/launcher.js`, `src/widget.js` | integration and layout tests |
| Solid, automatic/custom gradient, light/dark Photos images, custom backgrounds | `src/widget.js`, `src/core/gradient.js`, `src/setup/backgrounds.js` | layout/setup/distribution tests |
| Text DSL, ASCII rows/columns, dimensions, alignment, fixed/flexible spaces, custom dispatch | `src/layout/engine.js` | layout tests |
| Text/enum/bool/font/multi-value/multi-select editing; localization; default merging | `src/preferences/` | preference tests |
| Date sizes, greetings, events, reminders, calendar/list colors, empty-state behavior, deep links | `src/items/calendar.js`, `basic.js`, `src/data/agenda.js` | item and data tests |
| Current/future weather, daily/hourly forecasts, rain, high/low bar, sunrise/sunset | `src/items/weather.js`, `forecast.js`, `sun.js`, `src/data/weather.js` | item/data/core tests |
| Battery level/charging, ISO week, text and SF Symbols | `src/items/basic.js`, `src/core/drawing.js` | item/core tests |
| RSS/Atom news, dates, links, COVID numeric tokens | `src/items/feeds.js`, `src/data/feeds.js` | item/data tests |
| Location/reverse geocoding, locale/units, API versions, bounded cache fallback | `src/data/`, `src/core/storage.js` | data/core tests |
| Custom helper API, formatting, capitalization, fonts, colors and icon tint | `src/core/`, `src/create.js` | core and integration tests |
| Converter companion script | `src/converter.js`, `src/converter/tokens.js`, `src/scriptable/converter.js` | converter/build tests |

The 17 content item names are `date`, `greeting`, `events`, `reminders`, `current`, `future`, `forecast`, `daily`, `hourly`, `sunrise`, `sunset`, `covid`, `text`, `battery`, `week`, `symbol`, and `news`. `forecast`/`daily` are aliases; sunrise/sunset remain automatic unless their separate-elements preference is enabled. Layout directives include `row`, `column`, `space`, `left`, `right`, and `center`; alignment helpers remain exposed to custom code.

All original preference categories remain: widget, localization, font, date, events, reminders, sunrise, weather, covid, symbol and news. Existing category/item names and default values remain compatible.

## Correctness changes

The refactor fixes undeclared loop variables, partial/corrupt settings, asynchronous permission handling, same-name storage switching, stale per-render state, missing custom-background files, nested layout parameters and unclosed ASCII rows. Events include the whole final requested day, including today when zero future days are selected. Forecast reads are bounded; missing weather and equal temperature bounds produce valid placeholders/drawing geometry. Reminder fonts, disabled tap links, zero statistics, optional symbol settings and missing news dates are handled correctly.

Export/import preserves exact launcher code, punctuation and custom functions, and embeds both background images. Update failures preserve installed code. Reset touches only the selected widget. The font editor preserves drafts when changing capitalization. The converter preserves surrounding syntax, quoted code examples and dollar-prefixed identifiers.

## Storage compatibility

The existing `weather-cal-<name>`, `weather-cal-preferences-<name>`, `weather-cal-api-key`, `weather-cal-api-path`, `weather-cal-setup`, `weather-cal-location`, and `Weather Cal/<name>.jpg` conventions remain.

Weather/sun caches now include coordinates, units and locale in their identity. News caches use the full feed URL, while COVID caches include endpoint and country. Hashed bounded filenames and an identity field prevent cross-widget contamination. Old unscoped weather/COVID caches and URL-named news caches remain untouched but are not reused because their settings cannot be established. The first refactored run needs a network fetch for those caches; old preferences and location are preserved.

## External service boundaries

Weather requires a working OpenWeather key and access to the selected One Call product; endpoint validation retains 3.0 and legacy 2.5 behavior. Tests use recorded-shape fixtures and simulated errors, not a paid live subscription. See [OpenWeather One Call](https://openweathermap.org/api/one-call-3).

The original COVID Heroku endpoint returned 404 during this audit. The default replacement uses the compatible [disease.sh endpoint implementation](https://github.com/disease-sh/API/blob/master/routes/v3/covid-19/apiWorldometers.js), with an optional full endpoint override in preferences. The default Worldometer source stopped updating on **April 13, 2024**, so this item displays historical statistics, not current surveillance. Live access to disease.sh could not be verified from this environment (HTTP 403). See [Worldometer's source notice](https://www.worldometers.info/coronavirus/).

Provider failures use bounded recent caches where available. Widgets can render placeholders without network access. Actual Scriptable device behavior still needs the acceptance steps in [DEVELOPMENT.md](DEVELOPMENT.md).
