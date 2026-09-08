// Licensed under MIT. See LICENSE.
import { createWeatherCal } from './create';
import { layout, custom } from './user';

const code = createWeatherCal();

async function runWidget(): Promise<void> {
  const local = FileManager.local();
  const iCloudInUse = local.isFileStoredIniCloud(module.filename);
  let preview: string | undefined;
  if (config.runsInApp) {
    preview = await code.runSetup(Script.name(), iCloudInUse);
    if (!preview) return;
  }
  const widget = await code.createWidget(layout, Script.name(), iCloudInUse, custom);
  Script.setWidget(widget);
  if (config.runsInApp) {
    if (preview === 'small') await widget.presentSmall();
    else if (preview === 'medium') await widget.presentMedium();
    else await widget.presentLarge();
  }
}

try {
  await runWidget();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  if (config.runsInApp) {
    const alert = new Alert();
    alert.title = 'Weather Cal could not finish';
    alert.message = message;
    alert.addAction('OK');
    await alert.presentAlert();
  }
} finally {
  Script.complete();
}
