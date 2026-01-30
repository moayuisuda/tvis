import { inferScaleType, createScale } from '../scale';
import { calculateNiceScale } from './scale';
import { createFormatter } from '../utils/format';
import { textWidth } from '../canvas';
import { formatLabel } from '../component/axis';
import { measureLegendHeight, measureLegendWidth } from '../component/legend';

export interface AxisLayoutOptions {
  xAxisSpec: any;
  yAxisSpec: any;
  yAxisTitle?: string;
  yTicks: number[];
  userPaddingLeft?: number;
  xAxisTitle?: string;
}

export interface LegendLayoutOptions {
  title?: string;
  legendSpec: any;
  legendGap: number;
  hasColorLegend: boolean;
  colorDomain: any[];
  legendSymbol: string;
}

export interface PaddingLayoutOptions {
  paddingTop: number;
  paddingBottom: number;
  paddingRight: number;
}

export interface ChartLayoutOptions {
  type: string;
  xValues: any[];
  isTransposed: boolean;
  dodgeCount: number;
  xCount: number;
  leadingGap: number;
  bandGap: number;
  xScale: any;
  axis: AxisLayoutOptions;
  legend: LegendLayoutOptions;
  padding: PaddingLayoutOptions;
}

/**
 * Calculate layout dimensions based on chart type and data.
 */
export function calculateChartLayout(options: ChartLayoutOptions) {
  const {
    type,
    xValues,
    isTransposed,
    dodgeCount,
    xCount,
    leadingGap,
    bandGap,
    xScale: initialXScale,
    axis,
    legend,
    padding,
  } = options;

  const {
    xAxisSpec,
    yAxisSpec,
    yAxisTitle,
    yTicks,
    userPaddingLeft,
  } = axis;

  const {
    title,
    legendSpec,
    legendGap,
    hasColorLegend,
    colorDomain,
    legendSymbol,
  } = legend;

  const {
    paddingTop,
    paddingBottom,
    paddingRight,
  } = padding;

  const xAxisTitle = axis as any && (axis as any).xAxisTitle;

  let plotWidth = 1;
  let plotHeight = 10;
  let xScale = initialXScale;
  let xTicks: number[] | undefined;

  if (type === 'point' && inferScaleType(xValues) === 'linear') {
    const maxX = Math.max(...(xValues as number[]), 0);
    const targetIntervalCount = 5;
    const { domainMax, ticks } = calculateNiceScale(maxX, targetIntervalCount);
    xScale = createScale('linear', [0, domainMax], [0, 1], { nice: false });
    xTicks = ticks;
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
  let rightPadding = paddingRight;
  let bottomPadding = paddingBottom;

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
        symbol: legendSymbol,
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
  const adjustedTotalHeight = topPadding + plotHeight + bottomPadding;
  const adjustedTotalWidth = plotWidth + leftPadding + rightPadding;

  return {
    plotWidth,
    plotHeight,
    xScale,
    xTicks,
    leftPadding,
    plotX,
    plotY,
    topPadding,
    bottomPadding,
    rightPadding,
    adjustedTotalHeight,
    adjustedTotalWidth,
    legendHeight,
  };
}
