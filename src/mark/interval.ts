/**
 * Interval Mark - Bar chart.
 */

import { CanvasRenderer } from '../canvas';
import { IntervalMark, Transform, getEncodeField } from '../spec';
import { MarkBaseOptions, MarkLabelItem, RenderMarkBaseOptions } from '../types/mark';
import { createBandValueLabelPositions, filterOverlappingLabels } from '../runtime/labels';

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
  _dodgePadding?: number;
};

export type IntervalMarkOptions = MarkBaseOptions<IntervalMarkData>;

export type RenderIntervalMarkOptions = RenderMarkBaseOptions;

/**
 * Render Interval Mark.
 */
function renderNormalized(canvas: CanvasRenderer, options: IntervalMarkOptions): void {
  const { data, xScale, yScale, colorScale, coordinate, plotX, plotY, plotWidth, plotHeight, leadingGap, isTransposed = false } = options;

  // Check if Band scale.
  const isBandScale = xScale.getBandWidth !== undefined;
  const barThickness = isTransposed ? 1 : 3;

  if (!isBandScale) {
    // Simple handling for non-Band scale.
    data.forEach((d) => {
      const xValue = d.x;
      const y0Value = d.y0 ?? 0;
      const y1Value = d.y1 ?? d.y;

      const normalizedX = xScale.map(xValue);

      const ny0 = yScale.map(y0Value);
      const ny1 = yScale.map(y1Value);
      const p0 = coordinate.map([0, ny0]);
      const p1 = coordinate.map([0, ny1]);

      if (!isTransposed) {
        // Vertical bar chart.
        const px = Math.round(plotX + normalizedX * plotWidth);
        let py0 = Math.round(plotY + plotHeight - p0[1]);
        let py1 = Math.round(plotY + plotHeight - p1[1]);

        py0 = Math.max(plotY, Math.min(plotY + plotHeight, py0));
        py1 = Math.max(plotY, Math.min(plotY + plotHeight, py1));

        const rectX = px - Math.floor(barThickness / 2);
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
        // Horizontal bar chart.
        const py = Math.round(plotY + normalizedX * plotHeight);
        const px0 = Math.round(plotX + coordinate.map([ny0, 0])[0]);
        const px1 = Math.round(plotX + coordinate.map([ny1, 0])[0]);

        const clampedPx0 = Math.max(plotX, Math.min(plotX + plotWidth, px0));
        const clampedPx1 = Math.max(plotX, Math.min(plotX + plotWidth, px1));

        const rectX = Math.min(clampedPx0, clampedPx1);
        const rectY = py - Math.floor(barThickness / 2);
        const rectWidth = Math.abs(clampedPx1 - clampedPx0);
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

  // Band scale: unified layout ensuring consistent bar widths and gaps.
  const domain = xScale.getOptions().domain || [];
  let dodgeCount = 1;
  for (const d of data) {
    const c = d._dodgeCount ?? 1;
    if (c > dodgeCount) dodgeCount = c;
  }
  const hasDodge = dodgeCount > 1;
  
  // Gap settings: inner gap 1 char, outer gap 2 chars.
  const innerGap = 1; // Inner/bar gap.
  const outerGap = hasDodge ? 2 : 1; // Outer gap (2 with grouping, 1 otherwise).
  
  const uniformBarWidth = barThickness;
  const maxGroupWidth = hasDodge
    ? dodgeCount * uniformBarWidth + (dodgeCount - 1) * innerGap
    : uniformBarWidth;

  // Render each data point.
  data.forEach((d) => {
    const xValue = d.x;
    const y0Value = d.y0 ?? 0;
    const y1Value = d.y1 ?? d.y;

    // Find x index in domain.
    const xIndex = domain.indexOf(xValue);
    if (xIndex === -1) return;
    
    const groupCount = hasDodge ? (d._dodgeGroupCount ?? 1) : 1;
    const localGroupWidth = hasDodge
      ? groupCount * uniformBarWidth + Math.max(0, groupCount - 1) * innerGap
      : uniformBarWidth;
    const groupOffset = hasDodge ? Math.floor((maxGroupWidth - localGroupWidth) / 2) : 0;
    const dodgeIndex = Math.max(0, Math.min((d._dodgeIndex ?? 0), Math.max(0, groupCount - 1)));
    
    // Calculate bar start position (pixel coordinates).
    let barStart: number;
    if (hasDodge) {
      // With dodge: distinguish inner and outer gaps.
      const base = isTransposed ? plotY + leadingGap : plotX + leadingGap;
      const groupStart = base + xIndex * (maxGroupWidth + outerGap);
      barStart = groupStart + groupOffset + dodgeIndex * (uniformBarWidth + innerGap);
    } else {
      // No dodge: simple linear layout.
      const offset = isTransposed ? plotY + leadingGap : plotX + leadingGap;
      barStart = offset + xIndex * (uniformBarWidth + innerGap);
    }
    
    const barEnd = barStart + uniformBarWidth - 1;
    const barCenterPixel = Math.round((barStart + barEnd) / 2);

    // Map y values to coordinates.
    const ny0 = yScale.map(y0Value);
    const ny1 = yScale.map(y1Value);

    if (!isTransposed) {
      // Vertical bar chart: use pixel coordinates directly.
      const px = barCenterPixel;
      
      const p0 = coordinate.map([0, ny0]);
      const p1 = coordinate.map([0, ny1]);
      
      let py0 = Math.round(plotY + plotHeight - p0[1]);
      let py1 = Math.round(plotY + plotHeight - p1[1]);
      
      py0 = Math.max(plotY, Math.min(plotY + plotHeight, py0));
      py1 = Math.max(plotY, Math.min(plotY + plotHeight, py1));
      
      const halfWidth = Math.floor(uniformBarWidth / 2);
      const rectX = px - halfWidth;
      const rectWidth = uniformBarWidth;
      const rectY = Math.min(py0, py1);
      const rectHeight = Math.abs(py1 - py0);
      
      if (rectHeight <= 0) return;
      
      const colorInfo = colorScale(d.color);
      canvas.drawRect(
        { x: rectX, y: rectY, width: rectWidth, height: rectHeight },
        colorInfo.symbol,
        colorInfo.style
      );
    } else {
      // Horizontal bar chart: use pixel coordinates to calculate bar position.
      const py = barCenterPixel;
      
      const px0 = Math.round(plotX + coordinate.map([ny0, 0])[0]);
      const px1 = Math.round(plotX + coordinate.map([ny1, 0])[0]);
      
      const clampedPx0 = Math.max(plotX, Math.min(plotX + plotWidth, px0));
      const clampedPx1 = Math.max(plotX, Math.min(plotX + plotWidth, px1));
      
      const halfHeight = Math.floor(uniformBarWidth / 2);
      const rectY = py - halfHeight;
      const rectHeight = uniformBarWidth;
      const rectX = Math.min(clampedPx0, clampedPx1);
      const rectWidth = Math.abs(clampedPx1 - clampedPx0);
      
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
    _dodgePadding: d._dodgePadding,
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
  const visibleLabels = filterOverlappingLabels(labels);
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
