import { ChartSpec } from '../spec';
import { createFormatter } from '../utils/format';
import { createBandLayout, getCenteredBarPosition } from '../scale';
import { textWidth } from '../canvas';

export type LabelPosition = { x: number; y: number; text: string };
export type RenderableLabel = { x: number; y: number; text: string; position: 'top' | 'bottom' };
export type PointPosition = { x: number; y: number };
export type SeriesPoint = { xValue: any; yValue: number; x: number; y: number; text: string };
export type BandLayoutInfo = { bandDomain: any[]; bandLayout: ReturnType<typeof createBandLayout> | null; bandIndexMap: Map<any, number> };
export type NormalizedPoint = { nx: number; ny: number };
export type LabelBounds = { minX?: number; maxX?: number; minY?: number; maxY?: number };

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function getClampedLabelSpan(label: LabelPosition, bounds?: LabelBounds): { left: number; right: number; width: number } {
  const width = textWidth(String(label.text));
  const unclampedLeft = label.x - Math.floor((width - 1) / 2);

  if (!bounds) {
    return { left: unclampedLeft, right: unclampedLeft + width - 1, width };
  }

  const minX = bounds.minX ?? -Infinity;
  const maxX = bounds.maxX ?? Infinity;
  const maxStartX = Math.max(minX, maxX - width + 1);
  const left = clamp(unclampedLeft, minX, maxStartX);
  return { left, right: left + width - 1, width };
}

export function createValueFormatter(labelEnabled: ChartSpec['label']): (val: any) => string {
  let dataLabelFormatter: ((v: any) => string) | undefined;
  if (typeof labelEnabled === 'object' && labelEnabled && labelEnabled.formatter) {
    dataLabelFormatter = createFormatter(labelEnabled.formatter);
  }
  return (val: any) => (dataLabelFormatter ? dataLabelFormatter(val) : String(val));
}

function getMaxStackedValueByX(data: any[], xField: string, yField: string): Record<string, { value: number; x: any }> {
  const xMaxY: Record<string, { value: number; x: any }> = {};
  data.forEach((d) => {
    const xVal = String(d[xField]);
    const y1 = (d as any)._y1 || d[yField] || 0;
    if (!xMaxY[xVal] || y1 > xMaxY[xVal].value) {
      xMaxY[xVal] = { value: y1, x: d[xField] };
    }
  });
  return xMaxY;
}

// Used when rendering value labels aligned to band categories like bars or grouped bars.
export function createBandValueLabelPositions(options: {
  data: any[];
  xField: string;
  yField: string;
  xDomain: any[];
  isTransposed: boolean;
  isStacked: boolean;
  hasDodge: boolean;
  dodgeCount: number;
  yScale: any;
  coordinate: any;
  plotX: number;
  plotY: number;
  plotWidth: number;
  plotHeight: number;
  leadingGap: number;
  bandGap: number;
  formatDataLabel: (val: any) => string;
}): LabelPosition[] {
  const {
    data,
    xField,
    yField,
    xDomain,
    isTransposed,
    isStacked,
    hasDodge,
    dodgeCount,
    yScale,
    coordinate,
    plotX,
    plotY,
    plotWidth,
    plotHeight,
    leadingGap,
    bandGap,
    formatDataLabel,
  } = options;

  const axisLength = isTransposed ? plotHeight : plotWidth;
  const createLayout = (count: number) => createBandLayout(xDomain, 0, axisLength, leadingGap, bandGap, count, true);
  const bandIndexMap = new Map<any, number>();
  xDomain.forEach((value, index) => bandIndexMap.set(value, index));

  const buildLabel = (center: number, yValue: number) => {
    const point = mapNormalizedToPixel({
      nx: center / axisLength,
      ny: yScale.map(yValue),
      coordinate,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
    });
    return { x: point.x, y: point.y, text: formatDataLabel(yValue) };
  };

  const labels: LabelPosition[] = [];
  if (isStacked) {
    const xMaxY = getMaxStackedValueByX(data, xField, yField);
    const layout = createLayout(1);
    Object.values(xMaxY).forEach(({ value, x }) => {
      const xIndex = bandIndexMap.get(x);
      if (xIndex === undefined) return;
      const center = layout.getBarPosition(xIndex, 0).center;
      labels.push(buildLabel(center, value));
    });
    return labels;
  }

  const maxGroupCount = hasDodge ? dodgeCount : 1;
  const layout = createLayout(maxGroupCount);
  data.forEach((d) => {
    const xValue = d[xField];
    const yValue = d[yField];
    const xIndex = bandIndexMap.get(xValue);
    if (xIndex === undefined) return;
    if (!hasDodge) {
      labels.push(buildLabel(layout.getBarPosition(xIndex, 0).center, yValue));
      return;
    }
    const dodgeIndex = (d as any)._dodgeIndex ?? 0;
    const groupCount = (d as any)._dodgeGroupCount ?? 1;
    const barPosition = getCenteredBarPosition({
      layout,
      xIndex,
      dodgeIndex,
      groupCount,
      maxGroupCount,
      bandGap,
    });
    labels.push(buildLabel(barPosition.center, yValue));
  });
  return labels;
}

// Used when a point needs to align with a band category center on the x axis.
export function getBandLayoutForPoints(options: {
  xScale: any;
  plotWidth: number;
  plotHeight: number;
  isTransposed: boolean;
  leadingGap: number;
  bandGap: number;
}): BandLayoutInfo {
  const { xScale, plotWidth, plotHeight, isTransposed, leadingGap, bandGap } = options;
  const hasBand = xScale.getBandWidth !== undefined;
  const bandDomain = hasBand ? xScale.getOptions().domain || [] : [];
  const bandLayout = hasBand
    ? createBandLayout(bandDomain, 0, isTransposed ? plotHeight : plotWidth, leadingGap, bandGap, 1, false)
    : null;
  const bandIndexMap = new Map<any, number>();
  bandDomain.forEach((value: any, index: number) => bandIndexMap.set(value, index));
  return { bandDomain, bandLayout, bandIndexMap };
}

// Used to convert datum values into normalized coordinates before pixel mapping.
export function mapDatumToNormalizedPoint(options: {
  xValue: any;
  yValue: number;
  xScale: any;
  yScale: any;
  bandDomain: any[];
  bandLayout: ReturnType<typeof createBandLayout> | null;
  bandIndexMap?: Map<any, number>;
  plotWidth: number;
  plotHeight: number;
  isTransposed: boolean;
}): NormalizedPoint | null {
  const { xValue, yValue, xScale, yScale, bandDomain, bandLayout, bandIndexMap, plotWidth, plotHeight, isTransposed } = options;
  const axisLength = isTransposed ? plotHeight : plotWidth;
  let nx: number;
  let ny: number;
  if (bandLayout) {
    const xIndex = bandIndexMap?.get(xValue) ?? bandDomain.indexOf(xValue);
    if (xIndex === undefined || xIndex === -1) return null;
    const center = bandLayout.getGroupCenter(xIndex);
    nx = center / axisLength;
  } else {
    nx = xScale.map(xValue);
  }
  ny = yScale.map(yValue);
  return { nx, ny };
}

// Used to convert normalized coordinates into pixel positions in the plot.
export function mapNormalizedToPixel(options: {
  nx: number;
  ny: number;
  coordinate: any;
  plotX: number;
  plotY: number;
  plotWidth: number;
  plotHeight: number;
}): PointPosition {
  const { nx, ny, coordinate, plotX, plotY, plotWidth, plotHeight } = options;
  const coord = coordinate.map([nx, ny]);
  const x = Math.round(plotX + coord[0]);
  const y = Math.round(plotY + plotHeight - coord[1]);
  return { x, y };
}

// Used to build pixel points and label texts for a series or a group.
export function createSeriesPoints(options: {
  items: any[];
  xField: string;
  yField: string;
  xScale: any;
  yScale: any;
  bandDomain: any[];
  bandLayout: ReturnType<typeof createBandLayout> | null;
  bandIndexMap?: Map<any, number>;
  plotWidth: number;
  plotHeight: number;
  coordinate: any;
  plotX: number;
  plotY: number;
  isTransposed: boolean;
  formatDataLabel: (val: any) => string;
}): SeriesPoint[] {
  const {
    items,
    xField,
    yField,
    xScale,
    yScale,
    bandDomain,
    bandLayout,
    bandIndexMap,
    plotWidth,
    plotHeight,
    coordinate,
    plotX,
    plotY,
    isTransposed,
    formatDataLabel,
  } = options;
  const seriesPoints: SeriesPoint[] = [];
  items.forEach((d) => {
    const xValue = d[xField];
    const yValue = d[yField];
    const normalized = mapDatumToNormalizedPoint({
      xValue,
      yValue,
      xScale,
      yScale,
      bandDomain,
      bandLayout,
      bandIndexMap,
      plotWidth,
      plotHeight,
      isTransposed,
    });
    if (!normalized) return;
    const point = mapNormalizedToPixel({
      nx: normalized.nx,
      ny: normalized.ny,
      coordinate,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
    });
    seriesPoints.push({ xValue, yValue, x: point.x, y: point.y, text: formatDataLabel(yValue) });
  });
  return seriesPoints;
}

// Used when labels must be hidden to avoid overlap with other labels or points.
export function filterOverlappingLabels(labels: LabelPosition[], points: PointPosition[] = [], bounds?: LabelBounds): LabelPosition[] {
  const visible: LabelPosition[] = [];

  labels.forEach((label) => {
    const { left: labelLeft, right: labelRight } = getClampedLabelSpan(label, bounds);
    const minY = bounds?.minY ?? -Infinity;
    const maxY = bounds?.maxY ?? Infinity;
    const labelTop = clamp(label.y - 1, minY, maxY);
    const labelBottom = labelTop;

    const overlapsPoint = points.some((point) => {
      const pointRow = point.y;
      if (pointRow !== labelTop) return false;
      return point.x >= labelLeft - 1 && point.x <= labelRight + 1;
    });

    const overlapsLabel = visible.some((existing) => {
      const { left: existingLeft, right: existingRight } = getClampedLabelSpan(existing, bounds);
      const existingTop = clamp(existing.y - 1, minY, maxY);
      const existingBottom = existingTop;

      const xOverlap = labelLeft <= existingRight + 1 && labelRight >= existingLeft - 1;
      const yOverlap = labelTop <= existingBottom && labelBottom >= existingTop;

      return xOverlap && yOverlap;
    });

    if (!overlapsPoint && !overlapsLabel) {
      visible.push(label);
    }
  });

  return visible;
}

// Used when labels can try top then fallback to bottom to avoid overlaps.
export function placeLabelsWithFallback(labels: LabelPosition[], points: PointPosition[] = [], bounds?: LabelBounds): RenderableLabel[] {
  const placed: RenderableLabel[] = [];

  labels.forEach((label) => {
    const { left: labelLeft, right: labelRight } = getClampedLabelSpan(label, bounds);
    const positions: Array<'top' | 'bottom'> = ['top', 'bottom'];
    const minY = bounds?.minY ?? -Infinity;
    const maxY = bounds?.maxY ?? Infinity;

    for (const position of positions) {
      const labelRow = clamp(position === 'top' ? label.y - 1 : label.y + 1, minY, maxY);
      const overlapsPoint = points.some((point) => {
        if (point.y !== labelRow) return false;
        return point.x >= labelLeft - 1 && point.x <= labelRight + 1;
      });

      const overlapsLabel = placed.some((existing) => {
        const { left: existingLeft, right: existingRight } = getClampedLabelSpan(existing, bounds);
        const existingRow = clamp(existing.position === 'top' ? existing.y - 1 : existing.y + 1, minY, maxY);
        const xOverlap = labelLeft <= existingRight + 1 && labelRight >= existingLeft - 1;
        const yOverlap = labelRow === existingRow;
        return xOverlap && yOverlap;
      });

      if (!overlapsPoint && !overlapsLabel) {
        placed.push({ ...label, position });
        break;
      }
    }
  });

  return placed;
}

// Used when picking representative feature points for sparse labeling.
export function getFeaturePointIndices(values: number[]): number[] {
  const count = values.length;
  if (count === 0) return [];

  const indexSet = new Set<number>();
  indexSet.add(0);
  indexSet.add(count - 1);

  let maxValue = -Infinity;
  let minValue = Infinity;
  let maxIndex = 0;
  let minIndex = 0;

  values.forEach((value, index) => {
    if (value > maxValue) {
      maxValue = value;
      maxIndex = index;
    }
    if (value < minValue) {
      minValue = value;
      minIndex = index;
    }
  });

  indexSet.add(maxIndex);
  indexSet.add(minIndex);

  for (let i = 1; i < count - 1; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    const next = values[i + 1];
    const prevDiff = curr - prev;
    const nextDiff = next - curr;
    if (prevDiff === 0 || nextDiff === 0) continue;
    if (prevDiff > 0 && nextDiff < 0) indexSet.add(i);
    if (prevDiff < 0 && nextDiff > 0) indexSet.add(i);
  }

  return Array.from(indexSet).sort((a, b) => a - b);
}
