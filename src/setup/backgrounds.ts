// Licensed under MIT. See LICENSE.
import type { WeatherCalContext } from '../types/context';
import { parseBackground } from '../types/background';
import type { Background } from '../types/background';

export default {
  async setWidgetBackground(this: WeatherCalContext): Promise<string | undefined> {
    const options = ['Solid color', 'Automatic gradient', 'Custom gradient', 'Image from Photos'];
    const choice = await this.generateAlert('What type of background would you like for your widget?', options);
    if (choice < 0 || choice > 3) return;
    let previous: Background = { type: 'color', color: '16296b' };
    if (this.fm.fileExists(this.bgPath)) {
      if (this.fm.isFileStoredIniCloud(this.bgPath)) await this.fm.downloadFileFromiCloud(this.bgPath);
      try { previous = parseBackground(JSON.parse(this.fm.readString(this.bgPath))); } catch { /* Keep defaults. */ }
    }
    let background: Background;
    if (choice === 0) {
      const input = await this.promptForText('Background Color',
        previous.type === 'color' ? [previous.color, previous.dark ?? ''] : ['', ''],
        ['Default color', 'Dark mode color (optional)'],
        'Enter the hex value of the background color you want. You can optionally choose a different background color for dark mode.');
      background = { type: 'color', color: input.textFieldValue(0), dark: input.textFieldValue(1) };
    } else if (choice === 1) {
      background = { type: 'auto' };
    } else if (choice === 2) {
      const input = await this.promptForText('Gradient Colors',
        previous.type === 'gradient' ? [previous.initialColor, previous.finalColor, previous.initialDark ?? '', previous.finalDark ?? ''] : ['', '', '', ''],
        ['Top default color', 'Bottom default color', 'Top dark mode color', 'Bottom dark mode color'],
        'Enter the hex values of the colors for your gradient. You can optionally choose different background colors for dark mode.');
      background = { type: 'gradient', initialColor: input.textFieldValue(0), finalColor: input.textFieldValue(1),
        initialDark: input.textFieldValue(2), finalDark: input.textFieldValue(3) };
    } else {
      let lightImage: Image;
      let darkImage: Image | undefined;
      let dark: boolean;
      try {
        lightImage = await Photos.fromLibrary();
        const darkChoice = await this.generateAlert('Would you like to use a different image in dark mode?', ['Yes', 'No']);
        if (darkChoice < 0) return;
        dark = darkChoice === 0;
        if (dark) darkImage = await Photos.fromLibrary();
      } catch { return; }
      if (!lightImage || (dark && !darkImage)) return;
      const directory = this.fm.joinPath(this.fm.documentsDirectory(), 'Weather Cal');
      if (!this.fm.fileExists(directory)) this.fm.createDirectory(directory);
      this.fm.writeImage(this.fm.joinPath(directory, this.name + '.jpg'), lightImage);
      if (darkImage) this.fm.writeImage(this.fm.joinPath(directory, this.name + ' (Dark).jpg'), darkImage);
      background = { type: 'image', dark };
    }
    this.writePreference(null, background, this.bgPath);
    return this.previewValue();
  }
};
