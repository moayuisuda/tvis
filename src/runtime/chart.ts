/**
 * Chart Runtime - Chart runtime engine.
 */

import { ChartSpec, RenderMode } from '../spec';
import { supportsColor } from '../utils/env';
import { createCanvas, DEFAULT_PALETTE, textWidth, getDiscretePattern } from '../canvas';
import { createCoordinate } from '../coordinate';
import { inferScale, inferScaleType, createScale } from '../scale';
import { applyTransforms } from '../transform';
import { renderAxis } from '../component/axis';
import { renderLegend } from '../component/legend';
import { renderLabel } from '../component/label';
import { MarkLabelItem, RenderMarkBaseOptions, appendBestSpec, createMarkLabels, getEncodeField, renderMark } from '../mark';
import {
  createValueFormatter,
} from './labels';
import { calculateChartLayout, ChartLayoutOptions } from './layout';
import { calculateNiceScale, getAxisTitleText, getMaxYValue, createColorScale, SYMBOL_MAP } from './scale';

export type ChartOptions = ChartSpec & {
  mode?: RenderMode;
};

/**
 * Create chart.
 */
export function Chart(options: ChartOptions): string {
  const bestOptions = appendBestSpec(options);
  const {
    type = 'interval',
    data = [],
    encode = {},
    transform = [],
    scale: scaleSpec = {},
    coordinate: coordinateSpec,
    axis: axisSpec = {},
    legend: legendSpec = {},
    title,
    label: labelEnabled, // Whether to show data labels.
    paddingLeft: userPaddingLeft,
    paddingRight = 2,
    paddingTop = 1,  // Reserve space for labels.
    paddingBottom = 2,
    mode = supportsColor() ? 'color' : 'ascii',
    colors = [],
  } = bestOptions;

  const leadingGap = 1;
  const bandGap = type === 'line' ? 0 : 1;

  // Determine color palette.
  const palette = colors.length > 0 ? colors : DEFAULT_PALETTE;

  // Default: interval shows labels by default, other types don't.
  const showLabel = labelEnabled !== undefined ? !!labelEnabled : (type === 'interval');

  const formatDataLabel = createValueFormatter(labelEnabled);

  // Parse encode fields.
  const encodeFields = {
    x: getEncodeField(encode.x),
    y: getEncodeField(encode.y),
    color: getEncodeField(encode.color),
  };

  // Apply data transforms.
  const transformedData = applyTransforms({ data, encodeFields }, transform);

  // Check if stacked.
  const isStacked = transform.some((t) => t.type === 'stackY');

  const xField = encodeFields.x;
  const yField = encodeFields.y;
  const colorField = encodeFields.color;

  if (!xField || !yField) {
    throw new Error('x and y encode fields are required');
  }

  const colorValues = colorField ? data.map((d) => d[colorField]).filter((v) => v !== null && v !== undefined) : [];
  const colorType = colorField ? inferScaleType(colorValues) : 'ordinal';
  const hasColorLegend = !!(colorField && colorType === 'ordinal');
  const colorDomain = hasColorLegend ? Array.from(new Set(colorValues)) : [];
  const legendGap = hasColorLegend ? 2 : 0;

  let plotWidth = 1;
  let plotHeight = 10;

  // Detect if transpose transformation exists.
  const isTransposed = coordinateSpec?.type === 'transpose'
    || (coordinateSpec?.transform?.some((t) => t.type === 'transpose') ?? false);

  let adjustedTotalWidth = 1;

  // X Scale
  let xScale = inferScale(transformedData, xField, [0, 1], scaleSpec.x);
  let xTicks: number[] | undefined;

  const hasDodgeTransform = transform.some((t) => t.type === 'dodgeX');
  let dodgeCount = 1;
  if (hasDodgeTransform) {
    for (const d of transformedData) {
      const c = (d as any)._dodgeCount ?? 1;
      if (c > dodgeCount) dodgeCount = c;
    }
  }
  const hasDodge = hasDodgeTransform && dodgeCount > 1;

  const xValues = transformedData.map((d) => d[xField]);
  const xCount = new Set(xValues).size;

  const maxY = getMaxYValue(transformedData, xField, yField, isStacked);
  const targetTickCount = 6;
  const targetIntervalCount = targetTickCount - 1;

  const { domainMax: yDomainMax, ticks: yTicks } = calculateNiceScale(maxY, targetIntervalCount);
 
  const xAxisSpec = isTransposed ? axisSpec.y : axisSpec.x;
  const yAxisSpec = isTransposed ? axisSpec.x : axisSpec.y;
  const xAxisTitle = getAxisTitleText(xAxisSpec);
  const yAxisTitle = getAxisTitleText(yAxisSpec);

  const legendSymbolForMeasure = mode === 'color' ? (SYMBOL_MAP[type] || '·') : getDiscretePattern(0);

  const layoutOptions: ChartLayoutOptions = {
    type,
    xValues,
    isTransposed,
    dodgeCount,
    xCount,
    leadingGap,
    bandGap,
    xScale,
    axis: {
      xAxisSpec,
      yAxisSpec,
      yAxisTitle,
      yTicks,
      userPaddingLeft,
      xAxisTitle,
    },
    legend: {
      title,
      legendSpec,
      legendGap,
      hasColorLegend,
      colorDomain,
      legendSymbol: legendSymbolForMeasure,
    },
    padding: {
      paddingTop,
      paddingBottom,
      paddingRight,
    },
  };

  const layout = calculateChartLayout(layoutOptions);

  plotWidth = layout.plotWidth;
  plotHeight = layout.plotHeight;
  xScale = layout.xScale;
  xTicks = layout.xTicks;

  const plotX = layout.plotX;
  const plotY = layout.plotY;
  let adjustedTotalHeight = layout.adjustedTotalHeight;
  adjustedTotalWidth = layout.adjustedTotalWidth;
  const legendHeight = layout.legendHeight;

  const yScale = createScale('linear', [0, yDomainMax], [0, 1], { nice: false });

  if (legendHeight > 0) {
    adjustedTotalHeight = Math.max(adjustedTotalHeight, plotY + legendHeight);
  }
  const canvas = createCanvas(adjustedTotalWidth, adjustedTotalHeight, mode);
  if (title) {
    const titleWidth = textWidth(title);
    const titleX = Math.max(0, Math.floor((adjustedTotalWidth - titleWidth) / 2));
    canvas.drawText(titleX, 0, title);
  }
  const coordinate = createCoordinate(0, 0, plotWidth, plotHeight, coordinateSpec);

  // Color Scale
  const colorScale = createColorScale({
    colorField,
    colorType,
    colorValues,
    mode,
    palette,
    type,
    colorDomain,
  });

  const renderLabels = (labels: MarkLabelItem[]) => {
    labels.forEach((label) => {
      renderLabel(canvas, {
        x: label.x,
        y: label.y,
        text: label.text,
        position: label.position,
      });
    });
  };

  const markBaseOptions: RenderMarkBaseOptions = {
    data: transformedData,
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
  };

  renderMark(canvas, {
    ...markBaseOptions,
    type,
  });

  // Render labels (after Mark rendering to ensure labels show above data points).
  if (showLabel) {
    const labels = createMarkLabels({
      ...markBaseOptions,
      type,
      formatDataLabel,
      isStacked,
      hasDodge,
      dodgeCount,
    });
    renderLabels(labels);
  }

  // Render axes.
  const axisY = plotY + plotHeight;
  // For point chart, we want the axes to meet exactly at the origin (plotX).
  // For other charts (like interval), we keep the original offset (plotX - 1).
  const axisX = type === 'point' ? plotX : plotX - 1;

  // Y axis.
  renderAxis(canvas, {
    scale: isTransposed ? xScale : yScale,
    x: axisX,
    y: plotY,
    length: plotHeight,
    orient: 'left',
    spec: yAxisSpec === false ? false : { ...(yAxisSpec || {}), tickValues: isTransposed ? (xScale.getOptions().domain || []) : yTicks },
    dodgeCount,
    forceOddWidth: type === 'interval',
    leadingGap,
    bandGap,
    showAllTicks: isTransposed,
  });

  // X axis.
  renderAxis(canvas, {
    scale: isTransposed ? yScale : xScale,
    x: plotX,
    y: axisY,
    length: plotWidth,
    orient: 'bottom',
    spec: xAxisSpec === false ? false : { ...(xAxisSpec || {}), tickValues: isTransposed ? yTicks : xTicks },
    dodgeCount, // Pass dodgeCount for calculating group center.
    forceOddWidth: type === 'interval', // Force odd width for bar charts.
    leadingGap,
    bandGap,
    showAllTicks: isTransposed,
  });

  // Render legend.
  if (hasColorLegend && colorScale && colorDomain.length > 0) {
    const legendItems = colorDomain.map((value) => {
      const colorInfo = colorScale!(value);
      return {
        label: String(value),
        symbol: colorInfo.symbol,
        style: colorInfo.style,
      };
    });

    renderLegend(canvas, {
      items: legendItems,
      x: plotX + plotWidth + legendGap,
      y: plotY,
      width: plotWidth,
      spec: legendSpec.color,
    });
  }

  return canvas.toString();
}
