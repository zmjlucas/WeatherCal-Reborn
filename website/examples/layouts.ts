//#region auto
export const autoLayout = `auto(padding: 12, gap: 8)[
  current,
  rain,
  future
]`;
//#endregion auto

//#region flow
export const flowLayout = `flow(padding: 12, gap: 8)[
  current,
  rain,
  future
]`;
//#endregion flow

//#region manual
export const manualLayout = `row(padding: 12, gap: 8)[
  current,
  rain,
  future
]`;
//#endregion manual

//#region semi-auto
export const semiAutoLayout = `column(padding: 12, gap: 8)[
  date,
  auto(gap: 8)[current, rain, future]
]`;
//#endregion semi-auto

//#region constraint-conflict
export const constraintConflictLayout = `row(width: 100)[current]`;
//#endregion constraint-conflict

//#region no-candidate
export const noCandidateLayout = `row(gap: 8)[
  current(width: 240),
  rain(width: 240),
  future(width: 240)
]`;
//#endregion no-candidate

//#region search-limit
export const searchLimitLayout = `auto[current, rain, future]`;
//#endregion search-limit
