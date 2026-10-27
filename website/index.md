# Layout guide {#layout-guide}

Use one `layout` string to select widget content and its structure.
The layout engine prepares the content, plans its position, and creates native Scriptable views.
A successful plan contains every selected item instance.

## Start here {#start-here}

1. [Create your first layout](./guide/quick-start.md).
2. [Compare layout modes](./recipes/layouts.md).
3. [Do the device checks](./guide/device-checks.md).

If you use an earlier layout format, start with [Migration](./guide/migrate.md).

## Choose a layout mode {#choose-a-layout-mode}

| Mode | Use |
| --- | --- |
| `auto` | Let the engine change the order and groups of items. |
| `flow` | Let the engine change groups, but keep the listed reading order. |
| `row` and `column` | Keep the specified structure. |
| Manual container with `auto` or `flow` | Keep part of the structure and let another part change. |

The engine detects the viewport from known screen profiles when the viewport preference is blank or `auto`.
Manual viewport overrides remain in effect.
See [Viewport](./guide/viewport.md).

## Find a reference {#find-a-reference}

- [Syntax and properties](./reference/syntax.md)
- [Built-in items](./reference/items.md)
- [Custom items](./reference/custom-items.md)
- [Diagnostics](./reference/diagnostics.md)
- [Planning stages](./explanation/planning.md)

## Know the limits {#know-the-limits}

The engine supports `small`, `medium`, and `large` home-screen widgets.
Automatic regions try presets, further search, and bounded font reduction.
They do not remove selected content to obtain a fit.

These pages describe the implementation identified in [Version and verification](./about/version.md).
The structure diagrams are schematic.
They are not native Scriptable previews.
