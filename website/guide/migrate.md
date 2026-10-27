# Migration {#migration}

The current engine accepts one tree in a `layout` string.
It does not accept earlier line commands, ASCII layouts, or settings-object layouts.
Code updates keep the user region.
They do not translate its layout or custom code.

## Replace an earlier layout {#replace-an-earlier-layout}

1. Save a copy of your installed script.
2. Record the content items that you want to keep.
3. Replace the old layout with one root container.
4. Put your selected items inside that container.
5. Use [Quick start](./quick-start.md) to show the widget.
6. Do the [device checks](./device-checks.md).

Use `auto` if the engine can change item order.
Use `flow` if the listed reading order must remain the same.
Use `row` and `column` for a fixed structure.
See the [layout examples](../recipes/layouts.md).

## Replace old controls {#replace-old-controls}

| Earlier control | Current control |
| --- | --- |
| `widgetPadding` | Root `padding` in the layout string |
| Horizontal weather preference | `current(variant: "inline")` or `current(variant: "stacked")` |
| Horizontal forecast preference | `variant: "horizontal"` or `variant: "vertical"` on the forecast item |
| Automatic sunrise/sunset controls | An explicit `sunrise` or `sunset` item |
| Old time-window sun controls | An explicit named sun item without a display time window |
| `custom.name(column)` callback | A measured module under `custom.items` |

`widget.padding` still sets internal built-in item padding.
It contributes to the measured item size.

## Keep the correct viewport {#keep-the-correct-viewport}

Blank viewport preferences now enable automatic detection.
The value `auto` has the same effect.
Existing manual values still take priority.
See [Viewport](./viewport.md) before you remove a measured override.

## Replace custom callbacks {#replace-custom-callbacks}

Each custom module must prepare content, supply measurements, and render into its allocation.
Earlier callbacks and converter output without measurements do not meet this contract.
Use the complete [custom item example](../reference/custom-items.md).

`atFontScale` is optional for custom items.
Without it, the custom item keeps its original font sizes inside automatic regions.
