/**
 * ASCII renderer - using pure ASCII characters.
 */

import { BaseCanvas } from "./base";

// Linear gradient patterns (from light to dark).
export const ASCII_PATTERNS = [
  "·", // 0% - Lightest.
  ":", // 10%
  "-", // 20%
  "=", // 30%
  "+", // 40%
  "*", // 50%
  "#", // 80%
];
export const INTERVAL_ASCII_PATTERNS = [
  "░", // ~25%
  "▒", // ~50%
  "▓", // ~75%
  "█", // 100%
];

// Discrete patterns with high visual distinction.
// Each character should be clearly different from others.
export const DISCRETE_PATTERNS = [
  "·", // 0% - Lightest.
  "*", // Star - distinct pattern
  "#", // Dense/solid - most prominent
  "=", // Double line - horizontal emphasis
  "x", // Cross - angular
  "+", // Plus - simple cross
  "@", // Very dense
  "-", // Single line - minimal
  "~", // Wave - flowing pattern
  ":", // Dots - very light
];
export const INTERVAL_DISCRETE_PATTERNS = INTERVAL_ASCII_PATTERNS;

/**
 * Get linear gradient character.
 */
export function getLinearPattern(t: number, type?: string): string {
  const clamped = Math.max(0, Math.min(1, t));
  const patterns =
    type === "interval" ? INTERVAL_ASCII_PATTERNS : ASCII_PATTERNS;
  const idx = Math.round(clamped * (patterns.length - 1));
  return patterns[idx];
}

/**
 * Get discrete pattern character.
 */
export function getDiscretePattern(index: number, type?: string): string {
  const patterns =
    type === "interval" ? INTERVAL_DISCRETE_PATTERNS : DISCRETE_PATTERNS;
  return patterns[index % patterns.length];
}

/**
 * ASCII Canvas renderer.
 */
export class ASCIICanvas extends BaseCanvas {
  toString(): string {
    return this.buffer
      .map((row) => row.map((cell) => cell.char).join(""))
      .join("\n");
  }
}
