/** Reference canvas sizes in logical points, before any layout padding.
 * Apple HIG specifications (retrieved 2026-10-27):
 * https://developer.apple.com/design/human-interface-guidelines/widgets
 * iPad uses Canvas, not the scaled Device presentation dimensions.
 * All profiles assume standard home-screen icons and remain estimates. */
type Dimensions = readonly [number, number];
type FamilySizes = readonly [Dimensions, Dimensions, Dimensions]; // small, medium, large
interface ScreenProfile { readonly source: string; readonly sizes: FamilySizes }

const applePhone: Readonly<Record<string, FamilySizes>> = {
  '320x568': [[141,141], [292,141], [292,311]],
  '360x780': [[155,155], [329,155], [329,345]],
  '375x667': [[148,148], [321,148], [321,324]],
  '375x812': [[155,155], [329,155], [329,345]],
  '390x844': [[158,158], [338,158], [338,354]],
  '393x852': [[158,158], [338,158], [338,354]],
  '414x736': [[159,159], [348,157], [348,357]],
  '414x896': [[169,169], [360,169], [360,379]],
  '428x926': [[170,170], [364,170], [364,382]],
  '430x932': [[170,170], [364,170], [364,382]],
};
const applePad: Readonly<Record<string, FamilySizes>> = {
  '744x1133': [[141,141], [305.5,141], [305.5,305.5]],
  '768x1024': [[141,141], [305.5,141], [305.5,305.5]],
  '810x1080': [[146,146], [320.5,146], [320.5,320.5]],
  '820x1180': [[155,155], [342,155], [342,342]],
  '834x1112': [[150,150], [327.5,150], [327.5,327.5]],
  '834x1194': [[155,155], [342,155], [342,342]],
  '954x1373': [[162,162], [350,162], [350,350]],
  '970x1389': [[162,162], [350,162], [350,350]],
  '1024x1366': [[170,170], [378.5,170], [378.5,378.5]],
  '1192x1590': [[188,188], [412,188], [412,412]],
};
/** Standard-layout iPhone 16 Pro / Pro Max measurements from the author's
 * iOS 18 transparent-widget study; pixel dimensions converted at 3x scale:
 * https://gist.github.com/mzeryck/3a97ccd1e059b3afa3c6666d27a496c9
 * These supplement screens absent from Apple's published table. */
const measuredPhone: Readonly<Record<string, FamilySizes>> = {
  '402x874': [[162,162], [344,162], [344,366]],
  '440x956': [[170,170], [364,170], [364,382]],
};

export const screenProfiles: Readonly<Record<string, ScreenProfile>> = {
  ...Object.fromEntries(Object.entries(applePhone).map(([key, sizes]) => [key, {source:'apple-iphone', sizes}])),
  ...Object.fromEntries(Object.entries(applePad).map(([key, sizes]) => [key, {source:'apple-ipad-canvas', sizes}])),
  ...Object.fromEntries(Object.entries(measuredPhone).map(([key, sizes]) => [key, {source:'measured-iphone-standard', sizes}])),
};
