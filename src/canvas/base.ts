/**
 * Render engine base class.
 */

export type Point = [number, number];
export type Rect = { x: number; y: number; width: number; height: number };

export interface CanvasRenderer {
  width: number;
  height: number;
  
  clear(): void;
  setPixel(x: number, y: number, char: string, style?: any): void;
  drawRect(rect: Rect, char: string, style?: any): void;
  drawLine(x1: number, y1: number, x2: number, y2: number, char: string, style?: any): void;
  drawText(x: number, y: number, text: string, style?: any): void;
  drawPoint(x: number, y: number, char: string, style?: any): void;
  toString(): string;
}

/**
 * Calculate text width (considering full-width characters).
 */
export function textWidth(text: string): number {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Full-width characters.
    if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK
      (code >= 0xff01 && code <= 0xff60) || // Full-width ASCII.
      (code >= 0x3000 && code <= 0x303f) || // CJK symbols.
      (code >= 0x3040 && code <= 0x30ff) || // Hiragana/Katakana.
      (code >= 0xac00 && code <= 0xd7af)    // Hangul.
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Check if character is full-width.
 */
export function isFullWidth(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xff01 && code <= 0xff60) ||
    (code >= 0x3000 && code <= 0x303f) ||
    (code >= 0x3040 && code <= 0x30ff) ||
    (code >= 0xac00 && code <= 0xd7af)
  );
}

/**
 * Base Canvas implementation.
 */
export abstract class BaseCanvas implements CanvasRenderer {
  public width: number;
  public height: number;
  protected buffer: Array<Array<{ char: string; style?: any }>>;

  constructor(width: number, height: number) {
    this.width = Math.floor(width);
    this.height = Math.floor(height);
    this.buffer = [];
    this.clear();
  }

  clear(): void {
    this.buffer = Array(this.height)
      .fill(null)
      .map(() =>
        Array(this.width)
          .fill(null)
          .map(() => ({ char: ' ' }))
      );
  }

  private ensureWidth(minWidth: number): void {
    const targetWidth = Math.floor(minWidth);
    if (targetWidth <= this.width) return;
    const extraCount = targetWidth - this.width;
    this.buffer = this.buffer.map((row) => {
      const extra = Array(extraCount)
        .fill(null)
        .map(() => ({ char: ' ' }));
      return row.concat(extra);
    });
    this.width = targetWidth;
  }

  setPixel(x: number, y: number, char: string, style?: any): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);

    if (isNaN(ix) || isNaN(iy) || ix < 0 || iy < 0 || iy >= this.height) {
      return;
    }

    const w = isFullWidth(char) ? 2 : 1;
    this.ensureWidth(ix + w);

    this.buffer[iy][ix] = { char, style };

    if (w === 2) {
      this.buffer[iy][ix + 1] = { char: '', style };
    }
  }

  drawRect(rect: Rect, char: string, style?: any): void {
    const { x, y, width, height } = rect;
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = Math.floor(x + width);
    const y2 = Math.floor(y + height);

    for (let iy = y1; iy < y2; iy++) {
      for (let ix = x1; ix < x2; ix++) {
        this.setPixel(ix, iy, char, style);
      }
    }
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, char: string, style?: any): void {
    let x = Math.floor(x1);
    let y = Math.floor(y1);
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.setPixel(x, y, char, style);
      if (Math.abs(x - x2) < 1 && Math.abs(y - y2) < 1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  drawText(x: number, y: number, text: string, style?: any): void {
    const startX = Math.floor(x);
    const iy = Math.floor(y);

    let currentX = startX;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      this.setPixel(currentX, iy, char, style);
      const w = isFullWidth(char) ? 2 : 1;
      currentX += w;
    }
  }

  drawPoint(x: number, y: number, char: string, style?: any): void {
    this.setPixel(x, y, char, style);
  }

  abstract toString(): string;
}
