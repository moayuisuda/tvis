import { format } from 'd3-format';

export type Formatter = (value: any) => string;

/**
 * Create a formatter function.
 * Supports d3-format string or custom function.
 */
export function createFormatter(formatter?: string | Formatter): Formatter {
  if (!formatter) {
    return (v: any) => String(v);
  }

  if (typeof formatter === 'string') {
    try {
      const f = format(formatter);
      return (v: any) => f(v);
    } catch (e) {
      console.warn(`[tvis] Invalid d3-format string: "${formatter}", fallback to default.`);
      return (v: any) => String(v);
    }
  }

  if (typeof formatter === 'function') {
    return formatter;
  }

  return (v: any) => String(v);
}
