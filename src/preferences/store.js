/** Persisted values overlay new defaults without dropping nested font/padding fields. */
function merge(defaultValue, stored) {
  if (stored === undefined || stored === null) return defaultValue;
  if (defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
    if (typeof stored !== 'object' || Array.isArray(stored)) return defaultValue;
    const result = { ...defaultValue };
    for (const key of Object.keys(defaultValue)) result[key] = merge(defaultValue[key], stored[key]);
    return result;
  }
  return stored;
}

module.exports = {
  async getSettings(forEditing = false) {
    let stored;
    try { stored = JSON.parse(this.fm.readString(this.prefPath)); } catch { stored = {}; }
    const schema = await this.defaultSettings(forEditing);
    const result = {};
    for (const [category, fields] of Object.entries(schema)) {
      const values = forEditing ? { name: fields.name } : {};
      for (const [key, descriptor] of Object.entries(fields)) {
        if (key === 'name') continue;
        const value = merge(descriptor.val, stored?.[category]?.[key]);
        values[key] = forEditing ? { ...descriptor, val: value } : value;
      }
      result[category] = values;
    }
    return result;
  },

  previewValue() {
    try {
      const size = JSON.parse(this.fm.readString(this.prefPath)).widget.preview;
      if (['small', 'medium', 'large'].includes(size)) return size;
    } catch { /* Missing or damaged preferences use the default preview. */ }
    return 'large';
  }
};
