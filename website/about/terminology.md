# Terminology {#terminology}

Use the same technical noun for the same concept throughout these pages.
Exact code identifiers and UI labels keep their source spelling.
The Chinese pages use the same identifiers and example sources.

## Layout terms {#layout-terms}

| Term | Meaning |
| --- | --- |
| layout | The tree described by the editable `layout` string. |
| node | One item, container, or space in the layout tree. |
| root | The single outer node that occupies the viewport. |
| item | A selected content module, such as `current` or `date`. |
| item instance | One occurrence of an item in the layout. |
| container | A `row`, `column`, `auto`, or `flow` node with children. |
| direct child | A node immediately inside a container. |
| automatic region | An `auto` or `flow` container and its contents. |
| manual group | A structure specified with `row` and `column`. |
| main axis | The horizontal axis of a row or vertical axis of a column. |
| cross axis | The axis perpendicular to the main axis. |
| reading order | The sequence read row by row, from left to right. |

## Size and planning terms {#size-and-planning-terms}

| Term | Meaning |
| --- | --- |
| family | The `small`, `medium`, or `large` home-screen widget size class. |
| viewport | The full ListWidget area with native padding set to zero. |
| logical point | A layout unit that is independent of the screen's pixel count. |
| screen profile | Stored widget dimensions for known logical screen dimensions. |
| override | An explicit value that takes priority over automatic detection. |
| padding | Space inside a node's outer frame. |
| gap | Space between a container's direct children. |
| constraint | A requirement that the planner must keep. |
| variant | A registered presentation of the same configured item content. |
| preset | A structure that the planner tries before further search. |
| candidate | A possible structure or placement evaluated by the planner. |
| plan | A complete resolved tree with item positions and dimensions. |
| budget | A limit on candidates or distinct measurements. |
| frontier | The intermediate set of retained candidate combinations. |
| font fallback | Later planning stages that use smaller fonts within stated limits. |
| snapshot | Prepared data and presentation values that do not change during planning. |
| diagnostic | A code and message that describe a failure or planning condition. |
| synthetic measurement | A controlled test value that does not come from native text measurement. |
| schematic diagram | A drawing of structure that does not show exact native positions. |

## Computer-process verbs {#computer-process-verbs}

| Verb | Meaning |
| --- | --- |
| parse | Convert the layout string into a tree of nodes. |
| validate | Compare an input with the declared software contract. |
| render | Create native views from a prepared item and its placement. |
| register | Add an item module to the set of available modules. |
| detect | Select a known screen profile from the device screen dimensions. |
| refresh | Run the widget again to update its displayed content. |
| request | Send a software request for data or a future refresh. |

## Writing rules {#writing-rules}

Use active voice and short complete sentences.
Keep instruction sentences within 20 words and description sentences within 25 words.
Put conditions before actions.
Give one action in each procedure step.
Keep each paragraph within six sentences.
Use the imperative form for procedure steps.

Use “Make sure that” for a necessary condition.
Use “Do a check” or “Examine” for an inspection action.
Do not replace one technical noun with different words for variety.

See the [official STE questions and answers](https://www.asd-ste100.org/STE_faq.html).
