/**
 * DodgeX Transform - Grouped side-by-side transformation.
 */

import { DodgeXTransform } from '../spec';

export function dodgeX(data: any[], transform: DodgeXTransform, encodeFields: { x?: string; y?: string; color?: string }): any[] {
  const { groupBy, reverse = false, padding = 0.1 } = transform;
  const xField = encodeFields.x;
  const seriesField = typeof groupBy === 'string' ? groupBy : encodeFields.color;

  if (!xField || !seriesField) {
    throw new Error('dodgeX requires x and a series field (encode.color or transform.groupBy)');
  }

  const localDodgeIndex: number[] = new Array(data.length).fill(0);
  const localGroupCount: number[] = new Array(data.length).fill(1);
  let maxGroupCount = 1;

  const groups = new Map<any, number[]>();
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const xValue = d?.[xField];
    let indices = groups.get(xValue);
    if (!indices) {
      indices = [];
      groups.set(xValue, indices);
    }
    indices.push(i);
  }

  for (const indices of groups.values()) {
    const indexBySeriesValue = new Map<any, number>();
    let groupSeriesCount = 0;
    for (const i of indices) {
      const d = data[i];
      const seriesValue = d?.[seriesField];
      let idx = indexBySeriesValue.get(seriesValue);
      if (idx === undefined) {
        idx = groupSeriesCount;
        indexBySeriesValue.set(seriesValue, idx);
        groupSeriesCount += 1;
      }
      localDodgeIndex[i] = idx;
    }
    const count = Math.max(1, groupSeriesCount);
    maxGroupCount = Math.max(maxGroupCount, count);
    for (const i of indices) {
      localGroupCount[i] = count;
    }
  }

  const result = data.map((d, i) => {
    const count = localGroupCount[i] ?? 1;
    const idx = localDodgeIndex[i] ?? 0;
    const dodgeIndex = reverse ? Math.max(0, count - 1 - idx) : idx;
    return {
      ...d,
      _dodgeIndex: dodgeIndex,
      _dodgeGroupCount: count,
      _dodgeCount: maxGroupCount,
      _dodgePadding: padding,
    };
  });

  return result;
}
