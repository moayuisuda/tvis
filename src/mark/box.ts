import { CanvasRenderer } from '../canvas';
import { createBandLayout, getCenteredBarPosition } from '../scale';
import { BoxMark } from '../spec';
import { MarkBandOptions, MarkLabelItem, RenderMarkBaseOptions } from '../types/mark';
import { mapNormalizedToPixel } from '../runtime/labels';

export function adaptBoxSpec(spec: BoxMark): BoxMark {
  return spec;
}

export type BoxMarkData = {
  x: any;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  color?: any;
  _raw?: any;
  _dodgeIndex?: number;
  _dodgeGroupCount?: number;
  _dodgeCount?: number;
};

export type BoxMarkOptions = MarkBandOptions<BoxMarkData>;

export type RenderBoxMarkOptions = RenderMarkBaseOptions;

function toFiniteNumber(value: any): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickNumber(d: any, keys: string[]): number | null {
  for (const k of keys) {
    if (k in d) {
      const v = toFiniteNumber(d[k]);
      if (v !== null) return v;
    }
  }
  return null;
}

function normalizeDatum(d: any, xField: string, yField: string, colorField?: string): BoxMarkData | null {
  const yBase = yField;
  const min = pickNumber(d, ['min', 'low', `${yBase}Min`, `${yBase}_min`, `${yBase}Low`, `${yBase}_low`]);
  const q1 = pickNumber(d, ['q1', 'p25', `${yBase}Q1`, `${yBase}_q1`, `${yBase}P25`, `${yBase}_p25`]);
  const median = pickNumber(d, ['median', 'p50', `${yBase}Median`, `${yBase}_median`, `${yBase}P50`, `${yBase}_p50`]);
  const q3 = pickNumber(d, ['q3', 'p75', `${yBase}Q3`, `${yBase}_q3`, `${yBase}P75`, `${yBase}_p75`]);
  const max = pickNumber(d, ['max', 'high', yBase, `${yBase}Max`, `${yBase}_max`, `${yBase}High`, `${yBase}_high`]);
  if (min === null || q1 === null || median === null || q3 === null || max === null) return null;

  return {
    x: d[xField],
    min,
    q1,
    median,
    q3,
    max,
    color: colorField ? d[colorField] : undefined,
    _raw: d,
    _dodgeIndex: d._dodgeIndex,
    _dodgeGroupCount: d._dodgeGroupCount,
    _dodgeCount: d._dodgeCount,
  };
}

function normalizeData(options: RenderBoxMarkOptions): BoxMarkOptions {
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

  const markData: BoxMarkData[] = [];
  for (const d of data) {
    const nd = normalizeDatum(d, xField, yField, colorField);
    if (nd) markData.push(nd);
  }

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

function renderNormalized(canvas: CanvasRenderer, options: BoxMarkOptions): void {
  const { data, xScale, yScale, colorScale, coordinate, plotX, plotY, plotWidth, plotHeight, leadingGap, bandGap, isTransposed = false } = options;

  if (data.length === 0) return;

  const isBandScale = xScale.getBandWidth !== undefined;
  const axisLength = isTransposed ? plotHeight : plotWidth;

  let bandIndexMap: Map<any, number> | null = null;
  let layout: ReturnType<typeof createBandLayout> | null = null;
  let boxThickness = isTransposed ? 1 : 5;
  let dodgeCount = 1;
  let maxGroupCount = 1;

  if (isBandScale) {
    const domain = xScale.getOptions().domain || [];
    bandIndexMap = new Map<any, number>();
    domain.forEach((value: any, index: number) => bandIndexMap!.set(value, index));
    for (const d of data) {
      const c = d._dodgeCount ?? 1;
      if (c > dodgeCount) dodgeCount = c;
    }
    const hasDodge = dodgeCount > 1;
    maxGroupCount = hasDodge ? dodgeCount : 1;
    layout = createBandLayout(domain, 0, axisLength, leadingGap, bandGap, dodgeCount, true);
    boxThickness = layout.uniformBarWidth;
  }

  const half = Math.floor(boxThickness / 2);
  const capHalf = Math.max(1, Math.floor((boxThickness - 1) / 2));

  const minX = plotX;
  const maxX = plotX + plotWidth - 1;
  const minY = plotY;
  const maxY = plotY + plotHeight - 1;
  const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)));

  const edgeH = '─';
  const edgeV = '│';
  const cornerTL = '┌';
  const cornerTR = '┐';
  const cornerBL = '└';
  const cornerBR = '┘';

  data.forEach((d) => {
    const xValue = d.x;

    let normalizedX: number;
    if (isBandScale && bandIndexMap && layout) {
      const xIndex = bandIndexMap.get(xValue);
      if (xIndex === undefined) return;
      const groupCount = dodgeCount > 1 ? (d._dodgeGroupCount ?? 1) : 1;
      const dodgeIndex = Math.max(0, d._dodgeIndex ?? 0);
      const pos = dodgeCount > 1
        ? getCenteredBarPosition({
            layout,
            xIndex,
            dodgeIndex,
            groupCount,
            maxGroupCount,
            bandGap,
          })
        : layout.getBarPosition(xIndex, 0);
      normalizedX = pos.center / axisLength;
    } else {
      normalizedX = xScale.map(xValue);
    }

    const pMin = mapNormalizedToPixel({
      nx: normalizedX,
      ny: yScale.map(d.min),
      coordinate,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
    });
    const pQ1 = mapNormalizedToPixel({
      nx: normalizedX,
      ny: yScale.map(d.q1),
      coordinate,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
    });
    const pMedian = mapNormalizedToPixel({
      nx: normalizedX,
      ny: yScale.map(d.median),
      coordinate,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
    });
    const pQ3 = mapNormalizedToPixel({
      nx: normalizedX,
      ny: yScale.map(d.q3),
      coordinate,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
    });
    const pMax = mapNormalizedToPixel({
      nx: normalizedX,
      ny: yScale.map(d.max),
      coordinate,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
    });

    const isHorizontal = Math.abs(pMin.x - pMax.x) >= Math.abs(pMin.y - pMax.y);
    const colorInfo = colorScale(d.color);
    const style = colorInfo.style;

    if (!isHorizontal) {
      const whiskerChar = '│';
      const capChar = '─';
      const medianChar = '─';
      const x = clampInt(pMedian.x, minX, maxX);
      const yMinClamped = clampInt(pMin.y, minY, maxY);
      const yMaxClamped = clampInt(pMax.y, minY, maxY);
      const yQ1Clamped = clampInt(pQ1.y, minY, maxY);
      const yQ3Clamped = clampInt(pQ3.y, minY, maxY);

      canvas.drawLine(x, yMinClamped, x, yQ1Clamped, whiskerChar, style);
      canvas.drawLine(x, yQ3Clamped, x, yMaxClamped, whiskerChar, style);
      canvas.drawLine(clampInt(x - capHalf, minX, maxX), yMinClamped, clampInt(x + capHalf, minX, maxX), yMinClamped, capChar, style);
      canvas.drawLine(clampInt(x - capHalf, minX, maxX), yMaxClamped, clampInt(x + capHalf, minX, maxX), yMaxClamped, capChar, style);

      const left = clampInt(x - half, minX, maxX);
      const right = clampInt(x + half, minX, maxX);
      const top = clampInt(Math.min(yQ1Clamped, yQ3Clamped), minY, maxY);
      const bottom = clampInt(Math.max(yQ1Clamped, yQ3Clamped), minY, maxY);

      canvas.drawLine(left, top, right, top, edgeH, style);
      canvas.drawLine(left, bottom, right, bottom, edgeH, style);
      canvas.drawLine(left, top, left, bottom, edgeV, style);
      canvas.drawLine(right, top, right, bottom, edgeV, style);
      canvas.drawPoint(left, top, cornerTL, style);
      canvas.drawPoint(right, top, cornerTR, style);
      canvas.drawPoint(left, bottom, cornerBL, style);
      canvas.drawPoint(right, bottom, cornerBR, style);

      const yMed = clampInt(pMedian.y, minY, maxY);
      canvas.drawLine(left, yMed, right, yMed, medianChar, style);
    } else {
      const whiskerChar = '─';
      const capChar = '│';
      const medianChar = '│';
      const y = clampInt(pMedian.y, minY, maxY);
      const xMinClamped = clampInt(pMin.x, minX, maxX);
      const xMaxClamped = clampInt(pMax.x, minX, maxX);
      const xQ1Clamped = clampInt(pQ1.x, minX, maxX);
      const xQ3Clamped = clampInt(pQ3.x, minX, maxX);

      canvas.drawLine(xMinClamped, y, xQ1Clamped, y, whiskerChar, style);
      canvas.drawLine(xQ3Clamped, y, xMaxClamped, y, whiskerChar, style);
      canvas.drawLine(xMinClamped, clampInt(y - capHalf, minY, maxY), xMinClamped, clampInt(y + capHalf, minY, maxY), capChar, style);
      canvas.drawLine(xMaxClamped, clampInt(y - capHalf, minY, maxY), xMaxClamped, clampInt(y + capHalf, minY, maxY), capChar, style);

      const top = clampInt(y - half, minY, maxY);
      const bottom = clampInt(y + half, minY, maxY);
      const left = clampInt(Math.min(xQ1Clamped, xQ3Clamped), minX, maxX);
      const right = clampInt(Math.max(xQ1Clamped, xQ3Clamped), minX, maxX);

      canvas.drawLine(left, top, right, top, edgeH, style);
      canvas.drawLine(left, bottom, right, bottom, edgeH, style);
      canvas.drawLine(left, top, left, bottom, edgeV, style);
      canvas.drawLine(right, top, right, bottom, edgeV, style);
      canvas.drawPoint(left, top, cornerTL, style);
      canvas.drawPoint(right, top, cornerTR, style);
      canvas.drawPoint(left, bottom, cornerBL, style);
      canvas.drawPoint(right, bottom, cornerBR, style);

      const xMed = clampInt(pMedian.x, minX, maxX);
      canvas.drawLine(xMed, top, xMed, bottom, medianChar, style);
    }
  });
}

export function createBoxLabelItems(options: RenderBoxMarkOptions & { formatDataLabel: (val: any) => string }): MarkLabelItem[] {
  const normalized = normalizeData(options);
  const { data, xScale, yScale, coordinate, plotX, plotY, plotWidth, plotHeight, leadingGap, bandGap, isTransposed = false } = normalized;
  const { yField, formatDataLabel } = options;

  const isBandScale = xScale.getBandWidth !== undefined;
  const axisLength = isTransposed ? plotHeight : plotWidth;
  const domain = isBandScale ? xScale.getOptions().domain || [] : [];
  const bandIndexMap = new Map<any, number>();
  domain.forEach((value: any, index: number) => bandIndexMap.set(value, index));

  let dodgeCount = 1;
  for (const d of data) {
    const c = d._dodgeCount ?? 1;
    if (c > dodgeCount) dodgeCount = c;
  }
  const hasDodge = dodgeCount > 1;
  const layout = isBandScale ? createBandLayout(domain, 0, axisLength, leadingGap, bandGap, dodgeCount, true) : null;
  const maxGroupCount = hasDodge ? dodgeCount : 1;

  const labels: MarkLabelItem[] = [];
  data.forEach((d) => {
    const raw = d._raw ?? {};
    const xValue = d.x;
    let normalizedX: number;
    if (isBandScale && layout) {
      const xIndex = bandIndexMap.get(xValue);
      if (xIndex === undefined) return;
      const groupCount = hasDodge ? (d._dodgeGroupCount ?? 1) : 1;
      const dodgeIndex = Math.max(0, d._dodgeIndex ?? 0);
      const pos = hasDodge
        ? getCenteredBarPosition({
            layout,
            xIndex,
            dodgeIndex,
            groupCount,
            maxGroupCount,
            bandGap,
          })
        : layout.getBarPosition(xIndex, 0);
      normalizedX = pos.center / axisLength;
    } else {
      normalizedX = xScale.map(xValue);
    }
    const pMedian = mapNormalizedToPixel({
      nx: normalizedX,
      ny: yScale.map(d.median),
      coordinate,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
    });
    labels.push({ x: pMedian.x, y: pMedian.y, text: formatDataLabel(pickNumber(raw, ['median', 'p50', `${yField}Median`, `${yField}_median`]) ?? d.median), position: isTransposed ? 'right' : 'top' });
  });
  return labels;
}

export function render(canvas: CanvasRenderer, options: RenderBoxMarkOptions): void {
  const normalized = normalizeData(options);
  renderNormalized(canvas, normalized);
}
