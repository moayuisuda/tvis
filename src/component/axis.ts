/**
 * Axis component - Coordinate axis.
 */

import { CanvasRenderer, textWidth } from '../canvas';
import { Scale, createBandLayout } from '../scale';
import { AxisSpec } from '../spec';
import { createFormatter } from '../utils/format';

export type AxisOptions = {
  scale: Scale;
  x: number;
  y: number;
  length: number;
  orient: 'bottom' | 'left' | 'top' | 'right';
  spec?: AxisSpec;
  dodgeCount?: number; // For calculating dodge group center.
  forceOddWidth?: boolean; // Whether to force odd width (needed for bar charts).
  leadingGap?: number;
  bandGap?: number;
  showAllTicks?: boolean;
};

function getAxisTitleText(spec?: AxisSpec): string | undefined {
  if (!spec || typeof spec === 'boolean') return undefined;
  if (typeof spec.title === 'string') return spec.title;
  return undefined;
}

/**
 * Evenly distribute tick positions (integer pixels).
 * Used for y-axis ticks, ensuring gaps between adjacent ticks are as even as possible.
 * @returns Position array, index 0 for min value (max y coord), index n-1 for max value (min y coord).
 */
function distributeTicksEvenly(numTicks: number, length: number, startY: number): number[] {
  if (numTicks <= 0) return [];
  if (numTicks === 1) return [startY + length];
  
  const positions: number[] = [];
  const numGaps = numTicks - 1;
  
  // Calculate base gap and remainder.
  const baseGap = Math.floor(length / numGaps);
  const remainder = length % numGaps;
  
  const gaps: number[] = new Array(numGaps).fill(baseGap);
  if (remainder > 0) {
    for (let i = 0; i < remainder; i++) {
      const index = numGaps - 1 - i;
      if (index >= 0) {
        gaps[index]++;
      }
    }
  }
  
  // Start from bottom (min tick, max y coord) and go up (max tick, min y coord).
  let currentY = startY + length;
  positions.push(currentY); // First position: min tick.
  
  for (let i = 0; i < numGaps; i++) {
    currentY -= gaps[i];
    positions.push(currentY);
  }
  
  // Positions now: [bottom y coord, ..., top y coord].
  // Corresponding tick values: [min, ..., max].
  return positions;
}

/**
 * Render axis.
 */
export function renderAxis(canvas: CanvasRenderer, options: AxisOptions, style?: any): void {
  const { scale, x, y, length, orient, spec, dodgeCount = 1, forceOddWidth = false, leadingGap = 0, bandGap = 1, showAllTicks = false } = options;

  if (spec === false) return;

  const { tickCount = 5, grid = false, label = true } = spec || {};
  const tickValues = spec?.tickValues;
  const titleText = getAxisTitleText(spec);

  let labelFormatter: ((v: any) => string) | undefined;
  if (typeof label === 'object' && label.formatter) {
    labelFormatter = createFormatter(label.formatter);
  }

  // Draw axis line.
  if (orient === 'bottom' || orient === 'top') {
    canvas.drawLine(x, y, x + length, y, '-', style);
  } else {
    canvas.drawLine(x, y, x, y + length, '|', style);
  }

  // Get tick values.
  let ticks: any[] = [];
  if (tickValues && Array.isArray(tickValues)) {
    ticks = tickValues;
  } else if (scale.getTicks) {
    ticks = scale.getTicks();
  } else if (scale.getOptions) {
    const opts = scale.getOptions();
    if (opts.domain) {
      ticks = opts.domain;
    }
  }

  // For horizontal axis, check overlapping labels from left to right and hide overlaps.
  let visibleTicks = ticks;
  const isBandScale = scale.getBandWidth !== undefined;
  const domain = isBandScale ? scale.getOptions().domain || [] : [];
  const bandLayout = isBandScale
    ? createBandLayout(
        domain,
        orient === 'left' || orient === 'right' ? y : x,
        length,
        leadingGap,
        bandGap,
        dodgeCount,
        forceOddWidth
      )
    : null;

  if (!showAllTicks && label && ticks.length > 1 && (orient === 'bottom' || orient === 'top')) {
    
    // Step 1: Calculate all tick positions and label ranges.
    const tickInfos: Array<{
      tick: any;
      tickX: number;
      labelStart: number;
      labelEnd: number;
      labelWidth: number;
    }> = [];

    ticks.forEach((tick) => {
      const labelText = formatLabel(tick, spec, labelFormatter);
      const labelWidth = textWidth(labelText);
      
      // Calculate tick position (keep consistent with rendering logic below).
      let tickX: number;
      if (bandLayout) {
        const xIndex = domain.indexOf(tick);
        
        if (xIndex !== -1) {
          tickX = bandLayout.getGroupCenter(xIndex);
        } else {
          tickX = x;
        }
      } else {
        // Linear scale.
        const normalizedValue = scale.map(tick);
        tickX = Math.round(x + normalizedValue * length);
      }
      
      // Calculate label start and end positions (center-aligned).
      const labelStart = Math.floor(tickX - (labelWidth - 1) / 2);
      const labelEnd = labelStart + labelWidth;
      
      tickInfos.push({ tick, tickX, labelStart, labelEnd, labelWidth });
    });
    
    // Step 2: Scan left to right, collect non-overlapping labels.
    visibleTicks = [];
    let lastLabelEnd = -Infinity;

    for (let i = 0; i < tickInfos.length; i++) {
      const info = tickInfos[i];
      
      // Check overlap with previous label (leave 1 char spacing).
      if (info.labelStart > lastLabelEnd + 1) {
        visibleTicks.push(info.tick);
        lastLabelEnd = info.labelEnd;
      } else if (i === tickInfos.length - 1) {
        // If last label overlaps, remove previous and keep last.
        if (visibleTicks.length > 0) {
          visibleTicks.pop(); // Remove previous.
        }
        visibleTicks.push(info.tick); // Add last.
      }
    }
  } else if (!showAllTicks && ticks.length > tickCount && scale.getTicks && orient !== 'left' && orient !== 'bottom') {
    // For continuous scale vertical axis (not left y-axis, not bottom x-axis), limit tick count.
    // Note: left y-axis already achieves perfect distribution via height adjustment, no filtering needed.
    // Note: bottom x-axis already handles overlap detection above, no simple filtering needed here.
    const step = Math.ceil(ticks.length / tickCount);
    visibleTicks = ticks.filter((_, i) => i % step === 0);
  }

  // Render using filtered ticks.
  const ticksToRender = visibleTicks;

  // For left y-axis, pre-calculate evenly distributed tick positions (integer pixels).
  const yTickPositions = (orient === 'left' && ticksToRender.length > 0 && !bandLayout)
    ? distributeTicksEvenly(ticksToRender.length, length, y)
    : [];

  // Draw ticks and labels.
  ticksToRender.forEach((tick) => {
    if (orient === 'bottom') {
      // Calculate tick position.
      let tickX: number;
      if (bandLayout) {
        // Band scale: use unified layout calculation (avoid pixelation errors).
        // Note: use index from original domain, not visibleTicks.
        const xIndex = domain.indexOf(tick); // Use original domain index.
        
        if (xIndex !== -1) {
          tickX = bandLayout.getGroupCenter(xIndex);
        } else {
          // Index not found, fallback.
          tickX = x;
        }
      } else {
        // Linear scale.
        const normalizedValue = scale.map(tick);
        tickX = Math.round(x + normalizedValue * length);
      }
      
      const tickY = y;

      // Draw tick mark.
      canvas.drawText(tickX, tickY, '+', style);

      // Draw label.
      if (label) {
        const labelText = formatLabel(tick, spec);
        const labelX = Math.floor(tickX - (textWidth(labelText) - 1) / 2);
        canvas.drawText(labelX, tickY + 1, labelText, style);
      }

      // Draw grid lines.
      if (grid && tickX !== x) {
        for (let gy = y - 1; gy > 0; gy--) {
          canvas.setPixel(tickX, gy, ':', { ...style, dim: true });
        }
      }
    } else if (orient === 'left') {
      const tickX = x;
      let tickY: number;
      if (bandLayout) {
        const tickIndex = domain.indexOf(tick);
        tickY = tickIndex !== -1 ? bandLayout.getGroupCenter(tickIndex) : y;
      } else {
        const tickIndex = ticks.indexOf(tick);
        tickY = (tickIndex !== -1 && tickIndex < yTickPositions.length)
          ? yTickPositions[tickIndex]
          : Math.round(y + length - scale.map(tick) * length);
      }

      // Draw tick mark.
      canvas.drawText(tickX, tickY, '+', style);

      // Draw label.
      if (label) {
        const labelText = formatLabel(tick, spec);
        const labelX = tickX - textWidth(labelText) - 1;
        canvas.drawText(labelX, tickY, labelText, style);
      }

      // Draw grid lines (horizontal).
      if (grid && tickY !== y + length) {
        for (let gx = tickX + 1; gx < canvas.width; gx++) {
          canvas.setPixel(gx, tickY, '-', { ...style, dim: true });
        }
      }
    }
  });

  if (titleText) {
    const titleWidth = textWidth(titleText);
    if (orient === 'bottom') {
      const titleX = Math.floor(x + (length - titleWidth) / 2);
      const titleY = y + (label ? 2 : 1);
      if (titleY >= 0 && titleY < canvas.height) {
        canvas.drawText(titleX, titleY, titleText, style);
      }
    } else if (orient === 'left') {
      const titleX = x - titleWidth;
      const titleY = y - 2;
      if (titleY >= 0 && titleY < canvas.height) {
        canvas.drawText(titleX, titleY, titleText, style);
      }
    }
  }
}

/**
 * Format label.
 */
export function formatLabel(value: any, spec?: AxisSpec, formatter?: (v: any) => string): string {
  if (!spec || typeof spec === 'boolean') return String(value);

  if (formatter) {
    return formatter(value);
  }

  if (typeof spec.label === 'object' && spec.label.formatter) {
    return createFormatter(spec.label.formatter)(value);
  }

  if (typeof value === 'number') {
    // Simplify large numbers.
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    // Limit decimal places.
    if (value % 1 !== 0) {
      return value.toFixed(2);
    }
  }

  return String(value);
}
