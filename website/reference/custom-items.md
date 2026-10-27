# Custom items {#custom-items}

Register each custom module under `custom.items`.
A module prepares content once for each selected layout instance.
It returns synchronous measurement and rendering functions.

A complete module can replace a built-in item name.
The names `row`, `column`, `auto`, `flow`, and `space` are reserved.

## Use a complete example {#complete-example}

The example renders one unwrapped text line.
During preparation, it captures the text, font, color, and a conservative width estimate.
It does not measure native text.

<<< ../examples/custom-item.js#custom-item

Replace the installed `custom` value with the example's `custom` object.
Copy the `customLayout` template-string value into your installed `layout` value.

This item keeps its original font size inside automatic regions because it does not implement `atFontScale`.
Do the [device checks](../guide/device-checks.md) with your actual labels and fonts.

## Prepare a snapshot {#prepare}

`prepare({ host, get }, options)` can load data and create reusable images, fonts, and colors.
It must not create native layout views.
Capture all values that measurement and rendering need.
Later preference or data changes must not change the prepared snapshot.

Declare private option types as `"string"`, `"number"`, or `"boolean"`.
Custom items use named options.
Only the registered `text` and `symbol` mappings accept positional strings.

Use `get(key, asyncLoader)` to share a resource promise during widget creation.
It stores pending, fulfilled, and rejected promises for that key.

## Return the item contract {#item-contract}

| Member | Requirement |
| --- | --- |
| `state` | `"ready"`, `"empty"`, or `"error"` |
| `effects` | An object with optional `refreshAfterDate` |
| `variants` | At least one valid presentation variant |
| `render(container, placement)` | A synchronous renderer for the allocated content area |
| `atFontScale(scale)` | Optional pure font adaptation method |

Give empty and error states a visible presentation.
A state value alone does not create a message.

Each variant has a unique nonempty `id` and a synchronous `measure(width)` function.
Its `minWidth` must be finite and nonnegative.
Its `preferredWidth` must be finite and at least `minWidth`.
Its optional `maxWidth` must be finite and at least `preferredWidth`.
Its `adaptationCost` must be finite and nonnegative.

## Measure and render {#measure-and-render}

Measurement receives content width after layout padding is removed.
Return finite, nonnegative `requiredHeight` and `preferredHeight` values.
`preferredHeight` must be at least `requiredHeight`.
Content needs a positive height for placement.
Set `confidence` to `"estimated"` or `"calibrated"` to describe the measurement evidence.

For the same snapshot and width, `measure` must return the same result.
It must not request data or create native views.

`placement` contains `id`, `variant`, `width`, `height`, and `textAlign`.
Render the selected variant inside this content allocation.
Do not fetch data or select a different variant during rendering.

## Support font adaptation {#font-adaptation}

`atFontScale(scale)` returns a new `PreparedItem` snapshot of the same content.
Keep the original snapshot unchanged.
Keep the same variant IDs.
Use matching scaled measurements and rendering.
Do not request data or create native views during adaptation.

For text originally at least 10pt, keep the adapted size at least 10pt.
For text originally smaller than 10pt, keep its original size.
The renderer uses the snapshot selected by the planner.
Built-in items implement font adaptation automatically.

## Request refresh and set the background {#effects-and-background}

Set `effects.refreshAfterDate` to a valid `Date` to request a refresh.
The renderer uses the earliest request, including the configured widget refresh interval.
The default interval is 15 minutes.
iOS can refresh later than requested.

A `custom.background(widget)` callback can set background styles.
It must not add child views.
Old `custom.name(column)` callbacks do not meet the measured item contract.
