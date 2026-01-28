/**
 * ASCII renderer - using pure ASCII characters.
 */

import { BaseCanvas } from './base';

// Linear gradient patterns (from light to dark).
export const ASCII_PATTERNS = [
  '·', // 0% - Lightest.
  ':', // 10%
  '-', // 20%
  '=', // 30%
  '+', // 40%
  '*', // 50%
  '#', // 80%
];

// Discrete patterns with high visual distinction.
// Each character should be clearly different from others.
export const DISCRETE_PATTERNS = [
  '#', // Dense/solid - most prominent
  '=', // Double line - horizontal emphasis
  '*', // Star - distinct pattern
  'x', // Cross - angular
  '+', // Plus - simple cross
  '@', // Very dense
  '-', // Single line - minimal
  '~', // Wave - flowing pattern
  ':', // Dots - very light
];

/**
 * Get linear gradient character.
 */
export function getLinearPattern(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = Math.round(clamped * (ASCII_PATTERNS.length - 1));
  return ASCII_PATTERNS[idx];
}

/**
 * Get discrete pattern character.
 */
export function getDiscretePattern(index: number): string {
  return DISCRETE_PATTERNS[index % DISCRETE_PATTERNS.length];
}

/**
 * ASCII Canvas renderer.
 */
export class ASCIICanvas extends BaseCanvas {
  toString(): string {
    return this.buffer
      .map((row) =>
        row
          .map((cell) => cell.char)
          .join('')
      )
      .join('\n');
  }
}
