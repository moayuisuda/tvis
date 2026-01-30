import { getLinearColor, getDiscreteColor, getLinearPattern, getDiscretePattern } from '../canvas';
import { AxisSpec } from '../spec';

export const SYMBOL_MAP: Record<string, string> = {
  interval: '█',
  line: '·',
  point: '·',
};

const DEFAULT_Y_TICKS = [1.0, 1.2, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 7.5, 8.0, 10.0]

export function createColorScale(params: {
  colorField?: string;
  colorType: string;
  colorValues: any[];
  mode: string;
  palette: string[] | readonly string[];
  type: string;
  colorDomain: any[];
}): (value: any) => { symbol: string; style?: any } {
  const { colorField, colorType, colorValues, mode, palette, type, colorDomain } = params;

  if (colorField) {
    if (colorType === 'linear') {
      // Linear color.
      const min = Math.min(...(colorValues as number[]));
      const max = Math.max(...(colorValues as number[]));

      return (value: any) => {
        const t = max === min ? 0.5 : ((value as number) - min) / (max - min);
        if (mode === 'color') {
          // If user provides specific colors for linear scale, use them as gradient stops.
          // Otherwise, use the default palette as gradient stops.
          const color = getLinearColor(t, palette);
          const symbol = SYMBOL_MAP[type] || '·';
          return { symbol, style: { color } };
        } else {
          return { symbol: getLinearPattern(t) };
        }
      };
    } else {
      // Discrete color.
      return (value: any) => {
        const index = colorDomain.indexOf(value);
        if (mode === 'color') {
          const color = getDiscreteColor(index, palette);
          const symbol = SYMBOL_MAP[type] || '·';
          return { symbol, style: { color } };
        } else {
          return { symbol: getDiscretePattern(index) };
        }
      };
    }
  } else {
    // When no color encoding, use default symbol.
    return () => {
      if (mode === 'color') {
        // Color mode: return colored symbol based on mark type.
        const symbol = SYMBOL_MAP[type] || '·';
        return { symbol, style: { color: 'brightBlue' } };
      } else {
        // ASCII mode: return ASCII character based on mark type.
        const symbol = type === 'interval' ? '#' : (type === 'line' ? '*' : 'o');
        return { symbol };
      }
    };
  }
}


export function getAxisTitleText(spec?: AxisSpec): string | undefined {
  if (!spec || typeof spec === 'boolean') return undefined;
  if (typeof spec.title === 'string') return spec.title;
  return undefined;
}

export function getMaxYValue(transformedData: any[], xField: string, yField: string, isStacked: boolean): number {
  if (!isStacked) {
    return Math.max(...transformedData.map((d) => d[yField] || 0), 0);
  }
  const xGroups: Record<string, number> = {};
  transformedData.forEach((d) => {
    const xVal = String(d[xField]);
    const y1 = (d as any)._y1 || d[yField] || 0;
    const current = xGroups[xVal];
    if (current === undefined || y1 > current) {
      xGroups[xVal] = y1;
    }
  });
  return Math.max(...Object.values(xGroups), 0);
}

export function calculateNiceScale(maxValue: number, intervalCount: number = 5): { step: number; domainMax: number; ticks: number[] } {
  const rawStep = maxValue / intervalCount;

  const getNiceHalfStep = (val: number): number => {
    if (val === 0) return 0.1;
    const exponent = Math.floor(Math.log10(val));
    const fraction = val / Math.pow(10, exponent);

    const allowedBases = DEFAULT_Y_TICKS;
    let niceFraction = 10.0;

    for (const base of allowedBases) {
      if (base >= fraction) {
        niceFraction = base;
        break;
      }
    }

    return niceFraction * Math.pow(10, exponent);
  };

  const rawHalfStep = rawStep / 2;
  const halfStep = getNiceHalfStep(rawHalfStep);

  const step = halfStep * 2;
  const domainMax = step * intervalCount;

  const ticks = [];
  for (let i = 0; i <= intervalCount; i++) {
    ticks.push(parseFloat((i * step).toPrecision(12)));
  }

  return { step, domainMax, ticks };
}
