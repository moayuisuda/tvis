/**
 * StackY Transform - Stacking transformation.
 */

import { StackYTransform, Primitive } from '../spec';

export function stackY(data: any[], transform: StackYTransform, encodeFields: { x?: string; y?: string; color?: string }): any[] {
  const { groupBy, reverse = false, orderBy } = transform;
  const xField = encodeFields.x;
  const yField = encodeFields.y;
  const colorField = encodeFields.color || (typeof groupBy === 'string' ? groupBy : undefined);

  if (!xField || !yField) {
    throw new Error('stackY requires x and y encode fields');
  }

  // Group by x.
  const groups: Record<string, any[]> = {};
  const xValues = new Set<string>();

  data.forEach((d) => {
    const xVal = String(d[xField]);
    xValues.add(xVal);
    if (!groups[xVal]) {
      groups[xVal] = [];
    }
    groups[xVal].push({ ...d });
  });

  // Stack each group.
  const result: any[] = [];

  Array.from(xValues).forEach((xVal) => {
    const group = groups[xVal];

    // Sort if needed.
    if (orderBy && typeof orderBy === 'function') {
      group.sort((a, b) => {
        const va = orderBy(a);
        const vb = orderBy(b);
        if (va == null || vb == null) return 0;
        return va < vb ? -1 : va > vb ? 1 : 0;
      });
    } else if (colorField && orderBy === 'series') {
      group.sort((a, b) => {
        const va = String(a[colorField] ?? '');
        const vb = String(b[colorField] ?? '');
        return va.localeCompare(vb);
      });
    }

    if (reverse) {
      group.reverse();
    }

    // Stack.
    let y0 = 0;
    group.forEach((d) => {
      const val = d[yField] || 0;
      d._y0 = y0;
      d._y1 = y0 + val;
      y0 += val;
      result.push(d);
    });
  });

  return result;
}
