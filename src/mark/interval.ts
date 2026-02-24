/**
 * Interval Mark - Bar chart.
 */

import { CanvasRenderer } from '../canvas';
import { createBandLayout, getCenteredBarPosition } from '../scale';
import { IntervalMark, Transform, getEncodeField } from '../spec';
import { MarkBandOptions, MarkLabelItem, RenderMarkBaseOptions } from '../types/mark';
import { createBandValueLabelPositions, filterOverlappingLabels, mapNormalizedToPixel } from '../runtime/labels';

export function adaptIntervalSpec(spec: IntervalMark): IntervalMark {
  const encode = spec.encode ?? {};
  const transform = spec.transform ?? [];
  const data = spec.data ?? [];
  const xField = getEncodeField(encode.x);
  const yField = getEncodeField(encode.y);
  const colorField = getEncodeField(encode.color);
  const shouldAutoDodge = xField !== undefined
    && !transform.some((t) => t.type === 'dodgeX' || t.type === 'stackY');
  
  if (shouldAutoDodge && xField) {
    const groupBy = inferDodgeGroupBy(data, xField, yField, colorField);
    if (groupBy) {
      const autoDodgeTransform: Transform = groupBy === colorField ? { type: 'dodgeX' } : { type: 'dodgeX', groupBy };
      return { ...spec, transform: [...transform, autoDodgeTransform] };
    }
  }
  return spec;
}

function hasMultiSeriesByX(data: any[], xField: string, colorField: string): boolean {
  const colorsByX = new Map<string, Set<any>>();
  for (const d of data) {
    const xValue = d?.[xField];
    const colorValue = d?.[colorField];
    if (xValue === undefined || colorValue === undefined) continue;
    const key = String(xValue);
    let colorSet = colorsByX.get(key);
    if (!colorSet) {
      colorSet = new Set<any>();
      colorsByX.set(key, colorSet);
    }
    colorSet.add(colorValue);
    if (colorSet.size > 1) return true;
  }
  return false;
}

function inferDodgeGroupBy(data: any[], xField: string, yField?: string, colorField?: string): string | undefined {
  if (data.length === 0) return undefined;

  const countsByX = new Map<any, number>();
  for (const d of data) {
    const xValue = d?.[xField];
    countsByX.set(xValue, (countsByX.get(xValue) ?? 0) + 1);
  }
  const hasDuplicatedX = Array.from(countsByX.values()).some((c) => c > 1);
  if (!hasDuplicatedX) return undefined;

  if (colorField && colorField !== xField && hasMultiSeriesByX(data, xField, colorField)) {
    return colorField;
  }

  const sample = data.find((d) => d && typeof d === 'object');
  if (!sample) return undefined;

  const excluded = new Set<string>([xField]);
  if (yField) excluded.add(yField);
  if (colorField) excluded.add(colorField);

  const candidateKeys = Object.keys(sample).filter((k) => !excluded.has(k));
  if (candidateKeys.length === 0) return undefined;

  type Score = { key: string; maxDistinctPerX: number; nonNumericCount: number; presentCount: number };
  const scored: Score[] = [];

  for (const key of candidateKeys) {
    const distinctByX = new Map<any, Set<any>>();
    let nonNumericCount = 0;
    let presentCount = 0;

    for (const d of data) {
      if (!d || typeof d !== 'object') continue;
      const xValue = d?.[xField];
      const v = d?.[key];
      if (v === undefined) continue;
      presentCount += 1;
      if (typeof v !== 'number') nonNumericCount += 1;

      let set = distinctByX.get(xValue);
      if (!set) {
        set = new Set<any>();
        distinctByX.set(xValue, set);
      }
      set.add(v);
    }

    const maxDistinctPerX = Array.from(distinctByX.values()).reduce((m, s) => Math.max(m, s.size), 0);
    if (maxDistinctPerX > 1 && presentCount > 0) {
      scored.push({ key, maxDistinctPerX, nonNumericCount, presentCount });
    }
  }

  scored.sort((a, b) => {
    if (b.maxDistinctPerX !== a.maxDistinctPerX) return b.maxDistinctPerX - a.maxDistinctPerX;
    if (b.nonNumericCount !== a.nonNumericCount) return b.nonNumericCount - a.nonNumericCount;
    return b.presentCount - a.presentCount;
  });

  return scored[0]?.key;
}

export type IntervalMarkData = {
  x: any;
  y: number;
  y0?: number;
  y1?: number;
  color?: any;
  _dodgeIndex?: number;
  _dodgeGroupCount?: number;
  _dodgeCount?: number;
};

export type IntervalMarkOptions = MarkBandOptions<IntervalMarkData>;

export type RenderIntervalMarkOptions = RenderMarkBaseOptions;

/**
 * Render Interval Mark.
 */
function renderNormalized(canvas: CanvasRenderer, options: IntervalMarkOptions): void {
  const { data, xScale, yScale, colorScale, coordinate, plotX, plotY, plotWidth, plotHeight, leadingGap, bandGap, isTransposed = false } = options;

  // Check if Band scale.
  const isBandScale = xScale.getBandWidth !== undefined;
  const barThickness = isTransposed ? 1 : 3;

  if (!isBandScale) {
    data.forEach((d) => {
      const xValue = d.x;
      const y0Value = d.y0 ?? 0;
      const y1Value = d.y1 ?? d.y;

      const normalizedX = xScale.map(xValue);

      const ny0 = yScale.map(y0Value);
      const ny1 = yScale.map(y1Value);
      const p0 = mapNormalizedToPixel({
        nx: normalizedX,
        ny: ny0,
        coordinate,
        plotX,
        plotY,
        plotWidth,
        plotHeight,
      });
      const p1 = mapNormalizedToPixel({
        nx: normalizedX,
        ny: ny1,
        coordinate,
        plotX,
        plotY,
        plotWidth,
        plotHeight,
      });

      const isHorizontal = Math.abs(p0.x - p1.x) >= Math.abs(p0.y - p1.y);
      const half = Math.floor(barThickness / 2);

      if (!isHorizontal) {
        let py0 = Math.max(plotY, Math.min(plotY + plotHeight, p0.y));
        let py1 = Math.max(plotY, Math.min(plotY + plotHeight, p1.y));
        const rectX = Math.round(p0.x - half);
        const rectY = Math.min(py0, py1);
        const rectWidth = barThickness;
        const rectHeight = Math.abs(py1 - py0);
        if (rectHeight <= 0) return;
        const colorInfo = colorScale(d.color);
        canvas.drawRect(
          { x: rectX, y: rectY, width: rectWidth, height: rectHeight },
          colorInfo.symbol,
          colorInfo.style
        );
      } else {
        let px0 = Math.max(plotX, Math.min(plotX + plotWidth, p0.x));
        let px1 = Math.max(plotX, Math.min(plotX + plotWidth, p1.x));
        const rectX = Math.min(px0, px1);
        const rectY = Math.round(p0.y - half);
        const rectWidth = Math.abs(px1 - px0);
        const rectHeight = barThickness;
        if (rectWidth <= 0) return;
        const colorInfo = colorScale(d.color);
        canvas.drawRect(
          { x: rectX, y: rectY, width: rectWidth, height: rectHeight },
          colorInfo.symbol,
          colorInfo.style
        );
      }
    });
    return;
  }

  const domain = xScale.getOptions().domain || [];
  const axisLength = isTransposed ? plotHeight : plotWidth;
  const bandIndexMap = new Map<any, number>();
  domain.forEach((value: any, index: number) => bandIndexMap.set(value, index));
  let dodgeCount = 1;
  for (const d of data) {
    const c = d._dodgeCount ?? 1;
    if (c > dodgeCount) dodgeCount = c;
  }
  const hasDodge = dodgeCount > 1;
  const layout = createBandLayout(domain, 0, axisLength, leadingGap, bandGap, dodgeCount, true);
  const barSize = layout.uniformBarWidth;
  const maxGroupCount = hasDodge ? dodgeCount : 1;

  data.forEach((d) => {
    const xValue = d.x;
    const y0Value = d.y0 ?? 0;
    const y1Value = d.y1 ?? d.y;

    const xIndex = bandIndexMap.get(xValue);
    if (xIndex === undefined) return;

    const groupCount = hasDodge ? (d._dodgeGroupCount ?? 1) : 1;
    const dodgeIndex = Math.max(0, d._dodgeIndex ?? 0);
    const barPosition = hasDodge
      ? getCenteredBarPosition({
          layout,
          xIndex,
          dodgeIndex,
          groupCount,
          maxGroupCount,
          bandGap,
        })
      : layout.getBarPosition(xIndex, 0);
    const normalizedX = barPosition.center / axisLength;

    const p0 = mapNormalizedToPixel({
      nx: normalizedX,
      ny: yScale.map(y0Value),
      coordinate,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
    });
    const p1 = mapNormalizedToPixel({
      nx: normalizedX,
      ny: yScale.map(y1Value),
      coordinate,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
    });

    const isHorizontal = Math.abs(p0.x - p1.x) >= Math.abs(p0.y - p1.y);
    const half = Math.floor(barSize / 2);

    if (!isHorizontal) {
      let py0 = Math.max(plotY, Math.min(plotY + plotHeight, p0.y));
      let py1 = Math.max(plotY, Math.min(plotY + plotHeight, p1.y));
      const rectX = Math.round(p0.x - half);
      const rectY = Math.min(py0, py1);
      const rectWidth = barSize;
      const rectHeight = Math.abs(py1 - py0);
      if (rectHeight <= 0) return;
      const colorInfo = colorScale(d.color);
      canvas.drawRect(
        { x: rectX, y: rectY, width: rectWidth, height: rectHeight },
        colorInfo.symbol,
        colorInfo.style
      );
    } else {
      let px0 = Math.max(plotX, Math.min(plotX + plotWidth, p0.x));
      let px1 = Math.max(plotX, Math.min(plotX + plotWidth, p1.x));
      const rectX = Math.min(px0, px1);
      const rectY = Math.round(p0.y - half);
      const rectWidth = Math.abs(px1 - px0);
      const rectHeight = barSize;
      if (rectWidth <= 0) return;
      const colorInfo = colorScale(d.color);
      canvas.drawRect(
        { x: rectX, y: rectY, width: rectWidth, height: rectHeight },
        colorInfo.symbol,
        colorInfo.style
      );
    }
  });
}

function normalizeData(options: RenderIntervalMarkOptions): IntervalMarkOptions {
  const {
    data,
    xField,
    yField,
    colorField,
    colorScale,
    xScale,
    yScale,
    coordinate,
    plotX,
    plotY,
    plotWidth,
    plotHeight,
    leadingGap,
    bandGap,
    isTransposed,
  } = options;

  const markData: IntervalMarkData[] = data.map((d) => ({
    x: d[xField],
    y: d[yField],
    y0: d._y0,
    y1: d._y1,
    color: colorField ? d[colorField] : undefined,
    _dodgeIndex: d._dodgeIndex,
    _dodgeGroupCount: d._dodgeGroupCount,
    _dodgeCount: d._dodgeCount,
  }));

  return {
    data: markData,
    xScale,
    yScale,
    colorScale,
    coordinate,
    plotX,
    plotY,
    plotWidth,
    plotHeight,
    leadingGap,
    bandGap,
    isTransposed,
  };
}

export function createIntervalLabelItems(options: RenderIntervalMarkOptions & {
  formatDataLabel: (val: any) => string;
  isStacked?: boolean;
  hasDodge?: boolean;
  dodgeCount?: number;
}): MarkLabelItem[] {
  const {
    data,
    xField,
    yField,
    xScale,
    yScale,
    coordinate,
    plotX,
    plotY,
    plotWidth,
    plotHeight,
    leadingGap,
    bandGap,
    isTransposed = false,
    formatDataLabel,
    isStacked = false,
    hasDodge = false,
    dodgeCount = 1,
  } = options;

  const xDomain = xScale.getOptions().domain || [];
  const labels = createBandValueLabelPositions({
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
  });

  labels.sort((a, b) => a.y - b.y);
  const visibleLabels = filterOverlappingLabels(
    labels,
    [],
    isTransposed
      ? undefined
      : {
          minX: plotX,
          maxX: plotX + plotWidth - 1,
          minY: 0,
          maxY: plotY + plotHeight - 1,
        },
  );
  return visibleLabels.map((label) => ({
    x: label.x,
    y: label.y,
    text: label.text,
    position: isTransposed ? 'right' : 'top',
  }));
}

export function render(canvas: CanvasRenderer, options: RenderIntervalMarkOptions): void {
  const normalized = normalizeData(options);
  renderNormalized(canvas, normalized);
}
