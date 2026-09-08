// Licensed under MIT. See LICENSE.

module.exports = {
  async downloadCode(filename, url) {
    try {
      const source = await new Request(url).loadString();
      if (typeof source !== 'string' || !source.startsWith('// Variables used by Scriptable.')) return false;
      this.fm.writeString(this.fm.joinPath(this.fm.documentsDirectory(), filename + '.js'), source);
      return true;
    } catch { return false; }
  },

  /** Export the complete launcher, keeping custom functions and literal layout text intact. */
  async exportWidget() {
    const scriptPath = this.fm.joinPath(this.fm.documentsDirectory(), this.name + '.js');
    for (const path of [scriptPath, this.bgPath, this.prefPath]) {
      if (this.fm.fileExists(path) && this.fm.isFileStoredIniCloud(path)) await this.fm.downloadFileFromiCloud(path);
    }
    const payload = {
      source: this.fm.readString(scriptPath),
      preferences: await this.getSettings(),
      background: this.fm.fileExists(this.bgPath)
        ? JSON.parse(this.fm.readString(this.bgPath))
        : { type: 'color', color: '16296b' },
      images: []
    };
    if (payload.background.type === 'image') {
      const directory = this.fm.joinPath(this.fm.documentsDirectory(), 'Weather Cal');
      const suffixes = payload.background.dark ? ['.jpg', ' (Dark).jpg'] : ['.jpg'];
      for (const suffix of suffixes) {
        const path = this.fm.joinPath(directory, this.name + suffix);
        if (this.fm.isFileStoredIniCloud(path)) await this.fm.downloadFileFromiCloud(path);
        const image = this.fm.readImage(path);
        payload.images.push({ suffix, data: Data.fromPNG(image).toBase64String() });
      }
    }
    // Serialize as data twice: user text cannot become executable JavaScript in the importer.
    const encoded = JSON.stringify(JSON.stringify(payload));
    return `// Variables used by Scriptable.
// icon-color: deep-purple; icon-glyph: calendar;
async function importWidget() {
  const payload = JSON.parse(${encoded});
  const confirmation = new Alert();
  confirmation.message = 'Do you want your widget to be named ' + Script.name() + '?';
  confirmation.addAction('Yes, looks good');
  confirmation.addAction('No, let me change it');
  if (await confirmation.present() !== 0) return;
  let files = FileManager.local();
  if (files.isFileStoredIniCloud(module.filename)) files = FileManager.iCloud();
  const name = Script.name();
  const directory = files.joinPath(files.documentsDirectory(), 'Weather Cal');
  if (payload.images.length && !files.fileExists(directory)) files.createDirectory(directory);
  for (const image of payload.images) {
    files.writeImage(files.joinPath(directory, name + image.suffix), Image.fromData(Data.fromBase64String(image.data)));
  }
  files.writeString(files.joinPath(files.libraryDirectory(), 'weather-cal-preferences-' + name), JSON.stringify(payload.preferences));
  files.writeString(files.joinPath(files.libraryDirectory(), 'weather-cal-' + name), JSON.stringify(payload.background));
  files.writeString(module.filename, payload.source);
  const complete = new Alert();
  complete.message = 'Close this script and re-run it to finish setup.';
  complete.addAction('OK');
  await complete.present();
}
await importWidget();
Script.complete();
`;
  }
};
