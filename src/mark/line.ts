/**
 * Line Mark - Line chart.
 */

import { CanvasRenderer } from '../canvas';
import { LineMark } from '../spec';
import { MarkBandOptions, MarkLabelItem, RenderMarkBaseOptions, XYMarkData } from '../types/mark';
import {
  LabelPosition,
  PointPosition,
  createSeriesPoints,
  getBandLayoutForPoints,
  getFeaturePointIndices,
  mapDatumToNormalizedPoint,
  mapNormalizedToPixel,
  placeLabelsWithFallback,
} from '../runtime/labels';

export function adaptLineSpec(spec: LineMark): LineMark {
  return spec;
}

export type LineMarkData = XYMarkData;

export type LineMarkOptions = MarkBandOptions<LineMarkData>;

export type RenderLineMarkOptions = RenderMarkBaseOptions;

/**
 * Render Line Mark.
 */
function renderNormalized(canvas: CanvasRenderer, options: LineMarkOptions): void {
  const { data, xScale, yScale, colorScale, coordinate, plotX, plotY, plotWidth, plotHeight, leadingGap, bandGap, isTransposed = false } = options;

  if (data.length === 0) return;

  const { bandDomain, bandLayout } = getBandLayoutForPoints({
    xScale,
    plotWidth,
    plotHeight,
    isTransposed,
    leadingGap,
    bandGap,
  });

  // Group by color.
  const groups: Record<string, LineMarkData[]> = {};

  data.forEach((d) => {
    const key = d.color !== undefined ? String(d.color) : 'default';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(d);
  });

  // Render each line.
  Object.entries(groups).forEach(([key, points]) => {
    if (points.length === 0) return;

    // Sort by x.
    points.sort((a, b) => {
      if (isTransposed) {
        return yScale.map(a.y) - yScale.map(b.y);
      }
      return xScale.map(a.x) - xScale.map(b.x);
    });

    // Get style (colorScale always exists now).
    const colorInfo = colorScale(key !== 'default' ? points[0].color : undefined);

    // Only draw data points, not connecting lines.
    for (let i = 0; i < points.length; i++) {
      const p = points[i];

      const normalized = mapDatumToNormalizedPoint({
        xValue: p.x,
        yValue: p.y,
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
      const px = point.x;
      const py = point.y;

      canvas.drawPoint(px, py, colorInfo.symbol, colorInfo.style);
    }
  });
}

function normalizeData(options: RenderLineMarkOptions): LineMarkOptions {
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

  const markData: LineMarkData[] = data.map((d) => ({
    x: d[xField],
    y: d[yField],
    color: colorField ? d[colorField] : undefined,
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

export function createLineLabelItems(options: RenderLineMarkOptions & {
  formatDataLabel: (val: any) => string;
}): MarkLabelItem[] {
  const normalized = normalizeData(options);
  const {
    data,
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
  } = normalized;
  const { formatDataLabel } = options;

  const labels: LabelPosition[] = [];
  const points: PointPosition[] = [];
  const { bandDomain, bandLayout } = getBandLayoutForPoints({
    xScale,
    plotWidth,
    plotHeight,
    isTransposed,
    leadingGap,
    bandGap,
  });

  const groups: Record<string, LineMarkData[]> = {};
  data.forEach((d) => {
    const key = d.color !== undefined ? String(d.color) : 'default';
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  });

  Object.values(groups).forEach((group) => {
    const seriesPoints = createSeriesPoints({
      items: group,
      xField: 'x',
      yField: 'y',
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
    });
    seriesPoints.forEach((p) => points.push({ x: p.x, y: p.y }));

    seriesPoints.sort((a, b) => (isTransposed
      ? yScale.map(a.yValue) - yScale.map(b.yValue)
      : xScale.map(a.xValue) - xScale.map(b.xValue)));
    const featureIndices = getFeaturePointIndices(seriesPoints.map((p) => p.yValue));

    featureIndices.forEach((index) => {
      const p = seriesPoints[index];
      if (!p) return;
      labels.push({ x: p.x, y: p.y, text: p.text });
    });
  });

  labels.sort((a, b) => a.y - b.y);
  const visibleLabels = placeLabelsWithFallback(labels, points);
  return visibleLabels;
}

export function render(canvas: CanvasRenderer, options: RenderLineMarkOptions): void {
  const normalized = normalizeData(options);
  renderNormalized(canvas, normalized);
}
