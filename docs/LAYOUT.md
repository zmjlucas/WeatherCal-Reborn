# Layout syntax and sizing

The editable `layout` string describes one tree of content items and containers.
The engine prepares each item, plans the complete tree for a known viewport,
then renders native Scriptable stacks. Every selected item remains in a
successful plan, including repeated names and items with empty or error states.

This replaces the earlier line-based commands, ASCII layouts and settings-object
input. Existing installations must rewrite their layout and custom items before
using this engine. Updates preserve the user region; they do not translate its
old syntax.

## Configure the viewport first

The engine supports home-screen `small`, `medium` and `large` families. Set the
corresponding `widget.smallViewport`, `widget.mediumViewport` or
`widget.largeViewport` preference in Overall settings to `width x height`, in
logical points. Each value describes the available ListWidget area with native
padding set to zero. These preferences start blank.

There is no built-in table of verified phone dimensions. An unset viewport
produces a `VIEWPORT_UNKNOWN` diagnostic widget; malformed dimensions produce
`VIEWPORT_INVALID`. A screen's point or
pixel dimensions cannot substitute for its widget's dimensions. A programmatic
caller can supply an explicit viewport instead of using the saved preference:

```js
const widget = await code.createWidget(layout, name, iCloudInUse, custom, {
  family: "medium",
  viewport: { width: 320, height: 160 }
})
```

The numbers above are example bounds for an experiment, not a calibrated device
profile. The installed entry selects the preview family before planning. A
home-screen run uses `config.widgetFamily`; an explicit family must agree with
it. Extra-large and accessory/lock-screen families are outside this version's
supported scope.

## Automatic and manual layouts

Use `auto` when the engine may reorder the selected items:

```js
const layout = `auto(padding: 12)[rain, current, future]`
```

Use `flow` when the listed reading order must stay the same:

```js
const layout = `flow(padding: 12)[rain, current, future]`
```

Both containers compare rows, columns, groups of two or three columns, and a
full-width item above or below grouped items. `auto` may move its direct children;
`flow` preserves their order when the resolved tree is read row by row. Neither
container can move an item out of a manual group.

Use `row` and `column` to keep a structure fixed. Automatic regions can appear
inside either:

```js
const layout = `
column(padding: 12, gap: 8)[
  date,
  auto[rain, current, future]
]
`
```

```js
const layout = `
row(padding: 12, gap: 12)[
  column(width: 96, gap: 6)[date, battery],
  auto[rain, current, future]
]
`
```

The fixed width in this example is a user constraint. Whether all the content
fits depends on the configured viewport, fonts, language and data. A manual
subtree is one indivisible child when placed inside `auto` or `flow`.

Several automatic regions share their parent's budget. Positive `grow` weights
divide space remaining after minimum needs are met:

```js
const layout = `column(padding: 12)[
  flow(grow: 1)[date, battery],
  auto(grow: 2)[rain, column(gap: 4)[current, future]]
]`
```

The resulting heights need not be exactly 1:2 because each region first receives
the space required by its content.

## Grammar and properties

There must be exactly one root node. Whitespace and indentation are optional;
commas between children and arguments are required. Trailing commas, `//`
comments and non-nested `/* ... */` comments are accepted. Strings use JSON
double-quote escapes. Arguments contain literal numbers, strings, booleans or
arrays; the parser does not evaluate JavaScript.

```js
const layout = `column(gap: 6, textAlign: "start", padding: [8, 12, 8, 12])[
  text("Good morning, Lucas"),
  row(gap: 8)[symbol("cloud.rain.fill"), space, battery],
  space(4),
  flow[current, future]
]`
```

| Property | Meaning | Default |
| --- | --- | --- |
| `width`, `height` | Fixed outer dimension, including this node's padding; positive points | Content and parent allocation |
| `minWidth`, `minHeight` | Nonnegative lower bound on the outer frame | Content requirement |
| `maxWidth`, `maxHeight` | Positive upper bound on the outer frame | No explicit bound |
| `grow` | Remaining-space weight along a manual parent's main axis; nonnegative | 1 for auto/flow and flexible space; 0 for items and other containers |
| `gap` | Spacing between a container's direct children | 8 points |
| `padding` | Nonnegative points or `[top, right, bottom, left]` | 0, including the root |
| `align` | Manual container cross-axis alignment: `"start"`, `"center"`, `"end"`, `"stretch"` | `"stretch"` |
| `justify` | Manual container main-axis alignment: `"start"`, `"center"`, `"end"`, `"between"` | `"start"` |
| `textAlign` | Inherited text alignment: `"start"`, `"center"`, `"end"` | `"start"` |
| `variant` | Fix a content item's registered presentation variant | Planner chooses |

Only `textAlign` inherits. Root padding comes from the DSL; the old
`widgetPadding` preference is removed. `widget.padding` still controls padding
inside built-in items and contributes to their measured size.

The root occupies the entire viewport. Explicit root width/height must match
that viewport; put a fixed-size child inside a root container to describe a
smaller region. Minimum, maximum and fixed dimensions must agree. A node cannot
combine positive `grow` with a fixed dimension on its manual parent's main axis.
Direct children of `auto`/`flow` cannot specify `grow` because their arrangement
is selected during planning.

`space(4)` is a fixed main-axis gap. `space` is flexible with weight 1;
`space(grow: 2)` has weight 2. Spaces must be direct children of `row` or `column`.
Use `gap` within automatic containers. Empty manual containers are allowed;
`auto` and `flow` require at least one child.

Unknown names, unsupported properties, duplicate arguments and invalid values
produce located diagnostics. Item names and their private options are checked
before content loading begins.

## Built-in items

| Names | Content and variants |
| --- | --- |
| `date`, `greeting`, `battery`, `week` | Date, greeting, battery and ISO week; `normal` variant |
| `events`, `reminders` | Configured entries, with a visible localized message when empty; `normal` |
| `current` | Configured current weather fields; `inline` or `stacked` |
| `future` | Next hour or tomorrow according to weather preferences; `normal` |
| `forecast`, `daily` | Alias names for daily forecasts; `horizontal` or `vertical` |
| `hourly` | Hourly forecast; `horizontal` or `vertical` |
| `rain` | QWeather minutely summary with a source link, or availability message; `normal` |
| `sunrise`, `sunset` | The named sun event, including a visible unavailable state; `normal` |
| `text("Hello")` | Custom text; the string maps to `text`, also written `text(text: "Hello")`; `normal` |
| `symbol("cloud.fill")` | SF Symbol; the string maps to `name`, also written `symbol(name: "cloud.fill")`; `normal` |

For example, `current(variant: "stacked")` fixes the stacked presentation.
Variants preserve configured fields and fonts. Tomorrow's daytime and nighttime
rain probabilities remain separate. Layout adaptation does not remove entries,
hide descriptions or reduce font sizes. Existing item line-limit rules still
apply, and their height estimates account for those limits.

Explicit sunrise/sunset items always render their named event; after sunset,
`sunrise` shows tomorrow's sunrise. The previous time-window and automatic
sunrise/sunset controls are removed. Event/reminder empty states use their
localized message, with a visible fallback when that message is blank.
Orientation controls now belong to each item's `variant` property; the earlier
horizontal weather/forecast preferences are removed.

## Custom ItemModule

Register custom modules under `custom.items`. Each module prepares once per
layout instance and returns synchronous measurements and rendering. A complete
custom module may replace a built-in name. `row`, `column`, `auto`, `flow` and
`space` are reserved.

This example uses one unwrapped text line and a conservative minimum width. It
captures the font and color during preparation:

```js
const custom = {
  items: {
    status: {
      options: { label: "string" },
      async prepare({ host }, options) {
        const text = String(options.label || "Ready")
        const size = Number(host.format.defaultText.size)
        const font = host.provideFont(host.format.defaultText.font, size)
        const color = host.provideColor()
        const minWidth = [...text].length * size * 1.1 + 4
        const height = size * 1.4 + 4
        return {
          state: "ready",
          effects: {},
          variants: [{
            id: "normal",
            minWidth,
            preferredWidth: minWidth,
            adaptationCost: 0,
            measure(width) {
              return {
                requiredHeight: height,
                preferredHeight: height,
                confidence: "estimated"
              }
            }
          }],
          render(container, placement) {
            const line = container.addText(text)
            line.font = font
            line.textColor = color
            line.lineLimit = 1
            line.minimumScaleFactor = 1
            if (placement.textAlign === "end") line.rightAlignText()
            else if (placement.textAlign === "center") line.centerAlignText()
            else line.leftAlignText()
          }
        }
      }
    }
  },
  background(widget) {
    widget.backgroundColor = Color.black()
  }
}

const layout = `column(padding: 12)[status(label: "Ready"), current]`
```

Private option types can be `"string"`, `"number"` or `"boolean"`. Positional
strings are reserved for the registered `text`/`symbol` mappings. Custom items
use named options.

`prepare({ host, get }, options)` may load data and create reusable images,
fonts and colors. Use `get(key, asyncLoader)` to share a resource promise across
items in this creation. It caches pending, fulfilled and rejected promises.
Preparation must not create native layout views. Capture the data needed by
`measure` and `render` so later data or preference changes cannot alter a plan.

Measurements receive content width after outer padding is deducted. They must
return finite, nonnegative heights with `preferredHeight >= requiredHeight`;
content needs a positive height to be placed. `measure` must be deterministic,
synchronous and free of data requests or view creation. `render(container,
placement)` receives the selected variant, content width/height and inherited
text alignment. It fills that allocation synchronously without fetching data
or choosing another variant.

Use `state: "empty"` or `"error"` with a visible presentation when data is
missing. `effects.refreshAfterDate` requests a refresh; the renderer merges
requests by earliest date, including the widget refresh interval configured in
Overall settings (15 minutes by default). The built-in rain item uses that shared
schedule. The background callback may set background styles
but must not add children. Old `custom.name(column)` callbacks and converter
output without measurements do not satisfy this contract.

## Diagnostics and search limits

| Diagnostic | Meaning |
| --- | --- |
| `VIEWPORT_UNKNOWN` | No usable dimensions for the selected family |
| `VIEWPORT_INVALID` | Configured dimensions are malformed or nonpositive |
| `FAMILY_UNSUPPORTED`, `FAMILY_CONFLICT` | The selected family is unsupported or disagrees with the active widget |
| `ITEM_CONTRACT_INVALID` | A custom item or measurement violates the module contract |
| `CONSTRAINT_CONFLICT` | A directly checked constraint is inconsistent, such as a root size that differs from the viewport |
| `NO_CANDIDATE_FITS` | The evaluated candidate family cannot fit all selected content |
| `SEARCH_LIMIT_REACHED` | Search stopped before finding a complete feasible candidate |
| `SEARCH_TRUNCATED` | A complete plan was found, but search stopped before considering all candidates |

The parser allows at most 128 nodes, 12 nesting levels, and 12 direct children
per automatic region. Default planning budgets are 256 structural candidates
per automatic region (across proposed widths) and 4,096 distinct measurements
per plan; each intermediate frontier retains at most 24 combinations. These are engine budgets, not Scriptable
platform limits. Search is deterministic for the same snapshot and configuration
and does not exhaust every possible arrangement.

A failed plan produces a diagnostic widget rather than a partial content tree.
Try a larger verified viewport, fewer selected items, smaller configured fonts,
or less restrictive manual dimensions. A successful estimated plan still needs
on-device inspection.

## Device calibration

For each target device, family, OS version and display-zoom configuration:

1. Establish the usable ListWidget width and height with native padding zero,
   checking both app preview and the home screen. Record logical points.
2. Verify fixed frames, root/item padding, gaps and alignment using visible
   backgrounds or borders and known-size content.
3. Check long Chinese/English titles, negative temperatures, next-hour/tomorrow
   states, daytime/nighttime rain, and unavailable data with the chosen fonts.
4. Inspect small-widget tap behavior, medium/large item links, backgrounds and
   refresh requests. Small widgets have one widget-level tap target.
5. Run a layout near the node/search limits and record runtime and memory
   behavior. Confirm all selected instances appear once.

The repository's mock tests verify tree geometry and control flow. They do not
measure native text, detect actual clipping or establish calibrated phone sizes.
See the [platform research](research/scriptable-layout-systems.md) for the public
Scriptable APIs and research context; its earlier design suggestions are
superseded by the interfaces documented here.
