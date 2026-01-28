import { ChartSpec } from '../spec';
import { createFormatter } from '../utils/format';
import { createBandLayout } from '../scale';

export type LabelPosition = { x: number; y: number; text: string };
export type RenderableLabel = { x: number; y: number; text: string; position: 'top' | 'bottom' };
export type PointPosition = { x: number; y: number };
export type SeriesPoint = { xValue: any; yValue: number; x: number; y: number; text: string };
export type BandLayoutInfo = { bandDomain: any[]; bandLayout: ReturnType<typeof createBandLayout> | null };
export type NormalizedPoint = { nx: number; ny: number };

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

  const base = isTransposed ? plotY : plotX;
  const length = isTransposed ? plotHeight : plotWidth;
  const createLayout = (count: number) => createBandLayout(xDomain, base, length, leadingGap, bandGap, count, true);

  const buildLabel = (xIndex: number, yValue: number, center: number) => {
    if (!isTransposed) {
      const ny = yScale.map(yValue);
      const coord = coordinate.map([0, ny]);
      const py = Math.round(plotY + plotHeight - coord[1]);
      return { x: center, y: py, text: formatDataLabel(yValue) };
    }
    const nx = yScale.map(yValue);
    const coord = coordinate.map([nx, 0]);
    const px = Math.round(plotX + coord[0]);
    return { x: px, y: Math.round(center), text: formatDataLabel(yValue) };
  };

  const labels: LabelPosition[] = [];
  if (isStacked) {
    const xMaxY = getMaxStackedValueByX(data, xField, yField);
    const layout = createLayout(1);
    Object.values(xMaxY).forEach(({ value, x }) => {
      const xIndex = xDomain.indexOf(x);
      if (xIndex === -1) return;
      const center = layout.getBarPosition(xIndex, 0).center;
      labels.push(buildLabel(xIndex, value, center));
    });
    return labels;
  }

  const maxGroupCount = hasDodge ? dodgeCount : 1;
  const layout = createLayout(maxGroupCount);
  const innerGap = bandGap;
  const maxGroupWidth = maxGroupCount * layout.uniformBarWidth + Math.max(0, maxGroupCount - 1) * innerGap;
  const getCenteredBarCenter = (xIndex: number, dodgeIndex: number, groupCount: number) => {
    if (maxGroupCount <= 1) return layout.getBarPosition(xIndex, 0).center;
    const groupStart = layout.getBarPosition(xIndex, 0).start;
    const localCount = Math.max(1, groupCount);
    const localWidth = localCount * layout.uniformBarWidth + Math.max(0, localCount - 1) * innerGap;
    const groupOffset = Math.floor((maxGroupWidth - localWidth) / 2);
    const localIndex = Math.max(0, Math.min(dodgeIndex, localCount - 1));
    const barStart = groupStart + groupOffset + localIndex * (layout.uniformBarWidth + innerGap);
    const barEnd = barStart + layout.uniformBarWidth - 1;
    return Math.round((barStart + barEnd) / 2);
  };
  data.forEach((d) => {
    const xValue = d[xField];
    const yValue = d[yField];
    const xIndex = xDomain.indexOf(xValue);
    if (xIndex === -1) return;
    if (!hasDodge) {
      labels.push(buildLabel(xIndex, yValue, layout.getBarPosition(xIndex, 0).center));
      return;
    }
    const dodgeIndex = (d as any)._dodgeIndex ?? 0;
    const groupCount = (d as any)._dodgeGroupCount ?? 1;
    labels.push(buildLabel(xIndex, yValue, getCenteredBarCenter(xIndex, dodgeIndex, groupCount)));
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
  return { bandDomain, bandLayout };
}

// Used to convert datum values into normalized coordinates before pixel mapping.
export function mapDatumToNormalizedPoint(options: {
  xValue: any;
  yValue: number;
  xScale: any;
  yScale: any;
  bandDomain: any[];
  bandLayout: ReturnType<typeof createBandLayout> | null;
  plotWidth: number;
  plotHeight: number;
  isTransposed: boolean;
}): NormalizedPoint | null {
  const { xValue, yValue, xScale, yScale, bandDomain, bandLayout, plotWidth, plotHeight, isTransposed } = options;
  let nx: number;
  let ny: number;
  if (!isTransposed) {
    if (bandLayout) {
      const xIndex = bandDomain.indexOf(xValue);
      if (xIndex === -1) return null;
      const center = bandLayout.getGroupCenter(xIndex);
      nx = center / plotWidth;
    } else {
      nx = xScale.map(xValue);
    }
    ny = yScale.map(yValue);
  } else {
    if (bandLayout) {
      const xIndex = bandDomain.indexOf(xValue);
      if (xIndex === -1) return null;
      const center = bandLayout.getGroupCenter(xIndex);
      ny = center / plotHeight;
    } else {
      ny = xScale.map(xValue);
    }
    nx = yScale.map(yValue);
  }
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
  isTransposed: boolean;
}): PointPosition {
  const { nx, ny, coordinate, plotX, plotY, plotWidth, plotHeight, isTransposed } = options;
  const coord = coordinate.map([nx, ny]);
  const x = Math.round(plotX + coord[0]);
  const y = isTransposed ? Math.round(plotY + coord[1]) : Math.round(plotY + plotHeight - coord[1]);
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
      isTransposed,
    });
    seriesPoints.push({ xValue, yValue, x: point.x, y: point.y, text: formatDataLabel(yValue) });
  });
  return seriesPoints;
}

// Used when labels must be hidden to avoid overlap with other labels or points.
export function filterOverlappingLabels(labels: LabelPosition[], points: PointPosition[] = []): LabelPosition[] {
  const visible: LabelPosition[] = [];

  labels.forEach((label) => {
    const textLen = String(label.text).length;
    const labelLeft = label.x - Math.floor((textLen - 1) / 2);
    const labelRight = labelLeft + textLen - 1;
    const labelTop = label.y - 1;
    const labelBottom = label.y - 1;

    const overlapsPoint = points.some((point) => {
      const pointRow = point.y;
      if (pointRow !== labelTop) return false;
      return point.x >= labelLeft - 1 && point.x <= labelRight + 1;
    });

    const overlapsLabel = visible.some((existing) => {
      const existingTextLen = String(existing.text).length;
      const existingLeft = existing.x - Math.floor((existingTextLen - 1) / 2);
      const existingRight = existingLeft + existingTextLen - 1;
      const existingTop = existing.y - 1;
      const existingBottom = existing.y - 1;

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
export function placeLabelsWithFallback(labels: LabelPosition[], points: PointPosition[] = []): RenderableLabel[] {
  const placed: RenderableLabel[] = [];

  labels.forEach((label) => {
    const textLen = String(label.text).length;
    const labelLeft = label.x - Math.floor((textLen - 1) / 2);
    const labelRight = labelLeft + textLen - 1;
    const positions: Array<'top' | 'bottom'> = ['top', 'bottom'];

    for (const position of positions) {
      const labelRow = position === 'top' ? label.y - 1 : label.y + 1;
      const overlapsPoint = points.some((point) => {
        if (point.y !== labelRow) return false;
        return point.x >= labelLeft - 1 && point.x <= labelRight + 1;
      });

      const overlapsLabel = placed.some((existing) => {
        const existingTextLen = String(existing.text).length;
        const existingLeft = existing.x - Math.floor((existingTextLen - 1) / 2);
        const existingRight = existingLeft + existingTextLen - 1;
        const existingRow = existing.position === 'top' ? existing.y - 1 : existing.y + 1;
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
