# Syntax and properties {#syntax-and-properties}

A layout contains exactly one root node.
A node is an item, a container, or a space.
The parser treats the layout as data.
It does not execute JavaScript inside the layout string.

## Write a node {#write-a-node}

```js
const layout = `column(gap: 6, padding: [8, 12, 8, 12])[
  text("Good morning"),
  row(gap: 8)[symbol("cloud.rain.fill"), space, battery],
  space(4),
  flow[current, future]
]`
```

Separate arguments and children with commas.
Use double quotes for strings and JSON escapes inside those strings.
Arguments accept literal numbers, strings, booleans, and arrays.
Whitespace, indentation, and trailing commas are permitted.
The parser accepts `//` comments and non-nested `/* ... */` comments.

`text("Hello")` maps its string to the `text` option.
`symbol("cloud.fill")` maps its string to the `name` option.
Custom items use named options.

## Select a container {#containers}

| Node | Behavior |
| --- | --- |
| `row[...]` | Put direct children on a horizontal main axis. |
| `column[...]` | Put direct children on a vertical main axis. |
| `auto[...]` | Select groups and order for direct children. |
| `flow[...]` | Select groups while keeping row-by-row reading order. |

Manual containers can be empty.
Automatic containers need at least one child.
See [Layout examples](../recipes/layouts.md).

## Set properties {#properties}

All dimensions use logical points.
Outer dimensions include the node's layout padding.

| Property | Allowed value and meaning | Default |
| --- | --- | --- |
| `width`, `height` | Positive fixed outer dimension | Content needs and parent allocation |
| `minWidth`, `minHeight` | Nonnegative lower bound | Content needs |
| `maxWidth`, `maxHeight` | Positive upper bound | No explicit bound |
| `grow` | Nonnegative weight for remaining space on a manual parent's main axis | 1 for `auto`, `flow`, and flexible `space`; 0 otherwise |
| `gap` | Nonnegative spacing between a container's direct children | 8 |
| `padding` | Nonnegative number or `[top, right, bottom, left]` | 0 |
| `align` | Manual cross-axis alignment: `"start"`, `"center"`, `"end"`, or `"stretch"` | `"stretch"` |
| `justify` | Manual main-axis alignment: `"start"`, `"center"`, `"end"`, or `"between"` | `"start"` |
| `textAlign` | Inherited text alignment: `"start"`, `"center"`, or `"end"` | `"start"` |
| `variant` | A presentation name registered by the item module | Planner selection |

Only `textAlign` inherits from a parent.
`gap` applies to containers.
`align` and `justify` apply only to `row` and `column`.
`variant` applies only to items.

Root padding comes from the layout string.
The `widget.padding` preference sets additional internal built-in item padding.

## Keep constraints consistent {#constraints}

The root occupies the full viewport.
An explicit root width or height must equal the related viewport dimension.
To create a smaller fixed region, put a fixed-size child inside the root.

Fixed, minimum, and maximum dimensions must agree.
A child cannot combine positive `grow` with a fixed dimension on its manual parent's main axis.
Direct children of `auto` and `flow` cannot specify `grow`.

Positive `grow` weights divide space after minimum content needs are met.
Weights of 1 and 2 do not guarantee final sizes of exactly 1:2.

## Add space {#space}

| Node | Behavior |
| --- | --- |
| `space(4)` | Add a fixed 4-point length on the parent's main axis. |
| `space` | Use flexible space with weight 1. |
| `space(grow: 2)` | Use flexible space with weight 2. |

Place spaces directly inside `row` or `column`.
Use `gap` between direct children of automatic containers.

## Observe parser limits {#parser-limits}

A layout can contain at most 128 nodes and 12 nesting levels.
Each automatic region can contain at most 12 direct children.
The parser also limits nested argument arrays to 12 levels.

Invalid syntax, properties, or names produce [diagnostics](./diagnostics.md).
Located diagnostics include a source line and column when available.
