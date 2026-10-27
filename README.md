# WeatherCal-Reborn

An unofficial rewrite of the original [Weather-Cal](https://github.com/mzeryck/Weather-Cal) Scriptable widget, enabling a more modular and maintainable codebase with additional features.

> [!WARNING]
> This project is under active development.

## Quick Start

1. Install [Scriptable](https://scriptable.app/) on your iPhone or iPad.
2. Create a new script named **WeatherCal Setup**, paste the code below, and run it.

```javascript
const name = 'WeatherCal-Reborn', repo = 'zmjlucas/WeatherCal-Reborn';
const alert = new Alert();
alert.title = name + ' setup';
alert.addAction('OK');
try {
  let fm = FileManager.local();
  if (fm.isFileStoredIniCloud(module.filename)) fm = FileManager.iCloud();
  const path = fm.joinPath(fm.documentsDirectory(), name + '.js');
  if (fm.fileExists(path)) throw Error(name + '.js already exists. Keep your widget; use a separate setup script and rename any existing widget before installing.');
  const release = await new Request('https://api.github.com/repos/' + repo + '/releases/latest').loadJSON();
  const asset = release.assets.find(a => a.name === name + '-' + release.tag_name + '.js');
  if (!asset) throw Error('Release script is not available yet. Try again later.');
  const code = await new Request(asset.browser_download_url).loadString();
  if (!code.includes('// WeatherCal: user begin') || !code.trimEnd().endsWith('// WeatherCal: engine end')) throw Error('Incomplete download. Run setup again.');
  fm.writeString(path, code);
  try { fm.remove(module.filename); } catch {}
  alert.message = 'Installed! Tap OK to launch. If it does not open, run WeatherCal-Reborn manually. Delete the setup script if it still appears.';
  await alert.presentAlert();
  try { Safari.open('scriptable:///run?scriptName=' + encodeURIComponent(name)); } catch {}
} catch (error) {
  alert.message = String(error);
  await alert.presentAlert();
} finally { Script.complete(); }
```

The installer downloads `WeatherCal-Reborn-vX.X.X.js` from the latest GitHub release, saves it as `WeatherCal-Reborn.js`, removes itself, and attempts to launch the widget script. If it does not launch, run **WeatherCal-Reborn** manually. If **WeatherCal Setup** remains in your script list, delete it after installation. Existing `WeatherCal-Reborn.js` files are never overwritten.

3. Follow the first-run prompts: grant the requested permissions, choose a weather provider (or skip weather), enter its credentials, and choose a background.
4. Add a Scriptable widget to your Home Screen, edit the widget, and select **WeatherCal-Reborn** as its script. Run the script again to change preferences or preview it.

For layout examples and more settings, see the [configuration guide](https://zmjlucas.github.io/WeatherCal-Reborn/guide/quick-start.html).

## Credits

[MIT] Original repo [mzeryck/Weather-Cal](https://github.com/mzeryck/Weather-Cal) ([license](licenses/weather-cal.LICENSE)).

[MIT] Bundled JavaScript parser [Acorn](https://github.com/acornjs/acorn) ([license](licenses/acorn.LICENSE)).

[Unicode-3.0] Bundled weather unit preferences from [Unicode CLDR / cldr-core](https://github.com/unicode-org/cldr-json) ([license](licenses/cldr-core.LICENSE)).
