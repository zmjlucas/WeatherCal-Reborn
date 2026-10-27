import type { WeatherCalContext } from '../../types/context';
import type { Insets } from '../../layout/types';

/** Content methods write this data-only tree. No native stack exists until final render. */
export class PresentationNode {
  readonly children: PresentationNode[] = [];
  direction: 'horizontal' | 'vertical' = 'horizontal';
  padding: Insets = [0, 0, 0, 0];
  size = { width: 0, height: 0 };
  imageSize = { width: 0, height: 0 };
  spacing = 0;
  length = 0;
  flexible = false;
  font?: Font;
  fontSize = 14;
  textColor?: Color;
  tintColor?: Color;
  textOpacity?: number;
  imageOpacity?: number;
  url?: string;
  lineLimit?: number;
  minimumScaleFactor?: number;
  center = false;
  refreshAfterDate?: Date;

  constructor(readonly kind: 'stack' | 'text' | 'image' | 'space' = 'stack', readonly text = '', readonly image?: Image) {}
  addStack(): WidgetStack {
    const child = new PresentationNode(); this.children.push(child);
    return child as unknown as WidgetStack;
  }
  addText(text: string): WidgetText {
    const child = new PresentationNode('text', text); this.children.push(child);
    return child as unknown as WidgetText;
  }
  addImage(image: Image): WidgetImage {
    const child = new PresentationNode('image', '', image); this.children.push(child);
    return child as unknown as WidgetImage;
  }
  addSpacer(length?: number): void {
    const child = new PresentationNode('space');
    child.length = length ?? 0; child.flexible = length === undefined;
    this.children.push(child);
  }
  setPadding(top: number, left: number, bottom: number, right: number): void { this.padding = [top, right, bottom, left]; }
  layoutHorizontally(): void { this.direction = 'horizontal'; }
  layoutVertically(): void { this.direction = 'vertical'; }
  centerAlignContent(): void { this.center = true; }
}

export function recordingContext(host: WeatherCalContext): { context: WeatherCalContext; root: PresentationNode; finish(): void } {
  const context = Object.create(host) as WeatherCalContext;
  context.settings = JSON.parse(JSON.stringify(host.settings)) as typeof host.settings;
  context.format = context.settings.font;
  context.localization = context.settings.localization;
  const root = new PresentationNode(); root.layoutVertically();
  context.widget = root as unknown as ListWidget;
  context.align = stack => {
    const child = stack.addStack(); child.layoutVertically(); return child;
  };
  const fonts = new Map<Font, number>();
  context.provideFont = (name, size) => {
    const font = host.provideFont(name, size);
    fonts.set(font, size); return font;
  };
  return { context, root, finish() {
    function capture(node: PresentationNode): void {
      if (node.font) node.fontSize = fonts.get(node.font) ?? 14;
      // Recorded content keeps configured line limits but never silently reduces its font.
      if (node.kind === 'text') node.minimumScaleFactor = 1;
      for (const child of node.children) capture(child);
      Object.freeze(node.padding); Object.freeze(node.size); Object.freeze(node.imageSize);
      Object.freeze(node.children); Object.freeze(node);
    }
    capture(root);
  } };
}
