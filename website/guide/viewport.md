# Viewport {#viewport}

The viewport is the full ListWidget width and height in logical points.
Native widget padding is zero.
The engine applies layout padding inside this area.
Screen pixels and full-screen dimensions are not widget viewport dimensions.

## Use automatic detection {#use-automatic-detection}

Leave the family viewport override blank, or enter `auto`.
The engine ignores letter case and surrounding spaces in `auto`.

The engine reads `Device.screenSize()` and compares its logical dimensions with known screen profiles.
Portrait and landscape screen dimensions select the same profile.
The engine selects the dimensions for the given family from that profile.

Profiles give reference estimates for standard home-screen icons.
iPad profiles use Canvas dimensions.
Scriptable does not supply the actual widget bounds or the large-icon setting.
Display zoom, large icons, and OS changes can make a manual override necessary.
Unknown screen dimensions produce `VIEWPORT_UNKNOWN`.

## Obtain usable dimensions {#obtain-usable-dimensions}

Use a measurement record for the same device, OS version, widget family, display zoom, and icon size.
The record must give the full widget width and height in logical points, with zero native padding.
The repository file `src/layout/device-profiles.ts` contains reference estimates and their sources.
These estimates are not measurements of every device configuration.

If no matching measurement record exists, [open a profile request](https://github.com/zmjlucas/WeatherCal-Reborn/issues/new).
Include the diagnostic message and the conditions listed above.
Ask for verified widget dimensions for that configuration.
Keep the override blank until suitable dimensions are available.
An unknown profile will continue to show `VIEWPORT_UNKNOWN` during this time.

Do not use a similar phone's dimensions or the full screen dimensions as a substitute.
The [Scriptable screen API](https://docs.scriptable.app/device/#screensize) gives screen dimensions, not widget bounds.

## Set a manual override {#set-a-manual-override}

Use an override when the detected dimensions do not match your device measurements.
First, [obtain usable dimensions](#obtain-usable-dimensions).

1. Open **Widget Setup**.
2. Select **Edit preferences**.
3. Select **Overall settings**.
4. Select the override for your widget family.
5. Enter your measured width and height as `width x height`.
6. Save the preference.
7. Do the [device checks](./device-checks.md).

| Family | Preference label | Setting name |
| --- | --- | --- |
| `small` | Small viewport override | `widget.smallViewport` |
| `medium` | Medium viewport override | `widget.mediumViewport` |
| `large` | Large viewport override | `widget.largeViewport` |

For example, `320 x 160` gives a 320-point width and a 160-point height.
These example dimensions are not a measured device profile.
Both dimensions must be finite positive numbers.
Invalid manual dimensions produce `VIEWPORT_INVALID`.

## Understand priority {#understand-priority}

The engine uses the first available source in this order:

1. Programmatic `options.viewport`.
2. The manual preference for the selected family.
3. Automatic detection.

Manual and programmatic overrides do not need access to the screen API.
To use automatic detection again, clear a manual preference or enter `auto`.

## Supply dimensions in code {#supply-dimensions-in-code}

```js
const widget = await code.createWidget(layout, name, iCloudInUse, custom, {
  family: "medium",
  viewport: { width: 320, height: 160 }
})
```

These are example dimensions.
The installed entry selects the preview family before planning.
A home-screen run uses `config.widgetFamily`.
An explicit family must agree with the active widget family.
Extra-large and accessory families are unsupported.
