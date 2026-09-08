// Licensed under MIT. See LICENSE.

module.exports = {
  async runSetup(name, iCloudInUse, codeFilename, gitHubUrl) {
    this.initialize(name, iCloudInUse);
    for (const path of [this.bgPath, this.prefPath]) {
      if (this.fm.fileExists(path) && this.fm.isFileStoredIniCloud(path)) await this.fm.downloadFileFromiCloud(path);
    }
    const backgroundExists = this.fm.fileExists(this.bgPath);
    const setupPath = this.fm.joinPath(this.fm.libraryDirectory(), 'weather-cal-setup');
    if (!this.fm.fileExists(setupPath)) return this.initialSetup(backgroundExists);
    if (backgroundExists) return this.editSettings(codeFilename, gitHubUrl);
    await this.generateAlert('Weather Cal is set up, but you need to choose a background for this widget.', ['Continue']);
    return this.setWidgetBackground();
  },

  async editSettings(codeFilename, gitHubUrl) {
    const options = ['Show widget preview', 'Change background', 'Edit preferences', 'Update code', 'Export widget', 'Other settings', 'Exit settings menu'];
    const selected = await this.generateAlert('Widget Setup', options);
    if (selected === 0) return this.previewValue();
    if (selected === 1) return this.setWidgetBackground();
    if (selected === 2) return this.editPreferences();
    if (selected === 3) {
      if (await this.generateAlert('Would you like to update the Weather Cal code? Your widgets will not be affected.', ['Update', 'Exit']) !== 0) return;
      const success = await this.downloadCode(codeFilename, gitHubUrl);
      await this.generateAlert(success ? 'The update is now complete.' : 'The update failed. Please try again later.');
      return;
    }
    if (selected === 4) {
      try {
        const exported = await this.exportWidget();
        const destination = await this.generateAlert('Your export is ready.', ['Save to Files', 'Display as text to copy']);
        if (destination === 0) await DocumentPicker.exportString(exported, this.name + ' export.js');
        else if (destination === 1) await QuickLook.present(exported);
      } catch {
        await this.generateAlert('The export failed. Make sure the widget script and its background are available, then try again.');
      }
      return;
    }
    if (selected !== 5) return;
    const other = await this.generateAlert('Other settings', ['Re-enter API key', 'Completely reset widget', 'Exit']);
    if (other === 0) { await this.getWeatherKey(); return; }
    if (other !== 1) return;
    const confirmation = new Alert();
    confirmation.message = 'Are you sure you want to completely reset this widget?';
    confirmation.addDestructiveAction('Reset');
    confirmation.addAction('Cancel');
    if (await confirmation.present() !== 0) return;
    // Fetch a valid replacement before removing any current configuration.
    const success = await this.downloadCode(this.name, this.widgetUrl);
    if (success) {
      const images = this.fm.joinPath(this.fm.documentsDirectory(), 'Weather Cal');
      for (const path of [this.bgPath, this.prefPath,
        this.fm.joinPath(images, this.name + '.jpg'), this.fm.joinPath(images, this.name + ' (Dark).jpg')]) {
        if (this.fm.fileExists(path)) this.fm.remove(path);
      }
    }
    await this.generateAlert(success ? 'This script has been reset. Close the script and reopen it for the change to take effect.' : 'The reset failed. Your settings were preserved.');
  }
};
