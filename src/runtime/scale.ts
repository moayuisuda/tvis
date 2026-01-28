import { AxisSpec } from '../spec';

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

    const allowedBases = [1.0, 1.2, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 7.5, 8.0, 10.0];
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
