/**
 * Label component - Data labels.
 */

import { CanvasRenderer, textWidth } from '../canvas';
export type LabelOptions = {
  x: number;
  y: number;
  text: string;
  position?: 'top' | 'bottom' | 'middle' | 'left' | 'right';
  style?: any;
};

/**
 * Render label.
 */
export function renderLabel(canvas: CanvasRenderer, options: LabelOptions): void {
  const { x, y, text, position = 'top', style } = options;

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

  // Boundary check.
  if (labelY < 0 || labelY >= canvas.height) return;

  canvas.drawText(labelX, labelY, text, style);
}
