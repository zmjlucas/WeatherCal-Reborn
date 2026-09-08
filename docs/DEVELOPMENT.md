# Build, installation and verification

Use Node.js 22 or later. There are no npm dependencies and no install step.

```sh
npm run check
```

This runs behavioral tests, builds the three Scriptable scripts, checks JavaScript syntax and the 500-line source-module limit, and verifies deterministic output. The source modules do not use Node APIs at runtime. Node's file/path/crypto/VM APIs are only used by build tools and tests.

## Install locally

1. Run `npm run build`.
2. Copy **both** `dist/weather-cal.js` and `dist/weather-cal-code.js` into Scriptable's documents folder, either local or iCloud. Keep `weather-cal-code.js` under that exact name.
3. Open the launcher in Scriptable. Rename the launcher before setup if desired; each launcher name owns separate preferences and backgrounds.
4. Run it to choose a background, grant desired permissions, and optionally enter an OpenWeather key. Add a Scriptable home-screen widget selecting that launcher.
5. Change the layout and `custom` object in the installed launcher. Use the app's Edit preferences menu for fonts, data selection, localization and other settings.

Do not copy the CommonJS `src/` tree directly into Scriptable. The build emits a standalone module compatible with Scriptable's [`importModule`](https://docs.scriptable.app/importmodule/). Generated output lives in ignored `dist/`; it is reproducible and does not belong in source commits.

The launcher downloads a missing engine and the Update code menu fetches the latest **WeatherCal-Reborn release asset**. These URLs become available only after a release containing the assets has been published. Until then, install both local build outputs manually. Updating the engine preserves custom launcher code. Reset intentionally replaces the current launcher and removes only its own preferences/background images after the replacement download succeeds.

## Custom items and backgrounds

Existing custom methods and helpers remain supported. The engine keeps the original `this`-based internal context and public names, including `runSetup(name, iCloudInUse, codeFilename, gitHubUrl)` and `createWidget(layout, name, iCloudInUse, custom)`. `layout` can be a text DSL/ASCII string or a complete legacy settings object with a `layout` field.

```js
const custom = {
  greeting(column) {
    code.provideText('Hello from my widget', column, code.format.greeting, true)
  },
  background(widget) {
    widget.backgroundColor = Color.black()
  }
}
```

Custom methods override built-ins. The launcher already passes `custom` to `createWidget`. Export saves the full launcher source, preserving these custom methods, plus preferences/backgrounds and embedded image appearances. `createWeatherCal()` is available for independent contexts when another script manages several widgets.

The optional `dist/weather-cal-converter.js` converts a conventional single-ListWidget script into a custom method. It preserves fixed widget parameters, moves content into a stack and removes root presentation/completion calls. Review the generated method before installing it: source with multiple widgets, indirect constructors, template-expression logic or its own setup may require manual adaptation. The converter is a source-editing assistant, not a general JavaScript transpiler.

## Modules and tests

- `src/widget.js`, `src/layout/`: widget lifecycle, backgrounds and both layout syntaxes.
- `src/core/`: formatting, symbols/drawing, gradients, prompts and storage.
- `src/preferences/`: independent schema categories, persistence and editor UI.
- `src/data/`: calendar/reminder filters, location, weather/sun and feed transports.
- `src/items/`: rendering, independent of request/persistence implementations.
- `src/setup/`: onboarding, menus, background selection and distribution.
- `src/create.js`, `src/index.js`: compatibility composition and optional context factory.
- `src/scriptable/`: editable launcher and converter interface.
- `scripts/`: deterministic build and source checks.

Tests use realistic Scriptable boundary doubles for filesystem, UI and drawing APIs. They exercise production modules and generated scripts, but do not prove actual iOS typography, widget sizing, permissions UI, network access or home-screen refresh behavior. No paid API credentials are used in the suite.

## On-device acceptance

After installing both build outputs, verify these device-dependent paths before publishing:

- Small, medium and large previews; home-screen widget with both text and ASCII layouts.
- Light/dark solid and gradient backgrounds; both image appearances; custom background.
- Calendar/reminder permissions, selected lists, all-day/ongoing events, overdue reminders.
- OpenWeather key/subscription, correct units/locality, forecast and sunrise times; cached offline rendering.
- Custom item overrides, text/SF Symbols, battery/charging, greetings, week and feeds.
- Edit every preference type; duplicate and rename launchers; export/import custom source and images.
- iCloud hydration; update preserves launcher; reset preserves other widgets.

## Commits

Use [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `<type>(<scope>): <description>`. Choose a scope for the component, such as `core`, `preferences`, `layout`, `data`, `items`, `setup`, or `scriptable`.

Keep each commit focused on one responsibility and include its relevant tests. Use `feat` for new behavior, `fix` for corrections, `refactor` for behavior-preserving changes, `build` for build tooling, `ci` for workflows, and `docs` for documentation. Keep unrelated changes separate and fold review fixes into their owning commits before merging. Mark breaking API changes with `!` or a `BREAKING CHANGE:` footer.

## Releases

Keep `package.json` on Semantic Versioning. Move the Unreleased changelog entries to the release version/date before publication. CI checks changes and uploads the built scripts as an artifact. When a maintainer publishes a release tagged `v<package.json version>`, a separate job attaches the three scripts and `SHA256SUMS` to that release. No release is created automatically by a commit, and no release was published as part of this refactor.
