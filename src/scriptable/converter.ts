// Licensed under MIT. See LICENSE.
import { convertWidget } from '../converter';
import type { ConverterOptions } from '../converter';

async function prompt(message: string, options: string[] = ['OK']): Promise<number> {
  const alert = new Alert();
  alert.message = message;
  for (const option of options) alert.addAction(option);
  return alert.presentAlert();
}

async function textPrompt(message: string): Promise<string | undefined> {
  const alert = new Alert();
  alert.message = message;
  alert.addTextField();
  alert.addAction('Continue');
  if (await alert.presentAlert() < 0) return undefined;
  return alert.textFieldValue(0).trim();
}

async function runConverter(): Promise<void> {
  const name = await textPrompt('Choose a custom item name, such as clock. The output must be reviewed before use.');
  if (!name) return;
  const selected = await DocumentPicker.openFile();
  // Some Scriptable versions return a selection array.
  const file: unknown = Array.isArray(selected) ? selected[0] : selected;
  if (typeof file !== 'string' || !file) return;
  let files = FileManager.local();
  if (files.isFileStoredIniCloud(file)) {
    files = FileManager.iCloud();
    await files.downloadFileFromiCloud(file);
  }
  const source = files.readString(file);
  const options: ConverterOptions = {};
  if (source.includes('args.widgetParameter')) {
    const choice = await prompt('How should this item use the widget parameter?', ['Keep widget parameter', 'Specify a value']);
    if (choice < 0) return;
    if (choice === 1) {
      const parameter = await textPrompt('Enter the fixed widget parameter.');
      if (parameter === undefined) return;
      options.parameter = parameter;
    }
  }
  await QuickLook.present(convertWidget(source, name, options));
}

try {
  await runConverter();
} catch (error) {
  await prompt(error instanceof Error ? error.message : String(error));
} finally {
  Script.complete();
}
