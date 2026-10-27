# Planning stages {#planning-stages}

The engine resolves the viewport and parses one layout tree.
It validates item names and options before loading content.
It then prepares each selected item instance and plans the complete tree.
The renderer creates native Scriptable views from the successful plan.

## Keep content and boundaries {#content-and-boundaries}

A successful plan contains every selected item instance.
This includes repeated names and visible empty or error states.
The engine does not remove fields or entries to obtain a fit.
Existing item line limits still apply.

`auto` can change the order of direct children.
`flow` keeps their listed order when the result is read row by row.
A manual group remains together inside either automatic container.
Items cannot move out of that group.

## Try presets first {#presets}

At each font stage, automatic regions first try family-specific preset structures.
These include rows, columns, grids, full-width bands, and side groups.

| Family | Preferred preset direction |
| --- | --- |
| `small` | Side groups |
| `medium` | Horizontal groups |
| `large` | Vertical bands |

Presets use measured content needs and allocated widths.
They do not assign fixed pixel positions.
If presets give no fit, the engine searches further orders and groups.

## Use bounded font fallback {#font-fallback}

The engine tries these stages in order:

1. Presets and search at 100% of configured font sizes.
2. Presets and search at 90%.
3. Presets and search at 80%.
4. Presets and search at 70%.

The first successful stage wins.
A full-size solution takes priority over smaller text.
Only items inside automatic regions can use font adaptation.
Manual siblings retain their original font sizes.

Text originally at least 10pt never decreases below 10pt.
Text originally smaller than 10pt keeps its original size.
Saved font preferences remain unchanged.
Padding, gaps, dimensions, and explicit variants remain constraints.
Measurement and rendering use the same selected snapshot.

Built-in items support this adaptation.
For font adaptation, custom items need the optional [`atFontScale` contract](../reference/custom-items.md#font-adaptation).
Without that method, a custom item keeps its original typography.

## Share available space {#share-available-space}

Several automatic regions can share a manual parent's available space.
Positive `grow` weights divide the space remaining after minimum needs are met.
Weights of 1 and 2 therefore do not guarantee final sizes of exactly 1:2.
See [Properties](../reference/syntax.md#properties).

## Respect planning limits {#limits}

| Limit | Default |
| --- | --- |
| Nodes per parsed layout | 128 |
| Nesting levels | 12 |
| Direct children per automatic region | 12 |
| Structural candidates per automatic region | 256 |
| Distinct measurements per plan | 4,096 |
| Retained combinations per intermediate frontier | 24 |

Candidate budgets cover widths, preset and search stages, and font scales.
Stage quotas reserve attempts for later stages.
Measurement caches reuse unchanged item, width, variant, and scale results.
The same snapshot and configuration produce the same search behavior.
The engine does not exhaust all possible arrangements.

Hard budget exhaustion can produce `SEARCH_LIMIT_REACHED`.
Bounded frontier or stage pruning can produce `SEARCH_TRUNCATED` with a complete plan.
Font reduction produces `FONT_ADAPTED` with a complete plan.

Successful pure planner results contain `strategy` and `fontScale`.
`strategy` is `manual`, `presets`, or `search`.
These results describe planning behavior, not native device verification.
Do the [device checks](../guide/device-checks.md) for each target configuration.
