import { PresentationNode } from './recording';

/** A new data-only snapshot: strings, links, padding and image geometry stay intact.
 * Unknown native fonts cannot be resized safely and retain their measured size. */
export function scalePresentation(node: PresentationNode, scale: number): PresentationNode {
  const fontSize = node.kind === 'text' && node.fontFactory
    ? Math.min(node.fontSize, Math.max(10, node.fontSize * scale)) : node.fontSize;
  const copy = Object.assign(new PresentationNode(node.kind, node.text, node.image), node, {
    fontSize, children: node.children.map(child => scalePresentation(child, scale)),
  });
  Object.freeze(copy.children);
  return Object.freeze(copy);
}
