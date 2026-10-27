import type { WeatherCalContext } from '../types/context';

export type NodeType = 'row' | 'column' | 'auto' | 'flow' | 'item' | 'space';
export type Alignment = 'start' | 'center' | 'end' | 'stretch';
export type TextAlignment = 'start' | 'center' | 'end';
export type Value = string | number | boolean | Value[];
export type Insets = [number, number, number, number];
export interface SourceLocation { offset: number; line: number; column: number }
export interface LayoutProps {
  width?: number; height?: number;
  minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number;
  grow?: number; gap?: number; padding?: Insets;
  align?: Alignment; justify?: 'start' | 'center' | 'end' | 'between';
  textAlign?: TextAlignment; variant?: string;
}
export interface LayoutNode {
  type: NodeType; name: string; id: string; source: SourceLocation;
  props: LayoutProps; options: Record<string, Value>; children: LayoutNode[];
  parameter?: string; length?: number;
}
export interface Diagnostic { code: string; message: string; nodeId?: string; source?: SourceLocation }
export interface Viewport { width: number; height: number; confidence: 'calibrated' | 'estimated'; source: string }
export interface Measurement { requiredHeight: number; preferredHeight: number; confidence: 'calibrated' | 'estimated' }
export interface ItemVariant {
  id: string; minWidth: number; preferredWidth: number; maxWidth?: number;
  adaptationCost: number; measure(width: number): Measurement;
}
export interface ItemPlacement { id: string; variant: string; width: number; height: number; textAlign: TextAlignment }
export interface PreparedItem {
  state: 'ready' | 'empty' | 'error'; variants: readonly ItemVariant[];
  effects: { refreshAfterDate?: Date };
  render(container: WidgetStack, placement: ItemPlacement): void;
}
export interface PrepareContext {
  host: WeatherCalContext;
  get<T>(key: string, load: () => Promise<T>): Promise<T>;
}
export interface ItemModule {
  options?: Readonly<Record<string, 'string' | 'number' | 'boolean'>>;
  prepare(context: PrepareContext, options: Readonly<Record<string, Value>>): Promise<PreparedItem>;
}
export type PreparedItems = ReadonlyMap<string, PreparedItem>;
export interface Box { x: number; y: number; width: number; height: number }
export interface ResolvedNode {
  type: 'row' | 'column' | 'item' | 'space'; id: string; name: string;
  box: Box; contentBox: Box; children: ResolvedNode[];
  textAlign: TextAlignment; variant?: string;
}
export interface PlanningLimits {
  /** Structural attempts per automatic instance, summed across proposed widths. */
  maxCandidates: number;
  maxMeasurements: number;
  /** Maximum retained combinations at each subtree boundary. */
  frontier: number;
}
export type PlanResult = {
  ok: true; tree: ResolvedNode; diagnostics: Diagnostic[];
  confidence: 'calibrated' | 'estimated'; measurements: number; candidates: number;
} | { ok: false; diagnostics: Diagnostic[]; measurements: number; candidates: number };
export interface WidgetLayoutOptions {
  family?: 'small' | 'medium' | 'large';
  viewport?: { width: number; height: number };
}
