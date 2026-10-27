# NO_CANDIDATE_FITS {#no-candidate-fits}

None of the evaluated structures can fit all selected content within the supplied viewport and constraints.
The engine displays a diagnostic widget instead of a partial content tree.
The search does not evaluate every possible arrangement.

## Fixed-width example {#fixed-width-failure}

This example exceeds the width of a 320 × 160-point viewport:

<<< ../examples/layouts.ts#no-candidate

The fixed child widths exceed the viewport width.
Font reduction cannot remove these explicit width constraints.
The shared test uses synthetic measurements.
It does not measure a native widget.

## Reduce the space requirement {#reduce-the-space-requirement}

1. Make sure that the viewport matches the measured widget bounds.
2. Remove fixed dimensions that the layout does not need.
3. Reduce padding or gaps if suitable.
4. Reduce configured font sizes if suitable.
5. Remove selected items that you do not need.
6. Run the preview again.

If the content still needs more space, select a larger widget family.
Use that family's verified viewport.
Do not enter false dimensions to suppress the diagnostic.

## Automatic font fallback {#automatic-fallback}

Automatic regions try presets and further search at the original font sizes.
They then try 90%, 80%, and 70% font stages where adaptation is available.
Text originally at least 10pt does not decrease below 10pt.
Text originally smaller than 10pt stays unchanged.

Manual siblings keep their font sizes.
Explicit dimensions, gaps, padding, and variants remain constraints.
See [Planning stages](../explanation/planning.md).

After a plan succeeds, do the [device checks](../guide/device-checks.md).
