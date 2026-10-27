### website/

When working with the VitePress documentation website, follow the guidelines below:

- Write English first, using ASD-STE100 Simplified Technical English, and then translate to other languages.
- **Always** use the below structure for `layout` and `custom` examples, use `var layout` or `var custom` to be consistent with the shipped `WeatherCal-Reborn.js`. For instance:
```js
//#region auto
// Put one-liner short descriptions here as a comment
var layout = `
auto(padding: 12, gap: 8)[
  current,
  rain,
  future
]
`;
//#endregion auto
```
- Do not refer to `one.js`, use `WeatherCal-Reborn.js` instead.
