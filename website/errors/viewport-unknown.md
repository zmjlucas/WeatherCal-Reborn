# VIEWPORT_UNKNOWN {#viewport-unknown}

The engine has no usable viewport dimensions for the selected family.
Automatic detection cannot match the screen profile, or it cannot read the screen size.
A manual viewport is not necessary for every user.

## Identify the cause {#identify-the-cause}

Read the diagnostic message.
It identifies either an unknown screen size or an unavailable screen API.

Blank viewport preferences and `auto` enable automatic detection.
Known profiles normally supply the dimensions.
The engine does not guess dimensions for unknown screens.

## Supply a measured override {#supply-a-measured-override}

1. [Obtain usable widget dimensions](../guide/viewport.md#obtain-usable-dimensions) for your device configuration.
2. Record both dimensions in logical points.
3. Open **Widget Setup**.
4. Select **Edit preferences**.
5. Select **Overall settings**.
6. Select the viewport override for the active family.
7. Enter the measured dimensions as `width x height`.
8. Run the preview again.
9. Do the [device checks](../guide/device-checks.md).

Do not use screen pixels or the full screen size as the widget dimensions.
The example `320 x 160` is not a measured device profile.

## For programmatic callers {#programmatic-callers}

Supply `options.viewport` with finite positive `width` and `height` values.
This override does not need access to the screen API.
See the [programmatic example](../guide/viewport.md#supply-dimensions-in-code).

If the code changes to `VIEWPORT_INVALID`, correct the dimension format or values.
If a fit diagnostic appears, use the [diagnostic reference](../reference/diagnostics.md).
