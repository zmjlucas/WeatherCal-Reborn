// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: magic;

// Generated builds embed the conversion module at the marked line.
// Paste the resulting method into the custom object in your widget launcher.
// Review converted code, especially scripts with their own setup or preview logic.
/* CONVERTER_MODULE */

async function prompt(message, options = ['OK'], field) {
  const alert = new Alert();
  alert.message = message;
  if (field) alert.addTextField();
  for (const option of options) alert.addAction(option);
  const response = await alert.presentAlert();
  return field ? alert.textFieldValue(0).trim() : response;
}

try {
  const name = await prompt('Choose a custom item name, such as clock. The output must be reviewed before use.', ['Continue'], true);
  if (!name) return;
  const selected = await DocumentPicker.openFile();
  const file = Array.isArray(selected) ? selected[0] : selected;
  if (!file) return;
  let files = FileManager.local();
  if (files.isFileStoredIniCloud(file)) {
    files = FileManager.iCloud();
    await files.downloadFileFromiCloud(file);
  }
  const source = files.readString(file);
  const options = {};
  if (source.includes('args.widgetParameter')) {
    if (await prompt('How should this item use the widget parameter?', ['Keep widget parameter', 'Specify a value'])) {
      options.parameter = await prompt('Enter the fixed widget parameter.', ['Continue'], true);
    }
  }
  await QuickLook.present(module.exports.convertWidget(source, name, options));
} catch (error) {
  await prompt(error.message || String(error));
} finally {
  Script.complete();
}
