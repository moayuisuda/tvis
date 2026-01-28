/**
 * Point Mark - Scatter plot.
 */

import { CanvasRenderer } from '../canvas';
import { PointMark } from '../spec';
import { MarkBandOptions, MarkLabelItem, RenderMarkBaseOptions, XYMarkData } from '../types/mark';
import {
  LabelPosition,
  PointPosition,
  createSeriesPoints,
  getBandLayoutForPoints,
  mapDatumToNormalizedPoint,
  mapNormalizedToPixel,
  placeLabelsWithFallback,
} from '../runtime/labels';

export function adaptPointSpec(spec: PointMark): PointMark {
  return spec;
}

export type PointMarkData = XYMarkData & {
  size?: number;
};

export type PointMarkOptions = MarkBandOptions<PointMarkData>;

export type RenderPointMarkOptions = RenderMarkBaseOptions;

/**
 * Render Point Mark.
 */
function renderNormalized(canvas: CanvasRenderer, options: PointMarkOptions): void {
  const { data, xScale, yScale, colorScale, coordinate, plotX, plotY, plotWidth, plotHeight, leadingGap, bandGap, isTransposed = false } = options;

  const { bandDomain, bandLayout } = getBandLayoutForPoints({
    xScale,
    plotWidth,
    plotHeight,
    isTransposed,
    leadingGap,
    bandGap,
  });

  data.forEach((d) => {
    const normalized = mapDatumToNormalizedPoint({
      xValue: d.x,
      yValue: d.y,
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

    // Boundary check.
    if (px < plotX || px >= plotX + plotWidth || py < plotY || py >= plotY + plotHeight) {
      return;
    }

    // Get style (colorScale always exists now).
    const colorInfo = colorScale(d.color);

    canvas.drawPoint(px, py, colorInfo.symbol, colorInfo.style);
  });
}

function normalizeData(options: RenderPointMarkOptions): PointMarkOptions {
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

  const markData: PointMarkData[] = data.map((d) => ({
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

export function createPointLabelItems(options: RenderPointMarkOptions & {
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

  const seriesPoints = createSeriesPoints({
    items: data,
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
  seriesPoints.forEach((p) => {
    points.push({ x: p.x, y: p.y });
    labels.push({ x: p.x, y: p.y, text: p.text });
  });

  labels.sort((a, b) => a.y - b.y);
  const visibleLabels = placeLabelsWithFallback(labels, points);
  return visibleLabels;
}

export function render(canvas: CanvasRenderer, options: RenderPointMarkOptions): void {
  const normalized = normalizeData(options);
  renderNormalized(canvas, normalized);
}
