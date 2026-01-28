/**
 * Color renderer - using ANSI colors.
 */

import { BaseCanvas } from './base';

// ANSI escape codes for named colors (e.g. 'red', 'blue').
// Users DO NOT need to modify this to add new colors; use Hex codes (e.g. '#FF0000') in ChartSpec.colors instead.
export const ANSI_COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors.
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Bright colors.
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // Background colors.
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

export type ColorName = keyof typeof ANSI_COLORS;

/**
 * Convert Hex color to ANSI RGB sequence.
 * @param hex Hex color string (e.g. #FF0000)
 */
export function hexToAnsi(hex: string): string {
  if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(hex)) {
    return '';
  }
  
  let c = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  
  const num = parseInt(c.join(''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  
  return `\x1b[38;2;${r};${g};${b}m`;
}

// Default Palette (G2 Classic Categorical 10)
export const DEFAULT_PALETTE = [
  '#5B8FF9', // Blue
  '#61DDAA', // Green
  '#65789B', // Grey-Blue
  '#F6BD16', // Yellow
  '#7262FD', // Purple
  '#78D3F8', // Cyan
  '#9661BC', // Deep Purple
  '#F6903D', // Orange
  '#008685', // Teal
  '#F08BB4', // Pink
] as const;

export const COLOR_PALETTE = DEFAULT_PALETTE;

type RgbColor = { r: number; g: number; b: number };

function parseHexColor(hex: string): RgbColor | null {
  if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(hex)) {
    return null;
  }
  let c = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const num = parseInt(c.join(''), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function toHexColor(color: RgbColor): string {
  const r = Math.round(color.r).toString(16).padStart(2, '0');
  const g = Math.round(color.g).toString(16).padStart(2, '0');
  const b = Math.round(color.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

function interpolateColor(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/**
 * Get linear color.
 */
export function getLinearColor(t: number, palette: readonly string[] = DEFAULT_PALETTE): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (palette.length === 0) return '#000000';
  if (palette.length === 1) return palette[0];

  const scaled = clamped * (palette.length - 1);
  const idx = Math.floor(scaled);
  const nextIdx = Math.min(idx + 1, palette.length - 1);
  const localT = scaled - idx;

  const start = palette[idx];
  const end = palette[nextIdx];
  const startRgb = parseHexColor(start);
  const endRgb = parseHexColor(end);

  if (!startRgb || !endRgb) {
    return localT < 0.5 ? start : end;
  }

  return toHexColor(interpolateColor(startRgb, endRgb, localT));
}

/**
 * Get discrete color.
 */
export function getDiscreteColor(index: number, palette: readonly string[] = COLOR_PALETTE): string {
  return palette[index % palette.length];
}

/**
 * Apply color style.
 */
export function applyColor(text: string, color?: string, bright?: boolean): string {
  if (!color) return text;
  
  let ansiCode = '';
  if (color.startsWith('#')) {
    ansiCode = hexToAnsi(color);
  } else if (ANSI_COLORS[color as ColorName]) {
    ansiCode = ANSI_COLORS[color as ColorName];
    if (bright) {
      ansiCode = ANSI_COLORS.bright + ansiCode;
    }
  }
  
  return ansiCode + text + ANSI_COLORS.reset;
}

/**
 * Color Canvas renderer.
 */
export class ColorCanvas extends BaseCanvas {
  toString(): string {
    return this.buffer
      .map((row) => {
        let line = '';
        let currentStyle: any = null;
        
        for (let i = 0; i < row.length; i++) {
          const cell = row[i];
          
          // Apply new style if style changes.
          if (cell.style?.color !== currentStyle?.color) {
            if (currentStyle?.color) {
              line += ANSI_COLORS.reset;
            }
            if (cell.style?.color) {
              const color = cell.style.color;
              if (color.startsWith('#')) {
                line += hexToAnsi(color);
              } else if (ANSI_COLORS[color as ColorName]) {
                line += ANSI_COLORS[color as ColorName];
              }
            }
            currentStyle = cell.style;
          }
          
          line += cell.char;
        }
        
        // Reset style at line end.
        if (currentStyle?.color) {
          line += ANSI_COLORS.reset;
        }
        
        return line;
      })
      .join('\n');
  }
}
