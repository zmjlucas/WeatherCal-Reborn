# Device checks {#device-checks}

A successful estimated plan does not prove that native text stays inside its allocated area.
Repository tests use simulated measurements and views.
They do not measure clipping on a phone.

## Record the test conditions {#record-the-test-conditions}

Record these values for each device test:

| Value | Example or purpose |
| --- | --- |
| Device and OS version | Identify the tested hardware and software. |
| Widget family | `small`, `medium`, or `large` |
| Display zoom and icon size | Identify settings that can change widget dimensions. |
| Viewport source and dimensions | Record automatic detection or the manual override. |
| Layout and font preferences | Keep the exact test input. |
| Language and data state | Include long text and unavailable data. |

## Do the geometry checks {#do-the-geometry-checks}

1. [Obtain usable widget dimensions](./viewport.md#obtain-usable-dimensions) for the test configuration.
2. Record its width and height in logical points.
3. Compare the app preview with the home-screen widget.
4. Examine fixed frames with visible backgrounds or borders.
5. Examine root padding, item padding, and gaps.
6. Examine alignment with known-size content.
7. Make sure that each selected item instance appears once.

If measured bounds differ from the profile, set a [viewport override](./viewport.md#set-a-manual-override).

## Do the content checks {#do-the-content-checks}

1. Examine long English and Chinese titles.
2. Examine negative temperatures.
3. Examine next-hour and tomorrow content.
4. Examine separate daytime and nighttime rain probabilities.
5. Examine empty events and reminders.
6. Examine unavailable weather and sun data.
7. Examine each automatic font stage that your layout uses.

Existing item line limits still apply.
The planner includes these limits in its height estimates.

## Do the behavior checks {#do-the-behavior-checks}

1. Examine the small widget's tap action.
2. Examine item links on medium and large widgets.
3. Examine the widget background.
4. Record refresh requests and actual refresh times.
5. Run a layout near the documented [planning limits](../explanation/planning.md#limits).
6. Record runtime and memory behavior.

Small widgets have one widget-level tap target.
iOS can refresh the widget after the requested time.
Do not report an untested device configuration as verified.
