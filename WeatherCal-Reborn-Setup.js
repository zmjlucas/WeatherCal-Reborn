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
