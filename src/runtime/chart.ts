/**
 * Chart Runtime - Chart runtime engine.
 */

import { ChartSpec, RenderMode } from '../spec';
import { supportsColor } from '../utils/env';
import { createFormatter } from '../utils/format';
import { createCanvas, getLinearPattern, getDiscretePattern, getLinearColor, getDiscreteColor, DEFAULT_PALETTE, textWidth } from '../canvas';
import { createCoordinate } from '../coordinate';
import { inferScale, inferScaleType, createScale } from '../scale';
import { applyTransforms } from '../transform';
import { renderAxis, formatLabel } from '../component/axis';
import { renderLegend, measureLegendHeight, measureLegendWidth } from '../component/legend';
import { renderLabel } from '../component/label';
import { MarkLabelItem, appendBestSpec, createMarkLabels, getEncodeField, renderMark } from '../mark';
import {
  createValueFormatter,
} from './labels';
import { calculateNiceScale, getAxisTitleText, getMaxYValue } from './scale';

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
  const hasColorLegend = colorField && colorType === 'ordinal';
  const colorDomain = hasColorLegend ? Array.from(new Set(colorValues)) : [];
  const legendGap = hasColorLegend ? 2 : 0;

  let rightPadding = paddingRight;
  let bottomPadding = paddingBottom;
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

  if (type === 'point' && inferScaleType(xValues) === 'linear') {
    const maxX = Math.max(...(xValues as number[]), 0);
    const targetIntervalCount = 5;
    const { domainMax, ticks } = calculateNiceScale(maxX, targetIntervalCount);
    xScale = createScale('linear', [0, domainMax], [0, 1], { nice: false });
    xTicks = ticks;
    // Each interval is 4 characters wide (e.g. "---+")
    plotWidth = targetIntervalCount * 4;
  } else if (type === 'interval') {
    const barWidth = isTransposed ? 1 : 3;
    const innerGap = 1;
    const outerGap = dodgeCount > 1 ? 2 : 1;
    const totalLength = xCount === 0
      ? 0
      : dodgeCount > 1
        ? leadingGap + xCount * (dodgeCount * barWidth + (dodgeCount - 1) * innerGap) + (xCount - 1) * outerGap
        : leadingGap + xCount * barWidth + (xCount - 1) * innerGap;
    if (isTransposed) {
      plotHeight = Math.max(1, totalLength);
      plotWidth = 10;
    } else {
      plotWidth = Math.max(1, totalLength);
    }
  } else {
    const pointWidth = 1;
    const gap = type === 'line' ? bandGap : 1;
    const totalLength = xCount === 0 ? 0 : leadingGap + xCount * pointWidth + (xCount - 1) * gap;
    plotWidth = Math.max(1, totalLength);
    if (isTransposed) {
      const swappedHeight = plotWidth;
      plotWidth = 10;
      plotHeight = swappedHeight;
    }
  }




  const maxY = getMaxYValue(transformedData, xField, yField, isStacked);
  
  const targetTickCount = 6;
  const targetIntervalCount = targetTickCount - 1;

  const { domainMax: yDomainMax, ticks: yTicks } = calculateNiceScale(maxY, targetIntervalCount);
 
  const xAxisSpec = isTransposed ? axisSpec.y : axisSpec.x;
  const yAxisSpec = isTransposed ? axisSpec.x : axisSpec.y;
  const xAxisTitle = getAxisTitleText(xAxisSpec);
  const yAxisTitle = getAxisTitleText(yAxisSpec);

  if (isTransposed) {
    const numericTicks = (typeof xAxisSpec === 'object' && xAxisSpec !== null && Array.isArray(xAxisSpec.tickValues))
      ? xAxisSpec.tickValues
      : yTicks;
    const tickCountForWidth = Math.max(2, numericTicks.length);
    plotWidth = Math.max(1, (tickCountForWidth - 1) * 4);
  }

  const yAxisTickValues = (typeof yAxisSpec === 'object' && yAxisSpec !== null && Array.isArray(yAxisSpec.tickValues))
    ? yAxisSpec.tickValues
    : (isTransposed ? (xScale.getOptions().domain || []) : yTicks);

  let paddingLeft = userPaddingLeft;
  if (paddingLeft === undefined) {
    if (yAxisSpec === false) {
      paddingLeft = 0;
    } else {
      let yFormatter: ((v: any) => string) | undefined;
      if (typeof yAxisSpec === 'object' && yAxisSpec && yAxisSpec.label && typeof yAxisSpec.label === 'object' && yAxisSpec.label.formatter) {
          yFormatter = createFormatter(yAxisSpec.label.formatter);
      }

      const maxTickLength = yAxisTickValues.length > 0
        ? Math.max(...yAxisTickValues.map((t: any) => formatLabel(t, yAxisSpec, yFormatter).length))
        : 0;
      const titleWidth = yAxisTitle ? textWidth(yAxisTitle) : 0;
      paddingLeft = Math.max(maxTickLength, titleWidth) + 2;
    }
  }
  const leftPadding = paddingLeft;
  const plotX = leftPadding;

  const legendItemsForMeasure = hasColorLegend
    ? colorDomain.map((value) => ({
        label: String(value),
        symbol: mode === 'color' ? (type === 'interval' ? '█' : '·') : getDiscretePattern(0),
      }))
    : [];
  const titleHeight = title ? 1 : 0;
  const legendHeight = hasColorLegend ? measureLegendHeight(legendItemsForMeasure, plotWidth, legendSpec.color) : 0;
  const legendWidth = hasColorLegend ? measureLegendWidth(legendItemsForMeasure, legendSpec.color) : 0;
  if (legendWidth > 0) {
    rightPadding = Math.max(rightPadding, legendWidth + legendGap);
  }
  const minTopPadding = yAxisTitle ? 2 : 0;
  const topPaddingValue = Math.max(paddingTop, minTopPadding) + titleHeight;
  if (xAxisTitle) {
    bottomPadding = Math.max(bottomPadding, 3);
  }
  const topPadding = topPaddingValue;
  const plotY = topPadding;
  let adjustedTotalHeight = topPadding + plotHeight + bottomPadding;
  adjustedTotalWidth = plotWidth + leftPadding + rightPadding;

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

  /**
   * Get default symbol (based on mode and type).
   */
  const getDefaultSymbol = (): { symbol: string; style?: any } => {
    if (mode === 'color') {
      // Color mode: return colored symbol based on mark type.
      const symbol = type === 'interval' ? '█' : (type === 'line' ? '·' : '·');
      return { symbol, style: { color: 'brightBlue' } };
    } else {
      // ASCII mode: return ASCII character based on mark type.
      const symbol = type === 'interval' ? '#' : (type === 'line' ? '*' : 'o');
      return { symbol };
    }
  };

  // Color Scale
  let colorScale: (value: any) => { symbol: string; style?: any };

  if (colorField) {
    if (colorType === 'linear') {
      // Linear color.
      const min = Math.min(...(colorValues as number[]));
      const max = Math.max(...(colorValues as number[]));

      colorScale = (value: any) => {
        const t = max === min ? 0.5 : ((value as number) - min) / (max - min);
        if (mode === 'color') {
          // If user provides specific colors for linear scale, use them as gradient stops.
          // Otherwise, use the default palette as gradient stops.
          const color = getLinearColor(t, palette);
          const symbol = type === 'interval' ? '█' : '·';
          return { symbol, style: { color } };
        } else {
          return { symbol: getLinearPattern(t) };
        }
      };
    } else {
      // Discrete color.
      colorScale = (value: any) => {
        const index = colorDomain.indexOf(value);
        if (mode === 'color') {
          const color = getDiscreteColor(index, palette);
          const symbol = type === 'interval' ? '█' : '·';
          return { symbol, style: { color } };
        } else {
          return { symbol: getDiscretePattern(index) };
        }
      };
    }
  } else {
    // When no color encoding, use default symbol.
    colorScale = () => getDefaultSymbol();
  }

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

  renderMark(canvas, {
    type,
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
  });

  // Render labels (after Mark rendering to ensure labels show above data points).
  if (showLabel) {
    const labels = createMarkLabels({
      type,
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
