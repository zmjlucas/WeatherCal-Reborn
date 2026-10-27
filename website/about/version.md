# Version and verification {#version-and-verification}

These pages describe the layout implementation at commit `f428886`.
That implementation includes automatic viewport detection, family presets, and bounded font fallback.
The documentation site is built separately from the installed Scriptable script.

## Identify the contract {#contract}

The repository file `docs/LAYOUT.md` states the layout contract.
The implementation is in `src/layout/` and `src/items/`.
The installed entry and editable user region come from `src/entry.ts` and `src/user.ts`.

This version supports `small`, `medium`, and `large` home-screen widgets.
It does not support extra-large or accessory widget families.
Earlier line commands, ASCII layouts, and settings-object layouts need [migration](../guide/migrate.md).

## Separate test evidence {#test-evidence}

| Evidence | What it can establish |
| --- | --- |
| Parser and planner tests | Syntax behavior, constraints, geometry, and bounded search with controlled inputs |
| Shared example tests | Example behavior with synthetic item measurements |
| Site build and link tests | Documentation structure, example imports, and local navigation |
| Browser inspection | Site display and navigation in a browser |
| Native device checks | Actual text, clipping, taps, backgrounds, and refresh behavior on the tested device |

The shared example viewport is 320 × 160 logical points.
Those dimensions are illustrative.
They are not a measured phone profile.
Browser diagrams are schematic and are not Scriptable previews.

This site does not claim that a native phone configuration was verified.
Use the [device procedure](../guide/device-checks.md) to collect that evidence.

## Language and writing {#language-and-writing}

English is the source language for these pages.
Chinese pages follow the English structure and share its code examples.
The writing uses short sentences and the controlled terms in the [terminology reference](./terminology.md).

The writing follows ASD-STE100 Simplified Technical English principles.
It does not claim certified compliance with every dictionary entry or writing rule.
See the [official ASD-STE100 introduction](https://www.asd-ste100.org/about.html).
