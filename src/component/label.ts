/**
 * Label component - Data labels.
 */

import { CanvasRenderer, textWidth } from '../canvas';

export type LabelBounds = {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
};
export type LabelOptions = {
  x: number;
  y: number;
  text: string;
  position?: 'top' | 'bottom' | 'middle' | 'left' | 'right';
  style?: any;
  bounds?: LabelBounds;
};

/**
 * Render label.
 */
export function renderLabel(canvas: CanvasRenderer, options: LabelOptions): void {
  const { x, y, text, position = 'top', style, bounds } = options;

  let labelX = x;
  let labelY = y;

  const w = textWidth(text);

  switch (position) {
    case 'top':
      labelX = Math.floor(x - (w - 1) / 2);
      labelY = y - 1;
      break;

    case 'bottom':
      labelX = Math.floor(x - (w - 1) / 2);
      labelY = y + 1;
      break;

    case 'middle':
      labelX = Math.floor(x - (w - 1) / 2);
      labelY = y;
      break;

    case 'left':
      labelX = x - w - 1;
      labelY = y;
      break;

    case 'right':
      labelX = x + 1;
      labelY = y;
      break;
  }

  const minX = bounds?.minX ?? 0;
  const maxX = bounds?.maxX ?? canvas.width - 1;
  const minY = bounds?.minY ?? 0;
  const maxY = bounds?.maxY ?? canvas.height - 1;

  const maxStartX = Math.max(minX, maxX - w + 1);
  labelX = Math.max(minX, Math.min(labelX, maxStartX));
  labelY = Math.max(minY, Math.min(labelY, maxY));

  // Boundary check.
  if (labelY < 0 || labelY >= canvas.height) return;

  canvas.drawText(labelX, labelY, text, style);
}
