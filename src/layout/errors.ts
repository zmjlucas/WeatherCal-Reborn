import type { Diagnostic } from './types';

/** A user-facing layout failure with a machine-readable code and source position. */
export class LayoutError extends Error {
  readonly diagnostic: Diagnostic;

  constructor(diagnostic: Diagnostic) {
    const location = diagnostic.source;
    super(`${diagnostic.message}${location ? ` (${location.line}:${location.column})` : ''}`);
    this.name = 'LayoutError';
    this.diagnostic = diagnostic;
  }
}
