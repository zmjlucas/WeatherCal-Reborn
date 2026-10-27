# Layout examples {#layout-examples}

These examples use `current`, `rain`, and `future` in each layout mode.
The manual and automatic structures use the same selected weather items.
The combined example also puts `date` outside the automatic region.

Each code block comes from the shared example source.
Copy its template-string value into the installed `layout` value.
Do not copy its documentation export name.

## Let the order change {#auto}

Use `auto` when the engine can change the order of direct children.

<<< ../examples/layouts.ts#auto

The engine can select a row, column, grid, band, or side group.
The engine selects a structure from the content measurements.

## Keep the reading order {#flow}

Use `flow` when the listed reading order must stay the same.

<<< ../examples/layouts.ts#flow

Read the result row by row, from left to right.
The direct children keep their listed order in that reading sequence.
Their positions can change between structures.

## Keep the structure {#manual}

Use `row` and `column` to keep the specified groups.

<<< ../examples/layouts.ts#manual

This layout keeps `current`, `rain`, and `future` in one horizontal row.
The engine does not reduce fonts in this manual layout.
The structure can fail when content exceeds the viewport.

## Combine fixed and automatic regions {#semi-auto}

Put an automatic region inside a manual container.

<<< ../examples/layouts.ts#semi-auto

The `date` item stays above the automatic region.
Its font sizes remain unchanged.
The automatic region can change the order and grouping of its weather items.

A manual group inside `auto` or `flow` stays together.
The engine cannot move an item out of that group.

## Compare the structures {#compare-the-structures}

![Schematic structures for automatic, flow, manual, and combined layouts.](/diagrams/layout-modes.svg)

This diagram shows structural choices only.
Actual positions depend on the viewport, fonts, language, and data.
It is not a native Scriptable preview.

The example tests use a 320 × 160-point viewport and synthetic item measurements.
A passing example test does not establish a fit for a phone or real forecast data.
Use the [device checks](../guide/device-checks.md) before you rely on a layout.

## Adjust a layout after a fit failure {#adjust-a-layout-that-does-not-fit}

Use the diagnostic code to select the next action:

- [VIEWPORT_UNKNOWN](../errors/viewport-unknown.md): supply measured bounds when detection cannot select a profile.
- [NO_CANDIDATE_FITS](../errors/no-candidate-fits.md): reduce content needs or remove restrictive dimensions.
- [SEARCH_LIMIT_REACHED](../errors/search-limit-reached.md): reduce the search problem or specify more structure.
