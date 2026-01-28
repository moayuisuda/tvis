export * from './base';
export * from './ascii';
export * from './color';

import { ASCIICanvas } from './ascii';
import { ColorCanvas } from './color';
import { CanvasRenderer } from './base';

export type CanvasMode = 'ascii' | 'color';

/**
 * Create Canvas renderer.
 */
export function createCanvas(width: number, height: number, mode: CanvasMode = 'ascii'): CanvasRenderer {
  if (mode === 'color') {
    return new ColorCanvas(width, height);
  }
  return new ASCIICanvas(width, height);
}
