//#region auto
// Let the engine choose the order and groups of weather items.
var layout = `
auto(padding: 12, gap: 8)[
  current,
  rain,
  future
]
`;
//#endregion auto

//#region flow
// Keep the listed reading order while the engine chooses groups.
var layout = `
flow(padding: 12, gap: 8)[
  current,
  rain,
  future
]
`;
//#endregion flow

//#region manual
// Keep all three weather items in one row.
var layout = `
row(padding: 12, gap: 8)[
  current,
  rain,
  future
]
`;
//#endregion manual

//#region semi-auto
// Keep the date above an automatic weather region.
var layout = `
column(padding: 12, gap: 8)[
  date,
  auto(gap: 8)[current, rain, future]
]
`;
//#endregion semi-auto

//#region constraint-conflict
// Show a root width that conflicts with the 320-point test viewport.
var layout = `
row(width: 100)[current]
`;
//#endregion constraint-conflict

//#region no-candidate
// Show fixed item widths that exceed the 320-point test viewport.
var layout = `
row(gap: 8)[
  current(width: 240),
  rain(width: 240),
  future(width: 240)
]
`;
//#endregion no-candidate

//#region search-limit
// Use three items to exceed the test's one-measurement budget.
var layout = `
auto[current, rain, future]
`;
//#endregion search-limit
