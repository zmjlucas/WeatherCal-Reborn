import type { WidgetStack, ListWidget, WidgetText, WidgetImage, Image, Color, UITable, FileManager, CalendarEvent, Reminder } from '#scriptable';
import assert from 'node:assert/strict';
import { afterEach, vi } from 'vitest';
import type { TestContext } from 'vitest';

export interface AlertResponse { index?: number; fields?: string[] }
export interface StoredFile { value: string; image?: unknown; directory?: boolean; modified: Date }
export interface TraceImage { [key: string]: unknown; symbol?: string; tempBar?: boolean; level?: number; condition?: number }
export class TestColor {
  red: number;
  constructor(public hex: string, public alpha = 1) { this.red = hex === 'ffffff' ? 1 : 0; }
  static white() { return new TestColor('ffffff'); }
  static black() { return new TestColor('000000'); }
  static gray() { return new TestColor('888888'); }
  static red() { return new TestColor('ff0000'); }
}
export class TestNode {
  type = 'stack'; children: TestNode[] = []; size = { width: 0, height: 0 };
  text = ''; image: TraceImage = {}; length?: number; padding: number[] = [];
  direction = ''; alignment = ''; preview?: string; url?: string; cornerRadius?: number;
  imageSize = { width: 0, height: 0 }; font = { name: '', size: 0 };
  textColor = new TestColor(''); tintColor = new TestColor('');
  backgroundColor = new TestColor(''); backgroundImage: unknown; backgroundGradient = { colors: [] as TestColor[], locations: [] as number[] };
  lineLimit?: number; style?: string; tint?: { style?: string | undefined; force?: boolean | undefined }; refreshAfterDate?: Date;
  addStack(): TestNode & WidgetStack { const child = new TestNode(); this.children.push(child); return asStack(child); }
  addText(text: string): TestNode & WidgetText { assert.equal(typeof text, 'string'); const child = new TestNode(); child.type = 'text'; child.text = text; this.children.push(child); return child as TestNode & WidgetText; }
  addImage(image: unknown): TestNode & WidgetImage { const child = new TestNode(); child.type = 'image'; child.image = image as TraceImage; this.children.push(child); return child as TestNode & WidgetImage; }
  addSpacer(length?: number) { const child = new TestNode(); child.type = 'spacer'; if (length !== undefined) child.length = length; this.children.push(child); return child; }
  setPadding(...padding: number[]) { this.padding = padding; }
  layoutHorizontally() { this.direction = 'horizontal'; }
  layoutVertically() { this.direction = 'vertical'; }
  centerAlignContent() { this.alignment = 'center'; }
  async presentSmall() { this.preview = 'small'; }
  async presentMedium() { this.preview = 'medium'; }
  async presentLarge() { this.preview = 'large'; }
}
/** These assertions mark the single host-runtime boundary: Scriptable objects do not exist in Node. */
export function asStack(node: TestNode): TestNode & WidgetStack { return node as TestNode & WidgetStack; }
export function inspect(value: WidgetStack | ListWidget | WidgetText | WidgetImage): TestNode { assert(value instanceof TestNode); return value; }
export function mockImage(value: TraceImage): Image { return value as unknown as Image; }
export function mockColor(value: string): Color { return new TestColor(value) as unknown as Color; }
export function required<T>(value: T | undefined | null): T { assert(value !== undefined && value !== null); return value; }
export class TestTableRow {
  cells: Array<{ title: string; subtitle?: string; widthWeight?: number; titleColor?: Color }> = [];
  onSelect: () => void | Promise<void> = () => {};
  addText(title: string, subtitle?: string) { const cell = subtitle === undefined ? { title } : { title, subtitle }; this.cells.push(cell); return cell; }
}
export class TestTable {
  rows: TestTableRow[] = [];
  constructor(private callback?: (table: TestTable) => void | Promise<void>) {}
  addRow(row: TestTableRow) { this.rows.push(row); }
  removeAllRows() { this.rows = []; }
  reload() {}
  async present() { await this.callback?.(this); }
}
export function asTable(table: TestTable): UITable { return table as unknown as UITable; }
export interface EnvironmentOptions {
  responses?: Array<number | AlertResponse>; iCloud?: boolean; dark?: boolean; name?: string;
  table?: (table: TestTable) => void | Promise<void>;
  request?: (url: string, kind: 'json' | 'string') => unknown | Promise<unknown>;
}
export function createEnvironment(options: EnvironmentOptions = {}) {
  const localStore = new Map<string, StoredFile>(); const cloudStore = new Map<string, StoredFile>();
  const alerts: Alert[] = []; const responses = [...(options.responses ?? [])];
  const exports: Array<string | { value: string; name: string }> = [];
  const requests: string[] = []; const downloads: string[] = [];
  class Files {
    constructor(public store: Map<string, StoredFile>, public cloud: boolean) {}
    static local() { return local; } static iCloud() { return cloud; }
    documentsDirectory() { return '/documents'; } libraryDirectory() { return '/library'; }
    joinPath(parent: string, name: string) { return parent + '/' + name; }
    fileExists(path: string) { return this.store.has(path); }
    isDirectory(path: string) { return this.store.get(path)?.directory ?? false; }
    createDirectory(path: string) { this.store.set(path, { value: '', directory: true, modified: new Date() }); }
    readString(path: string) { return required(this.store.get(path)).value; }
    writeString(path: string, value: string) { this.store.set(path, { value, modified: new Date() }); }
    readImage(path: string) { return required(this.store.get(path)).image; }
    writeImage(path: string, image: unknown) { this.store.set(path, { value: '', image, modified: new Date() }); }
    modificationDate(path: string) { return required(this.store.get(path)).modified; }
    remove(path: string) { this.store.delete(path); }
    listContents(path: string) { return [...this.store.keys()].filter(x => x.startsWith(path + '/')).map(x => x.slice(path.length + 1)); }
    isFileStoredIniCloud() { return Boolean(options.iCloud); }
    async downloadFileFromiCloud(path: string) { downloads.push(path); }
  }
  const local = new Files(localStore, false) as Files & FileManager;
  const cloud = new Files(cloudStore, true) as Files & FileManager;
  class Color extends TestColor { static dynamic(light: Color, dark: Color) { return options.dark ? dark : light; } }
  class Size { constructor(public width: number, public height: number) {} }
  class Rect {
    constructor(public x: number, public y: number, public width: number, public height: number) { for (const v of [x, y, width, height]) assert(Number.isFinite(v), 'Drawing geometry must be finite'); }
  }
  class Font {
    constructor(public name: string, public size: number) {}
    static ultraLightSystemFont(size: number) { return new Font('ultraLight', size); }
    static lightSystemFont(size: number) { return new Font('light', size); }
    static regularSystemFont(size: number) { return new Font('regular', size); }
    static mediumSystemFont(size: number) { return new Font('medium', size); }
    static semiboldSystemFont(size: number) { return new Font('semibold', size); }
    static boldSystemFont(size: number) { return new Font('bold', size); }
    static heavySystemFont(size: number) { return new Font('heavy', size); }
    static blackSystemFont(size: number) { return new Font('black', size); }
    static italicSystemFont(size: number) { return new Font('italic', size); }
  }
  class DateFormatter {
    date = false; time = false; dateFormat?: string;
    useShortDateStyle() { this.date = true; } useNoDateStyle() { this.date = false; }
    useShortTimeStyle() { this.time = true; } useNoTimeStyle() { this.time = false; }
    string(value: Date) { assert(value instanceof Date && Number.isFinite(value.getTime())); return (this.dateFormat || (this.time ? 'time' : 'date')) + ':' + value.toISOString(); }
  }
  class RelativeDateTimeFormatter { useNamedDateTimeStyle() {} string(value: Date) { return 'relative:' + value.toISOString(); } }
  class Path {
    shapes: Array<{ rect: Rect; x?: number; y?: number }> = [];
    addRoundedRect(rect: Rect, x: number, y: number) { this.shapes.push({ rect, x, y }); }
    addEllipse(rect: Rect) { this.shapes.push({ rect }); }
  }
  class DrawContext {
    paths: Path[] = []; base?: { image: unknown; rect: Rect }; color?: Color; size?: Size;
    drawImageInRect(image: unknown, rect: Rect) { this.base = { image, rect }; }
    addPath(path: Path) { this.paths.push(path); } setFillColor(color: Color) { this.color = color; }
    fillPath() {} getImage() { return { paths: this.paths, size: this.size }; }
  }
  class Alert {
    actions: string[] = []; fields: string[] = []; title = ''; message = '';
    constructor() { alerts.push(this); }
    addAction(title: string) { this.actions.push(title); } addDestructiveAction(title: string) { this.actions.push(title); }
    addTextField(_placeholder: string, value = '') { this.fields.push(value); }
    textFieldValue(index: number) { return required(this.fields[index]); }
    async present() { const next = responses.shift(); if (typeof next === 'object') { this.fields = next.fields ?? this.fields; return next.index ?? 0; } return next ?? 0; }
    async presentAlert() { return this.present(); }
  }
  class Request {
    constructor(public url: string) { requests.push(url); }
    async loadJSON() { if (!options.request) throw Error('Offline'); return options.request(this.url, 'json'); }
    async loadString() { if (!options.request) throw Error('Offline'); return options.request(this.url, 'string'); }
  }
  const Script: { name: () => string; setWidget: (widget: TestNode) => void; complete: () => void; widget?: TestNode; completed?: boolean; completionCount: number } = {
    name: () => options.name ?? 'Test Widget', setWidget: widget => { Script.widget = widget; },
    complete: () => { Script.completed = true; Script.completionCount++; }, completionCount: 0,
  };
  const globals = {
    FileManager: Files, Color, Size, Rect, ListWidget: TestNode, Font, DateFormatter, RelativeDateTimeFormatter,
    Path, DrawContext, Alert, UITableRow: TestTableRow, UITable: class extends TestTable { constructor() { super(options.table); } }, Request, Script,
    LinearGradient: class {}, SFSymbol: { named: (name: string) => ({ image: { symbol: name } }) },
    Device: { locale: () => 'en_US', batteryLevel: () => 0.57, isCharging: () => false },
    Calendar: { forEvents: async (): Promise<unknown[]> => [], forReminders: async (): Promise<unknown[]> => [] },
    CalendarEvent: { today: async (): Promise<unknown[]> => [], between: async (_start: Date, _end: Date): Promise<unknown[]> => [] },
    Reminder: { all: async (): Promise<unknown[]> => [], allIncomplete: async (): Promise<unknown[]> => [] },
    Location: { current: async (): Promise<{ latitude: number; longitude: number }> => ({ latitude: 37.3, longitude: -122 }), reverseGeocode: async (): Promise<Array<{ locality?: string; administrativeArea?: string }>> => [{ locality: 'Cupertino' }] },
    Photos: { fromLibrary: async (): Promise<unknown> => ({ photo: true }) },
    QuickLook: { present: async (value: string) => { exports.push(value); } },
    DocumentPicker: { exportString: async (value: string, name: string) => { exports.push({ value, name }); }, open: async (): Promise<string[]> => [], openFile: async (): Promise<string | string[]> => [] },
    Data: { fromPNG: (value: unknown) => ({ toBase64String: () => Buffer.from(JSON.stringify(value)).toString('base64') }), fromBase64String: (value: string): unknown => JSON.parse(Buffer.from(value, 'base64').toString()) },
    Image: { fromData: (value: unknown) => value },
    WebView: class { url?: string; loadURL(url: string) { this.url = url; } async present() {} },
    config: { runsInApp: false, runsInWidget: true }, args: { widgetParameter: null as string | null }, console,
  };
  return { globals, local, cloud, alerts, responses, requests, exports, downloads, Stack: TestNode as unknown as new () => TestNode & WidgetStack & ListWidget };
}
export type Environment = ReturnType<typeof createEnvironment>;
export type Runtime = Environment['globals'];
export let runtime: Runtime;
export function installScriptable(_test?: TestContext, options: EnvironmentOptions = {}): Environment {
  const env = createEnvironment(options); runtime = env.globals;
  for (const [key, value] of Object.entries(env.globals)) vi.stubGlobal(key, value);
  afterEach(() => vi.unstubAllGlobals());
  return env;
}
export function texts(value: TestNode | WidgetStack | ListWidget): string[] {
  const stack = value instanceof TestNode ? value : inspect(value);
  return stack.children.flatMap(child => child.type === 'text' ? [child.text] : texts(child));
}
export function descendants(value: TestNode | WidgetStack | ListWidget): TestNode[] {
  const stack = value instanceof TestNode ? value : inspect(value);
  return stack.children.flatMap(child => [child, ...descendants(child)]);
}
/** API-produced calendar objects expose irrelevant platform methods; fixtures name every consumed field. */
export function mockEvent(value: { title: string; startDate?: Date; endDate?: Date; isAllDay?: boolean; location?: string; calendar?: { color: Color } }): CalendarEvent {
  return { startDate: new Date(2026, 8, 8), endDate: new Date(2026, 8, 8, 1), isAllDay: false, ...value } as CalendarEvent;
}
export function mockReminder(value: { title: string; dueDate?: Date; isOverdue?: boolean; dueDateIncludesTime?: boolean; calendar?: { color: Color } }): Reminder {
  return value as Reminder;
}
