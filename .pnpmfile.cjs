module.exports = {
  hooks: {
    updateConfig(config) {
      const [command, script] = process.argv.slice(2);
      const upload = command === 'upload:icloud' || (command === 'run' && script === 'upload:icloud');
      // Hide only the uploader's command echo; preserve explicit reporter overrides.
      return upload && config.reporter == null ? { ...config, reporter: 'silent' } : config;
    },
  },
};
