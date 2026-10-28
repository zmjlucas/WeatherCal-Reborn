import type { ItemPlacement } from '../../layout/types';
import type { PresentationNode } from './recording';

export interface ContentSize { min: number; preferred: number }
interface Frame { node: PresentationNode; width: number; height: number; children: Frame[] }

function glyphWidth(character: string, size: number): number {
  return size * (/\s/u.test(character) ? 0.36 : /[\u0000-\u00ff]/u.test(character) ? 0.66 : 1.08);
}

function textWidth(text: string, size: number): number {
  return Math.max(...text.split('\n').map(line => Array.from(line).reduce((sum, character) => sum + glyphWidth(character, size), 0)), 1);
}

export function intrinsic(node: PresentationNode): ContentSize {
  if (node.kind === 'space') return { min: node.length, preferred: node.length };
  if (node.kind === 'text') {
    const preferred = textWidth(node.text, node.fontSize) + 2;
    // Native single-line text truncates within its frame; its full text width is a preference.
    const min = Math.min(preferred, node.fontSize * 1.1 + 2);
    return { min, preferred };
  }
  if (node.kind === 'image') {
    const width = node.imageSize.width || node.image?.size?.width || 18;
    return { min: node.imageSize.width || 1, preferred: width };
  }
  const children = node.children.map(intrinsic);
  const horizontal = node.direction === 'horizontal';
  const gap = Math.max(0, children.length - 1) * node.spacing;
  const inset = node.padding[1] + node.padding[3];
  const min = inset + (horizontal ? children.reduce((sum, size) => sum + size.min, gap) : Math.max(0, ...children.map(size => size.min)));
  const natural = inset + (horizontal ? children.reduce((sum, size) => sum + size.preferred, gap) : Math.max(0, ...children.map(size => size.preferred)));
  return { min: Math.max(min, node.size.width), preferred: Math.max(min, node.size.width || natural) };
}

/** Uses the same glyph/word estimate for measuring and final native frame allocation. */
function textHeight(node: PresentationNode, width: number): number {
  const available = Math.max(1, width - 2);
  let lines = 0;
  for (const paragraph of node.text.split('\n')) {
    let used = 0; let count = 1;
    const tokens = paragraph.match(/[\u0000-\u00ff]+|[^\u0000-\u00ff]/gu) ?? [''];
    for (const run of tokens) {
      for (const token of run.match(/\S+|\s+/gu) ?? ['']) {
        const tokenWidth = textWidth(token, node.fontSize);
        if (used > 0 && used + tokenWidth > available) { count++; used = 0; }
        if (tokenWidth > available) {
          const wrapped = Math.ceil(tokenWidth / available);
          count += wrapped - 1; used = tokenWidth - (wrapped - 1) * available;
        } else used += tokenWidth;
      }
    }
    lines += count;
  }
  if (node.lineLimit && node.lineLimit > 0) lines = Math.min(lines, node.lineLimit);
  return Math.max(1, lines) * node.fontSize * 1.35 + 2;
}

function frame(node: PresentationNode, width: number): Frame {
  if (node.kind === 'text') return { node, width, height: textHeight(node, width), children: [] };
  if (node.kind === 'space') return { node, width, height: node.length, children: [] };
  if (node.kind === 'image') {
    const natural = node.image?.size;
    const height = node.imageSize.height || (natural?.height && natural.width ? natural.height * width / natural.width : 18);
    return { node, width, height, children: [] };
  }
  const inner = Math.max(0, width - node.padding[1] - node.padding[3]);
  const gap = Math.max(0, node.children.length - 1) * node.spacing;
  const widths = node.children.map(child => {
    const size = intrinsic(child);
    return node.direction === 'vertical' ? Math.min(inner, Math.max(size.min, child.size.width || inner)) : size.preferred;
  });
  if (node.direction === 'horizontal') {
    const sizes = node.children.map(intrinsic);
    const minimum = sizes.reduce((sum, size) => sum + size.min, gap);
    const preferred = widths.reduce((sum, value) => sum + value, gap);
    if (preferred > inner) {
      const shrink = Math.min(1, (preferred - inner) / Math.max(1, preferred - minimum));
      widths.forEach((value, index) => { widths[index] = value - (value - sizes[index]!.min) * shrink; });
    } else {
      const flexible = node.children.filter(child => child.flexible).length;
      if (flexible) widths.forEach((value, index) => {
        if (node.children[index]!.flexible) widths[index] = value + (inner - preferred) / flexible;
      });
    }
  }
  const children = node.children.map((child, index) => frame(child, widths[index]!));
  const childHeight = node.direction === 'horizontal'
    ? Math.max(0, ...children.map(child => child.node.kind === 'space' ? 0 : child.height))
    : children.reduce((sum, child) => sum + child.height, gap);
  return { node, width, height: Math.max(node.size.height, node.padding[0] + node.padding[2] + childHeight), children };
}

export function measurePresentation(node: PresentationNode, width: number): number {
  if (!Number.isFinite(width) || width <= 0) throw new Error('Presentation width must be finite and positive.');
  return frame(node, width).height;
}

export function renderPresentation(root: PresentationNode, container: WidgetStack, placement: ItemPlacement): void {
  function render(current: Frame, parent: WidgetStack): void {
    const { node, width, height } = current;
    if (node.kind === 'space') return;
    if (!(width > 0 && height > 0)) return;
    const target = parent.addStack();
    target.size = new Size(width, height);
    target.spacing = 0;
    target.setPadding(0, 0, 0, 0);
    if (node.url) target.url = node.url;
    if (node.kind === 'text') {
      const text = target.addText(node.text);
      if (node.fontFactory) text.font = node.fontFactory(node.fontSize);
      else if (node.font) text.font = node.font;
      if (node.textColor) text.textColor = node.textColor;
      if (node.textOpacity !== undefined) text.textOpacity = node.textOpacity;
      if (node.lineLimit !== undefined) text.lineLimit = node.lineLimit;
      text.minimumScaleFactor = 1;
      if (node.url) text.url = node.url;
      const align = placement.textAlign === 'center' ? text.centerAlignText : placement.textAlign === 'end' ? text.rightAlignText : text.leftAlignText;
      // Scriptable mocks may omit alignment methods; real native text always exposes them.
      if (typeof align === 'function') align.call(text);
      return;
    }
    if (node.kind === 'image') {
      const image = target.addImage(node.image!);
      image.imageSize = new Size(width, height);
      if (node.tintColor) image.tintColor = node.tintColor;
      if (node.imageOpacity !== undefined) image.imageOpacity = node.imageOpacity;
      return;
    }
    target.layoutVertically();
    if (node.padding[0] > 0) target.addSpacer(node.padding[0]);
    const band = target.addStack(); band.layoutHorizontally(); band.spacing = 0; band.setPadding(0, 0, 0, 0);
    if (node.padding[3] > 0) band.addSpacer(node.padding[3]);
    const content = band.addStack(); content.spacing = 0; content.setPadding(0, 0, 0, 0);
    const inner = width - node.padding[1] - node.padding[3];
    const contentHeight = height - node.padding[0] - node.padding[2];
    if (inner > 0 && contentHeight > 0) content.size = new Size(inner, contentHeight);
    if (node.direction === 'vertical') content.layoutVertically(); else content.layoutHorizontally();
    if (node.center) content.centerAlignContent();
    if (node.direction === 'horizontal') {
      const occupied = current.children.reduce((sum, child) => sum + child.width, Math.max(0, current.children.length - 1) * node.spacing);
      const leading = Math.max(0, inner - occupied) * (placement.textAlign === 'end' ? 1 : placement.textAlign === 'center' ? 0.5 : 0);
      if (leading > 0) content.addSpacer(leading);
    }
    current.children.forEach((child, index) => {
      if (index && node.spacing > 0) content.addSpacer(node.spacing);
      if (child.node.kind === 'space') {
        const length = node.direction === 'horizontal' ? child.width : child.height;
        if (length > 0) content.addSpacer(length);
      } else if (node.direction === 'vertical' && child.width < inner && placement.textAlign !== 'start') {
        const aligned = content.addStack(); aligned.layoutHorizontally(); aligned.spacing = 0; aligned.setPadding(0, 0, 0, 0);
        aligned.size = new Size(inner, child.height);
        aligned.addSpacer((inner - child.width) * (placement.textAlign === 'end' ? 1 : 0.5));
        render(child, aligned);
      } else render(child, content);
    });
    if (node.padding[1] > 0) band.addSpacer(node.padding[1]);
    if (node.padding[2] > 0) target.addSpacer(node.padding[2]);
  }
  render(frame(root, placement.width), container);
}
