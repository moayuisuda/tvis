/**
 * Scale system.
 */

import { Linear, Band, Ordinal, Point as PointScale } from './simple';
import { ScaleSpec } from '../spec';

export type Scale = Linear | Band | Ordinal | PointScale | any;

/**
 * Create Scale.
 */
export function createScale(
  type: string | undefined,
  domain: any[],
  range: any[],
  options: ScaleSpec = {}
): Scale {
  const { nice = false, ...rest } = options;

  switch (type) {
    case 'linear':
      return new Linear({
        domain,
        range,
        nice,
        ...rest,
      });

    case 'band':
      return new Band({
        domain,
        range,
        // Don't use padding, let interval mark control gaps.
        ...rest,
      });

    case 'point':
      return new PointScale({
        domain,
        range,
        ...rest,
      });

    case 'ordinal':
    default:
      return new Ordinal({
        domain,
        range,
        ...rest,
      });
  }
}

/**
 * Infer Scale type.
 */
export function inferScaleType(values: any[]): 'linear' | 'ordinal' {
  if (values.length === 0) return 'ordinal';

  const sample = values.find((v) => v !== null && v !== undefined);
  if (sample === undefined) return 'ordinal';

  return typeof sample === 'number' ? 'linear' : 'ordinal';
}

/**
 * Infer Scale from data.
 */
export function inferScale(
  data: any[],
  field: string,
  range: any[],
  scaleSpec?: ScaleSpec
): Scale {
  const values = data.map((d) => d[field]).filter((v) => v !== null && v !== undefined);
  
  if (values.length === 0) {
    return createScale('ordinal', [], range, scaleSpec);
  }

  const type = scaleSpec?.type || inferScaleType(values);
  
  if (type === 'linear') {
    const min = Math.min(...(values as number[]));
    const max = Math.max(...(values as number[]));
    return createScale('linear', [min, max], range, { nice: true, ...scaleSpec });
  }

  const domain = Array.from(new Set(values));
  
  // If categorical data needs bandwidth, use band scale.
  if (scaleSpec?.type === 'band' || (!scaleSpec?.type && domain.length > 0)) {
    return createScale('band', domain, range, scaleSpec);
  }

  return createScale('ordinal', domain, range, scaleSpec);
}

/**
 * Calculate uniform bar layout (ensuring consistent width and gaps).
 * Used for interval mark and axis component.
 */
export function createBandLayout(
  domain: any[],
  plotX: number,
  plotWidth: number,
  leadingGap: number,
  bandGap: number,
  dodgeCount: number,
  forceOddWidth: boolean
): {
  uniformBarWidth: number;
  getBarPosition: (xIndex: number, dodgeIndex?: number) => { start: number; end: number; center: number };
  getGroupCenter: (xIndex: number) => number;
} {
  if (domain.length === 0) {
    return {
      uniformBarWidth: 1,
      getBarPosition: () => ({ start: plotX, end: plotX, center: plotX }),
      getGroupCenter: () => plotX,
    };
  }

  const innerGap = bandGap;
  const outerGap = dodgeCount > 1 ? 2 : 1;

  let totalGaps: number;
  if (dodgeCount > 1) {
    const innerGapsPerGroup = dodgeCount - 1;
    const totalInnerGaps = domain.length * innerGapsPerGroup;
    const totalOuterGaps = domain.length - 1;
    totalGaps = totalInnerGaps * innerGap + totalOuterGaps * outerGap;
  } else {
    totalGaps = (domain.length - 1) * innerGap;
  }

  const totalBars = domain.length * dodgeCount;
  const availableForBars = plotWidth - leadingGap - totalGaps;
  let uniformBarWidth = Math.max(1, Math.floor(availableForBars / totalBars));

  if (forceOddWidth) {
    if (uniformBarWidth > 1 && uniformBarWidth % 2 === 0) {
      uniformBarWidth -= 1;
    }
  } else if (uniformBarWidth >= 3 && uniformBarWidth % 2 === 0) {
    uniformBarWidth -= 1;
  }

  const getGroupStart = (xIndex: number) => {
    let offset = plotX + leadingGap;
    if (xIndex > 0) {
      const barsPerGroup = dodgeCount;
      const gapsPerGroup = dodgeCount - 1;
      const groupWidth = barsPerGroup * uniformBarWidth + gapsPerGroup * innerGap;
      offset += xIndex * (groupWidth + outerGap);
    }
    return offset;
  };

  const getBarPosition = (xIndex: number, dodgeIndex: number = 0) => {
    let barStart: number;
    if (dodgeCount > 1) {
      barStart = getGroupStart(xIndex) + dodgeIndex * (uniformBarWidth + innerGap);
    } else {
      barStart = plotX + leadingGap + xIndex * (uniformBarWidth + innerGap);
    }
    const barEnd = barStart + uniformBarWidth - 1;
    const center = Math.round((barStart + barEnd) / 2);
    return { start: barStart, end: barEnd, center };
  };

  const getGroupCenter = (xIndex: number) => {
    if (dodgeCount === 1) {
      return getBarPosition(xIndex, 0).center;
    }
    const groupStart = getGroupStart(xIndex);
    const groupEnd = groupStart + dodgeCount * uniformBarWidth + (dodgeCount - 1) * innerGap - 1;
    return Math.round((groupStart + groupEnd) / 2);
  };

  return { uniformBarWidth, getBarPosition, getGroupCenter };
}

export function getCenteredBarPosition(options: {
  layout: ReturnType<typeof createBandLayout>;
  xIndex: number;
  dodgeIndex: number;
  groupCount: number;
  maxGroupCount: number;
  bandGap: number;
}): { start: number; end: number; center: number } {
  const { layout, xIndex, dodgeIndex, groupCount, maxGroupCount, bandGap } = options;
  if (maxGroupCount <= 1) {
    return layout.getBarPosition(xIndex, 0);
  }
  const innerGap = bandGap;
  const uniformBarWidth = layout.uniformBarWidth;
  const maxGroupWidth = maxGroupCount * uniformBarWidth + Math.max(0, maxGroupCount - 1) * innerGap;
  const localCount = Math.max(1, groupCount);
  const localWidth = localCount * uniformBarWidth + Math.max(0, localCount - 1) * innerGap;
  const groupStart = layout.getBarPosition(xIndex, 0).start;
  const groupOffset = Math.floor((maxGroupWidth - localWidth) / 2);
  const localIndex = Math.max(0, Math.min(dodgeIndex, localCount - 1));
  const barStart = groupStart + groupOffset + localIndex * (uniformBarWidth + innerGap);
  const barEnd = barStart + uniformBarWidth - 1;
  const center = Math.round((barStart + barEnd) / 2);
  return { start: barStart, end: barEnd, center };
}
