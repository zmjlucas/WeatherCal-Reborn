# Build, installation and verification

Use Node.js **24.20.0** and pnpm **11.19.0**. `.nvmrc`, the package
engines and pnpm runtime management declare these exact versions. pnpm can
install the declared Node runtime automatically.

```sh
pnpm install --frozen-lockfile
pnpm check
```

`check` runs `typecheck → test → build → validate:bundle`. Scriptable business
code is checked with only ES2020 and Scriptable types; Node tools and tests
have a separate configuration. `pnpm test:watch` runs the interactive tests.
Type checking generates ignored `.typecheck/` API declarations directly from
the production source and scopes the installed Scriptable declarations as a
module. This avoids conflicts with Node's `Request`, `console` and `module`
globals. Vitest resolves `#source/*` directly to `src/*` at runtime; generated
declarations contain no executable test implementation.
The build uses esbuild with no minification or source maps. Validation parses
the actual artifacts with Acorn, checks runtime references, checksums,
consecutive build identity, and the 500-line source module limit.

## Install locally

1. Run `pnpm build`.
2. Copy **`dist/one.js`** into Scriptable, either local or iCloud. It contains
   the complete engine and does not download or import another module.
3. Rename the installed script before setup if desired. Each script name owns
   separate preferences and backgrounds.
4. Run it to choose a background, grant desired permissions, and optionally
   enter an OpenWeather key. Select that script in a Scriptable home-screen widget.
5. Edit `layout` and `custom` between the `WeatherCal: user begin v1` and
   `WeatherCal: user end v1` comments. Keep all four boundary comments intact.
   The generated engine occupies its own marked region.

Install `dist/weather-cal-converter.js` separately if you need conversion.
Both scripts start with Scriptable metadata. `dist/` is generated and ignored.

The Update code menu downloads `one.js` from the latest WeatherCal-Reborn
release, validates its boundaries and JavaScript syntax, preserves the installed
metadata and user region exactly, and replaces only the engine region. Failed
downloads or validation leave the existing script untouched. Preferences,
background images and the script name are preserved. Release download URLs
will work only once a maintainer publishes the new assets; until then use local
builds. Reset requires explicit confirmation and restores the downloaded
script's default user region, then removes only this widget's data.

### Moving an existing dual-file installation

There is no automatic replacement of legacy installations. Save a backup of
your current script and its custom code first. Manually install `one.js` under
the **same Scriptable name** and storage location, and copy your original layout
and custom object into the new editable region. Existing preference/background
filenames and API-key/cache formats remain compatible; you do not need to clear
or re-enter settings. Leave the shared legacy engine available while other old
scripts still use it.

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

Custom methods override built-ins. The entry already passes `custom` to `createWidget`. Export saves the full installed script source, preserving these custom methods, plus preferences/backgrounds and embedded image appearances. `createWeatherCal()` is available for independent contexts when another script manages several widgets.

The optional `dist/weather-cal-converter.js` converts a conventional single-ListWidget script into a custom method. It preserves fixed widget parameters, moves content into a stack and removes root presentation/completion calls. Review the generated method before installing it: source with multiple widgets, indirect constructors, template-expression logic or its own setup may require manual adaptation. The converter is a source-editing assistant, not a general JavaScript transpiler.

## Modules and tests

- `src/widget.ts`, `src/layout/`: widget lifecycle, backgrounds and both layout syntaxes.
- `src/core/`: formatting, symbols/drawing, gradients, prompts and storage.
- `src/preferences/`: independent schema categories, persistence and editor UI.
- `src/data/`: calendar/reminder filters, location, weather/sun and feed transports.
- `src/items/`: rendering, independent of request/persistence implementations.
- `src/setup/`: onboarding, menus, background selection and distribution.
- `src/create.ts`, `src/index.ts`: compatibility composition and optional context factory.
- `src/entry.ts`, `src/user.ts`: widget completion flow and editable layout/custom defaults.
- `src/scriptable/`: independent converter interface.
- `scripts/`: deterministic build and source checks.

Tests use realistic Scriptable boundary doubles for filesystem, UI and drawing APIs. They exercise production modules and generated scripts, but do not prove actual iOS typography, widget sizing, permissions UI, network access or home-screen refresh behavior. No paid API credentials are used in the suite.

## On-device acceptance

After installing the widget and optional converter, verify these device-dependent paths before publishing:

- Small, medium and large previews; home-screen widget with both text and ASCII layouts.
- Light/dark solid and gradient backgrounds; both image appearances; custom background.
- Calendar/reminder permissions, selected lists, all-day/ongoing events, overdue reminders.
- OpenWeather key/subscription, correct units/locality, forecast and sunrise times; cached offline rendering.
- Custom item overrides, text/SF Symbols, battery/charging, greetings, week and feeds.
- Edit every preference type; duplicate and rename scripts; export/import custom source and images.
- iCloud hydration; update preserves script; reset preserves other widgets.

## Commits

Use [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `<type>(<scope>): <description>`. Choose a scope for the component, such as `core`, `preferences`, `layout`, `data`, `items`, `setup`, or `scriptable`.

Keep each commit focused on one responsibility and include its relevant tests. Use `feat` for new behavior, `fix` for corrections, `refactor` for behavior-preserving changes, `build` for build tooling, `ci` for workflows, and `docs` for documentation. Keep unrelated changes separate and fold review fixes into their owning commits before merging. Mark breaking API changes with `!` or a `BREAKING CHANGE:` footer.

## Releases

Keep `package.json` on Semantic Versioning. Move the Unreleased changelog entries to the release version/date before publication. CI checks changes and uploads the built scripts as an artifact. When a maintainer publishes a release tagged `v<package.json version>`, a separate job attaches `one.js`, `weather-cal-converter.js` and `SHA256SUMS` to that release. No release is created automatically by a commit, and no release was published as part of this refactor.
