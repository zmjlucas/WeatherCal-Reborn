# Diagnostics {#diagnostics}

A failed plan displays a diagnostic widget.
It does not display a partial content tree.
Located diagnostics include the related node, source line, and source column when available.

## Viewport and family {#viewport-and-family}

| Code | Meaning | Action |
| --- | --- | --- |
| `VIEWPORT_UNKNOWN` | No usable viewport dimensions for the selected family | Follow the [viewport procedure](../errors/viewport-unknown.md). |
| `VIEWPORT_INVALID` | Manual or programmatic dimensions are invalid | Supply finite positive dimensions in logical points. |
| `FAMILY_UNSUPPORTED` | The family is unsupported or absent | Select `small`, `medium`, or `large`. |
| `FAMILY_CONFLICT` | An explicit family differs from the active widget family | Use the active widget family. |

## Syntax and item contracts {#syntax-and-item-contracts}

| Code | Meaning | Action |
| --- | --- | --- |
| `SYNTAX_ERROR` | The input does not match the grammar | Examine punctuation and the single root node. |
| `LAYOUT_LIMIT_EXCEEDED` | A parser limit is exceeded | Reduce nodes, nesting, or automatic direct children. |
| `UNKNOWN_ITEM` | No item module has this name | Use a registered item name. |
| `UNKNOWN_PROPERTY` | An item does not accept this private option | Use an option declared by that item. |
| `DUPLICATE_PROPERTY` | An argument appears more than once | Keep one value for that argument. |
| `INVALID_PROPERTY` | A value or property combination is invalid | Follow the [property reference](./syntax.md#properties). |
| `INVALID_PARAMETER` | The item does not accept a positional string | Use a declared named option. |
| `INVALID_VARIANT` | Item preparation cannot find the requested variant | Use a registered variant name. |
| `UNKNOWN_VARIANT` | The pure planner cannot find the requested variant | Supply prepared variants that match the layout. |
| `ITEM_CONTRACT_INVALID` | A module or measurement breaks its contract | Examine the [custom item contract](./custom-items.md). |

Item names and private options are validated before content loading starts.
Unknown container properties also produce `INVALID_PROPERTY`.

## Planning failures {#planning-failures}

| Code | Meaning | Action |
| --- | --- | --- |
| `CONSTRAINT_CONFLICT` | A directly tested constraint is inconsistent | Make dimensions consistent with the viewport. |
| `NO_CANDIDATE_FITS` | Evaluated candidates cannot hold all selected content | Follow the [fit procedure](../errors/no-candidate-fits.md). |
| `SEARCH_LIMIT_REACHED` | A hard planning budget ends before a complete plan is found | Follow the [search procedure](../errors/search-limit-reached.md). |

For example, this root width conflicts with a 320-point viewport width:

<<< ../examples/layouts.ts#constraint-conflict

To create a smaller region, put the fixed-size node inside a full-viewport root.

## Internal planner inputs {#internal-planner-inputs}

These diagnostics apply to direct calls of the pure planner.

| Code | Meaning | Action |
| --- | --- | --- |
| `INVALID_LAYOUT` | A supplied node tree breaks the planner contract | Use a valid parsed layout tree. |
| `INVALID_LIMITS` | A planning budget is not a positive integer | Use positive integer budgets. |

Planning budgets are not layout properties or user preferences.

## Successful-plan messages {#successful-plan-messages}

| Code | Meaning |
| --- | --- |
| `SEARCH_TRUNCATED` | A complete plan was found after the engine limited retained combinations or stage attempts. |
| `FONT_ADAPTED` | A complete plan uses smaller fonts in automatic regions. |

These codes do not mean that content was removed.
Frontier pruning alone does not produce `SEARCH_LIMIT_REACHED`.
See [Planning stages](../explanation/planning.md).
