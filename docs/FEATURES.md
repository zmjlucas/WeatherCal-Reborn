# Feature coverage

Upstream reference: the project linked in the [README credits](../README.md#credits), revision `5a83840781f94353a3c1f6562e79c9b15a17665e`, audited on 2026-09-08. The supported features and customization interfaces are listed below. The inert upstream diagnostic footer is not included.

| Feature | Implementation | Behavioral coverage |
| --- | --- | --- |
| Setup, permissions, provider/credential selection, preview, preferences, updates, export/import, reset | `src/setup/` | setup and distribution tests |
| Local/iCloud standalone widget, protected updates, duplicate widgets, custom object | `src/entry.ts`, `src/widget.ts` | integration and layout tests |
| Solid, automatic/custom gradient, light/dark Photos images, custom backgrounds | `src/widget.ts`, `src/core/gradient.ts`, `src/setup/backgrounds.ts` | layout/setup/distribution tests |
| Recursive row/column/auto/flow DSL, fixed/min/max dimensions, scoped alignment, fixed/flexible spaces | `src/layout/parser.ts`, `geometry.ts`, `placement.ts` | parser and planner tests |
| Bounded candidate planning, ordered flow, movable auto children, complete plans and failure diagnostics | `src/layout/planner.ts`, `candidates.ts` | planner tests |
| Automatic screen-profile viewports, manual overrides and plan-to-native-stack rendering | `src/layout/viewport.ts`, `device-profiles.ts`, `renderer.ts` | viewport, renderer and standalone tests |
| Prepared built-in/custom modules, shared data loading, width-dependent estimated text geometry and presentation variants | `src/items/registry.ts`, `presentation/`, `src/layout/data-session.ts` | prepared-item tests |
| Text/enum/bool/font/multi-value/multi-select editing; localization; default merging | `src/preferences/` | preference tests |
| Date sizes, greetings, events, reminders, calendar/list colors, empty-state behavior, deep links | `src/items/calendar.ts`, `basic.ts`, `src/data/agenda.ts` | item and data tests |
| Current/future weather, daily/hourly forecasts, rain, high/low bar, sunrise/sunset | `src/items/weather.ts`, `forecast.ts`, `sun.ts`, `src/data/weather.ts` | item/data/core tests |
| QWeather default, provider switching, secure QWeather keys, rate cooldown | `src/data/qweather.ts`, `qweather-response.ts`, `src/setup/weather-provider.ts` | QWeather and provider setup tests |
| Near-term QWeather summary with source link and bounded forecast validity | `src/data/rain.ts`, `rain-response.ts`, `src/items/rain.ts` | rain data and item tests |
| Battery level/charging, ISO week, text and SF Symbols | `src/items/basic.ts`, `src/core/drawing.ts` | item/core tests |
| Location/reverse geocoding, locale/units, API versions, bounded cache fallback | `src/data/`, `src/core/storage.ts` | data/core tests |
| Custom helper API, formatting, capitalization, fonts, colors and icon tint | `src/core/`, `src/create.ts` | core and integration tests |
| Converter companion script | `src/converter.ts`, `src/converter/tokens.ts`, `src/scriptable/converter.ts` | converter/build tests |

The 16 content item names are `date`, `greeting`, `events`, `reminders`, `current`,
`future`, `rain`, `forecast`, `daily`, `hourly`, `sunrise`, `sunset`, `text`,
`battery`, `week`, and `symbol`. `forecast`/`daily` are aliases; each occurrence
has its own layout identity. Explicit sunrise/sunset items show the named event
outside the previous hide window. `rain` is a QWeather short-term precipitation
item, independent of the rain percentage setting and next-hour/tomorrow switch.

Layouts use one recursive `row`, `column`, `auto` or `flow` tree, or a single
item. `auto` can reorder its direct children; `flow` preserves their reading
order. Manual groups stay intact. Node properties control alignment and spacing;
`space` is allowed only inside manual rows/columns. Old line commands, ASCII,
settings-object input and `left`/`right`/`center` directives are removed. Custom
items implement preparation, measurement and rendering under `custom.items`.
See [layout syntax and migration](LAYOUT.md).

The preference categories are widget, localization, font, date, events,
reminders, weather and symbol. The weather provider preference defaults
to QWeather. Blank or `auto` per-family viewport preferences detect reference
sizes from known screen profiles; manual dimensions and programmatic overrides
take priority. Unlisted screens require an override. Root padding comes from
the layout; `widget.padding` remains item-internal padding.

## Correctness changes

The refactor fixes undeclared loop variables, partial/corrupt settings,
asynchronous permission handling, same-name storage switching, stale per-render
state and missing custom-background files. Events include the whole final
requested day, including today when zero future days are selected. Forecast
reads are bounded; missing weather has a measured availability state and equal
temperature bounds produce finite drawing geometry. Reminder fonts, disabled
tap links and optional symbol settings are handled correctly.

The layout engine validates names/options before loading item data, captures
one presentation snapshot per instance, and evaluates candidates without native
view creation. Successful plans retain all selected instances and configured
fields. Width-dependent heights account for wrapping and the item's existing
line-limit rules; automatic adaptation keeps configured font sizes. Space
shortages and search exhaustion produce distinct diagnostics. These estimates
do not establish native text fit or calibrated device dimensions.

Export/import preserves exact script code, punctuation and custom functions, and embeds both background images. Update failures preserve installed code. Reset touches only the selected widget. The font editor preserves drafts when changing capitalization. The converter preserves surrounding syntax, quoted code examples and dollar-prefixed identifiers.

## Storage compatibility

The existing `weather-cal-<name>`, `weather-cal-preferences-<name>`, `weather-cal-api-key`, `weather-cal-api-path`, `weather-cal-setup`, `weather-cal-location`, and `Weather Cal/<name>.jpg` conventions remain.

Weather/sun caches include provider, coordinates, units and locale in their identity; QWeather also includes a random host-specific namespace, with the host mapping kept in Keychain. Hashed bounded filenames and an identity field prevent cross-widget contamination. Old unscoped weather caches remain untouched but are not reused because their settings cannot be established. The first refactored run needs a network fetch for those caches; old preferences and location are preserved.

## External service boundaries

Weather uses QWeather by default, with OpenWeather selectable. QWeather runtime requires a dedicated API Host and API Key; tests use only synthetic credentials and simulated current/hourly/daily and error responses, with no live API requests or quota usage. OpenWeather requires access to One Call; its existing 3.0 and legacy 2.5 validation behavior is retained and tested with fixtures. Neither provider was tested on an iPhone in this change. See [weather setup and rate handling](DEVELOPMENT.md#weather-providers).

Provider failures use bounded recent caches where available. Selected modules
render visible empty/error states when usable data is absent. Actual Scriptable
device behavior still needs the acceptance steps in
[DEVELOPMENT.md](DEVELOPMENT.md#on-device-acceptance), including viewport and text
calibration. This version targets small/medium/large home-screen widgets;
extra-large and lock-screen families need separate support.

The `rain` item uses QWeather's China-only, five-minute precipitation forecast for the next two hours. It displays the provider's summary text with a QWeather link; parsed forecast amounts and timestamps still determine data validity. It uses the configured widget refresh interval (15 minutes by default). Invalid, missing or stale data displays unavailable rather than clear weather. Tests use synthetic minutely responses; no live minutely API call or iPhone validation has been performed. See [rain item usage](DEVELOPMENT.md#near-term-rain-item).
