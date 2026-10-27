# Built-in items {#built-in-items}

Each occurrence of a name creates a separate item instance.
A successful plan contains all selected instances, including empty and error presentations.

## Select an item {#select-an-item}

| Name | Content | Variants |
| --- | --- | --- |
| `date` | Date | `normal` |
| `greeting` | Greeting | `normal` |
| `battery` | Battery state | `normal` |
| `week` | ISO week | `normal` |
| `events` | Configured calendar entries or an empty message | `normal` |
| `reminders` | Configured reminders or an empty message | `normal` |
| `current` | Configured current weather fields | `inline`, `stacked` |
| `future` | Next hour or tomorrow, from weather preferences | `normal` |
| `forecast`, `daily` | Daily forecasts; these names are aliases | `horizontal`, `vertical` |
| `hourly` | Hourly forecast | `horizontal`, `vertical` |
| `rain` | QWeather minutely summary with a source link, or a message when data is unavailable | `normal` |
| `sunrise` | Sunrise, including tomorrow's sunrise after sunset | `normal` |
| `sunset` | Sunset | `normal` |
| `text("Hello")` | Custom text | `normal` |
| `symbol("cloud.fill")` | SF Symbol | `normal` |

The layout selects content items.
Item preferences select their configured fields and entries.
The `rain` item needs its supported data source for a rain summary.
It remains visible when that data is unavailable.

## Select a variant {#select-a-variant}

```js
const layout = `column(padding: 12, gap: 8)[
  current(variant: "stacked"),
  daily(variant: "vertical")
]`
```

Without `variant`, the planner can select a registered presentation.
An explicit `variant` remains a constraint during all planning stages.
Variants keep configured fields and font faces.
Daytime and nighttime rain probabilities remain separate.

Automatic regions can reduce font sizes within the [font limits](../explanation/planning.md#font-fallback).
Existing item line limits still apply.
Measurement and rendering use the same selected font size.

## Use visible data states {#visible-data-states}

Events and reminders show a localized message when no entries are available.
If that message is blank, they show a fallback message.
When the named event has no usable data, sun items show an unavailable state.

Explicit `sunrise` and `sunset` items always select their named event.
The old sun display time-window controls no longer apply.

## Add your own item {#add-your-own-item}

Register a measured module under `custom.items`.
A complete module can replace a built-in name.
See [Custom items](./custom-items.md).
