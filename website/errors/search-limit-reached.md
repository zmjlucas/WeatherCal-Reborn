# SEARCH_LIMIT_REACHED {#search-limit-reached}

The engine reached its candidate or measurement limit before it found a complete plan.
Another arrangement can still fit.
The engine does not return a partial content tree.

## Reduce search choices {#reduce-the-search-problem}

1. Put related items in manual `row` or `column` groups.
2. Use `flow` if the listed order must remain the same.
3. Remove selected items that you do not need.
4. Remove restrictive dimensions if suitable.
5. Run the preview again.

A manual group remains one direct child inside an automatic region.
This can reduce the number of group and order choices.
It also fixes that group's structure.
See [Layout examples](../recipes/layouts.md).

## Understand the limits {#understand-the-limits}

The default engine evaluates at most 256 structural candidates per automatic region.
It makes at most 4,096 distinct measurements per plan.
It retains at most 24 combinations at each intermediate frontier.
These are engine limits, not Scriptable platform limits.

Frontier pruning alone does not cause `SEARCH_LIMIT_REACHED`.
A complete plan after bounded pruning can include `SEARCH_TRUNCATED`.
See [Planning limits](../explanation/planning.md#limits).

## Reproduce the diagnostic in a planner test {#planner-test}

<<< ../examples/layouts.ts#search-limit

The shared test runs this layout with the internal planner override `maxMeasurements: 1`.
This budget permits one measurement, but the three items need more measurements for a complete plan.
`maxMeasurements` is not a layout property or a user preference.
Do not put it in the installed layout string.

The layout alone does not guarantee a search-limit failure with normal budgets.
