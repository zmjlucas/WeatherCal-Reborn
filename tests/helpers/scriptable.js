const assert = require('node:assert/strict');

/** Scriptable boundary doubles record widget structure and filesystem side effects. */
function createEnvironment(options = {}) {
  const localStore = new Map();
  const cloudStore = new Map();
  const alerts = [];
  const responses = [...(options.responses || [])];
  const exports = [];
  const requests = [];
  const downloads = [];
  class FileManager {
    constructor(store, cloud) { this.store = store; this.cloud = cloud; }
    static local() { return local; }
    static iCloud() { return cloud; }
    documentsDirectory() { return '/documents'; }
    libraryDirectory() { return '/library'; }
    joinPath(parent, name) { return parent + '/' + name; }
    fileExists(path) { return this.store.has(path); }
    isDirectory(path) { return this.store.get(path)?.directory || false; }
    createDirectory(path) { this.store.set(path, { directory: true }); }
    readString(path) { assert(this.store.has(path), 'Missing file: ' + path); return this.store.get(path).value; }
    writeString(path, value) { this.store.set(path, { value, modified: new Date() }); }
    readImage(path) { return this.readString(path); }
    writeImage(path, value) { this.writeString(path, value); }
    modificationDate(path) { return this.store.get(path).modified; }
    remove(path) { this.store.delete(path); }
    listContents(path) { return [...this.store.keys()].filter(x => x.startsWith(path + '/')).map(x => x.slice(path.length + 1)); }
    isFileStoredIniCloud() { return Boolean(options.iCloud); }
    async downloadFileFromiCloud(path) { downloads.push(path); }
  }
  const local = new FileManager(localStore, false);
  const cloud = new FileManager(cloudStore, true);
  class Color {
    constructor(hex, alpha = 1) { this.hex = hex; this.alpha = alpha; this.red = hex === 'ffffff' ? 1 : 0; }
    static white() { return new Color('ffffff'); }
    static black() { return new Color('000000'); }
    static gray() { return new Color('888888'); }
    static red() { return new Color('ff0000'); }
    static dynamic(light, dark) { return options.dark ? dark : light; }
  }
  class Size { constructor(width, height) { this.width = width; this.height = height; } }
  class Rect {
    constructor(x, y, width, height) {
      for (const v of [x, y, width, height]) assert(Number.isFinite(v), 'Drawing geometry must be finite');
      Object.assign(this, { x, y, width, height });
    }
  }
  class Stack {
    constructor() { this.children = []; this.size = new Size(0, 0); }
    addStack() { const child = new Stack(); this.children.push(child); return child; }
    addText(text) { assert.equal(typeof text, 'string'); const child = { type: 'text', text }; this.children.push(child); return child; }
    addImage(image) { const child = { type: 'image', image }; this.children.push(child); return child; }
    addSpacer(length) { this.children.push({ type: 'spacer', length }); }
    setPadding(...padding) { this.padding = padding; }
    layoutHorizontally() { this.direction = 'horizontal'; }
    layoutVertically() { this.direction = 'vertical'; }
    centerAlignContent() { this.alignment = 'center'; }
    async presentSmall() { this.preview = 'small'; }
    async presentMedium() { this.preview = 'medium'; }
    async presentLarge() { this.preview = 'large'; }
  }
  class Font { constructor(name, size) { this.name = name; this.size = size; } }
  for (const weight of ['ultraLight', 'light', 'regular', 'medium', 'semibold', 'bold', 'heavy', 'black', 'italic']) {
    Font[weight + 'SystemFont'] = size => new Font(weight, size);
  }
  class DateFormatter {
    useShortDateStyle() { this.date = true; }
    useNoDateStyle() { this.date = false; }
    useShortTimeStyle() { this.time = true; }
    useNoTimeStyle() { this.time = false; }
    string(value) { assert(value instanceof Date && Number.isFinite(value.getTime())); return (this.dateFormat || (this.time ? 'time' : 'date')) + ':' + value.toISOString(); }
  }
  class RelativeDateTimeFormatter {
    useNamedDateTimeStyle() {}
    string(value) { return 'relative:' + value.toISOString(); }
  }
  class Path {
    constructor() { this.shapes = []; }
    addRoundedRect(rect, x, y) { this.shapes.push({ rect, x, y }); }
    addEllipse(rect) { this.shapes.push({ rect }); }
  }
  class DrawContext {
    constructor() { this.paths = []; }
    drawImageInRect(image, rect) { this.base = { image, rect }; }
    addPath(path) { this.paths.push(path); }
    setFillColor(color) { this.color = color; }
    fillPath() {}
    getImage() { return { paths: this.paths, size: this.size }; }
  }
  class Alert {
    constructor() { this.actions = []; this.fields = []; alerts.push(this); }
    addAction(title) { this.actions.push(title); }
    addDestructiveAction(title) { this.actions.push(title); }
    addTextField(placeholder, value = '') { this.fields.push(value); }
    textFieldValue(index) { return this.fields[index]; }
    async present() {
      const next = responses.shift();
      if (typeof next === 'object') { this.fields = next.fields || this.fields; return next.index || 0; }
      return next ?? 0;
    }
    async presentAlert() { return this.present(); }
  }
  class UITableRow {
    constructor() { this.cells = []; }
    addText(title, subtitle) { const cell = { title, subtitle }; this.cells.push(cell); return cell; }
  }
  class UITable {
    constructor() { this.rows = []; }
    addRow(row) { this.rows.push(row); }
    removeAllRows() { this.rows = []; }
    reload() {}
    async present() { if (options.table) await options.table(this); }
  }
  class Request {
    constructor(url) { this.url = url; requests.push(url); }
    async loadJSON() { if (!options.request) throw Error('Offline'); return options.request(this.url, 'json'); }
    async loadString() { if (!options.request) throw Error('Offline'); return options.request(this.url, 'string'); }
  }
  const Script = {
    name: () => options.name || 'Test Widget',
    setWidget: widget => { Script.widget = widget; },
    complete: () => { Script.completed = true; }
  };
  const globals = {
    FileManager, Color, Size, Rect, ListWidget: Stack, Font, DateFormatter, RelativeDateTimeFormatter,
    Path, DrawContext, Alert, UITableRow, UITable, Request, Script,
    LinearGradient: class {},
    SFSymbol: { named: name => ({ image: { symbol: name } }) },
    Device: { locale: () => 'en_US', batteryLevel: () => 0.57, isCharging: () => false },
    Calendar: { forEvents: async () => [], forReminders: async () => [] },
    CalendarEvent: { today: async () => [], between: async () => [] },
    Reminder: { all: async () => [], allIncomplete: async () => [] },
    Location: { current: async () => ({ latitude: 37.3, longitude: -122 }), reverseGeocode: async () => [{ locality: 'Cupertino' }] },
    Photos: { fromLibrary: async () => ({ photo: true }) },
    QuickLook: { present: async value => exports.push(value) },
    DocumentPicker: { exportString: async (value, name) => exports.push({ value, name }) },
    WebView: class { loadURL(url) { this.url = url; } async present() {} },
    config: { runsInApp: false, runsInWidget: true }, args: {}, console
  };
  return { globals, local, cloud, alerts, responses, requests, exports, downloads, Stack };
}

function installScriptable(t, options) {
  const env = createEnvironment(options);
  const original = new Map(Object.keys(env.globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, env.globals);
  t.after(() => {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return env;
}

function texts(stack) {
  return stack.children.flatMap(child => child.type === 'text' ? [child.text] : child.children ? texts(child) : []);
}
module.exports = { createEnvironment, installScriptable, texts };
