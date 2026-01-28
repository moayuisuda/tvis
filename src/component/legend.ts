/**
 * Legend component - Chart legend.
 */

import { CanvasRenderer, textWidth } from "../canvas";
import { LegendSpec } from "../spec";

export type LegendOptions = {
  items: Array<{ label: string; symbol: string; style?: any }>;
  x: number;
  y: number;
  width: number;
  spec?: LegendSpec;
};

export function measureLegendHeight(
  items: Array<{ label: string; symbol: string; style?: any }>,
  width: number,
  spec?: LegendSpec,
): number {
  if (spec === false || items.length === 0) return 0;
  return items.length;
}

export function measureLegendWidth(
  items: Array<{ label: string; symbol: string; style?: any }>,
  spec?: LegendSpec,
): number {
  if (spec === false || items.length === 0) return 0;
  return Math.max(...items.map((item) => 2 + textWidth(item.label)), 0);
}

/**
 * Render legend.
 */
export function renderLegend(
  canvas: CanvasRenderer,
  options: LegendOptions,
): void {
  const { items, x, y, width, spec } = options;

  if (spec === false || items.length === 0) return;

  let currentY = y;
  items.forEach((item) => {
    canvas.drawText(x, currentY, item.symbol, item.style);
    canvas.drawText(x + 2, currentY, item.label);
    currentY += 1;
  });
}
