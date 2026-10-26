// Existing background file shapes are retained, including optional dark values.
export type Background =
  | { type: 'color'; color: string; dark?: string }
  | { type: 'auto' }
  | { type: 'gradient'; initialColor: string; finalColor: string; initialDark?: string; finalDark?: string }
  | { type: 'image'; dark?: boolean };

export function parseBackground(value: unknown): Background {
  if (value && typeof value === 'object' && 'type' in value) {
    if (value.type === 'auto') return { type: 'auto' };
    if (value.type === 'image') return { type: 'image', ...('dark' in value && typeof value.dark === 'boolean' ? { dark: value.dark } : {}) };
    if (value.type === 'color' && 'color' in value && typeof value.color === 'string') {
      return { type: 'color', color: value.color, ...('dark' in value && typeof value.dark === 'string' ? { dark: value.dark } : {}) };
    }
    if (value.type === 'gradient' && 'initialColor' in value && typeof value.initialColor === 'string' &&
        'finalColor' in value && typeof value.finalColor === 'string') {
      return { type: 'gradient', initialColor: value.initialColor, finalColor: value.finalColor,
        ...('initialDark' in value && typeof value.initialDark === 'string' ? { initialDark: value.initialDark } : {}),
        ...('finalDark' in value && typeof value.finalDark === 'string' ? { finalDark: value.finalDark } : {}) };
    }
  }
  return { type: 'color', color: '16296b' };
}
