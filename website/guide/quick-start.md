# Quick start {#quick-start}

Install a WeatherCal-Reborn script with the current layout engine before you start.
For earlier formats, use [Migration](./migrate.md) first.

## Set the layout {#set-the-layout}

1. Open your installed `one.js` script in Scriptable.
2. Find the `WeatherCal: user begin` marker.
3. Find the `layout` value inside the user region.
4. Replace the text between its backticks with the example value below.
5. Save the script.

<<< ../examples/layouts.ts#auto

`autoLayout` is the name of this documentation example.
The installed script uses the name `layout`.
Copy only the text between the backticks.

This example selects `current`, `rain`, and `future`.
When rain data is unavailable, the `rain` item shows a message.
See [Built-in items](../reference/items.md).

## Show the widget {#show-the-widget}

1. Run the script in Scriptable.
2. If initial setup opens, complete its procedure.
3. Run the script again.
4. Select **Edit preferences** in **Widget Setup**.
5. Select **Overall settings**.
6. Set **Widget preview size** to `small`, `medium`, or `large`.
7. Leave the related viewport override blank to use automatic detection.
8. Run the script again.
9. Select **Show widget preview**.

Existing manual viewport values take priority over automatic detection.
To use detection again, clear the value or enter `auto`.
See [Viewport](./viewport.md).

## Do a check {#do-a-check}

Make sure that each selected item appears once.
Repeated item names create separate item instances.
Then do the [device checks](./device-checks.md) on the home screen.

If a diagnostic appears, use its code in the [diagnostic reference](../reference/diagnostics.md).
If automatic detection fails, follow [VIEWPORT_UNKNOWN](../errors/viewport-unknown.md).
