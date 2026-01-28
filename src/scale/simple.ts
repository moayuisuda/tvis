/**
 * Simple Linear Scale.
 */
export class Linear {
  private domain: number[];
  private range: number[];
  private nice: boolean;

  constructor(options: { domain: number[]; range: number[]; nice?: boolean }) {
    this.domain = options.domain;
    this.range = options.range;
    this.nice = options.nice || false;

    if (this.nice) {
      this.niceDomain();
    }
  }

  map(value: number): number {
    const [min, max] = this.domain;
    const [rMin, rMax] = this.range;

    if (max === min) return rMin;

    const t = (value - min) / (max - min);
    return rMin + t * (rMax - rMin);
  }

  invert(value: number): number {
    const [min, max] = this.domain;
    const [rMin, rMax] = this.range;

    if (rMax === rMin) return min;

    const t = (value - rMin) / (rMax - rMin);
    return min + t * (max - min);
  }

  getTicks(count: number = 5): number[] {
    const [min, max] = this.domain;
    return d3LinearTicks(min, max, count);
  }

  getOptions() {
    return { domain: this.domain, range: this.range };
  }

  private niceDomain() {
    const [min, max] = this.domain;
    const ticks = d3LinearTicks(min, max, 5);
    if (ticks.length > 0) {
      this.domain = [Math.min(min, ticks[0]), Math.max(max, ticks[ticks.length - 1])];
    }
  }
}

/**
 * Simple Ordinal Scale.
 */
export class Ordinal {
  private domain: any[];
  private range: any[];

  constructor(options: { domain: any[]; range: any[] }) {
    this.domain = options.domain;
    this.range = options.range;
  }

  map(value: any): any {
    const index = this.domain.indexOf(value);
    if (index === -1) return this.range[0];
    return this.range[index % this.range.length];
  }

  getOptions() {
    return { domain: this.domain, range: this.range };
  }
}

/**
 * Simple Band Scale.
 */
export class Band {
  private domain: any[];
  private range: any[];
  private paddingInner: number;
  private paddingOuter: number;

  constructor(options: { domain: any[]; range: any[]; paddingInner?: number; paddingOuter?: number }) {
    this.domain = options.domain;
    this.range = options.range;
    this.paddingInner = options.paddingInner || 0;
    this.paddingOuter = options.paddingOuter || 0;
  }

  map(value: any): number {
    const index = this.domain.indexOf(value);
    if (index === -1) return this.range[0];
    
    const step = (this.range[1] - this.range[0]) / this.domain.length;
    return this.range[0] + step * index;
  }

  getBandWidth(): number {
    const step = (this.range[1] - this.range[0]) / this.domain.length;
    return step; // Simplified
  }

  getOptions() {
    return { domain: this.domain, range: this.range };
  }
}

/**
 * Simple Point Scale.
 */
export class Point {
  private domain: any[];
  private range: any[];

  constructor(options: { domain: any[]; range: any[] }) {
    this.domain = options.domain;
    this.range = options.range;
  }

  map(value: any): number {
    const index = this.domain.indexOf(value);
    if (index === -1) return this.range[0];

    const step = (this.range[1] - this.range[0]) / (this.domain.length > 1 ? this.domain.length - 1 : 1);
    return this.range[0] + step * index;
  }
  
  getBandWidth(): number {
    return 0;
  }

  getOptions() {
    return { domain: this.domain, range: this.range };
  }
}

// --- Helper Functions ---

/**
 * Simplified version of d3-array ticks.
 */
function d3LinearTicks(start: number, stop: number, count: number): number[] {
  const step = tickStep(start, stop, count);
  const precision = step >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(step)));
  
  let i = -1;
  let n: number;

  // Use Math.ceil/floor to avoid floating point issues
  const rStart = Math.ceil(start / step);
  const rStop = Math.floor(stop / step);
  n = Math.ceil(rStop - rStart + 1);
  
  const ticks = new Array(n);
  while (++i < n) {
    ticks[i] = parseFloat(((rStart + i) * step).toFixed(precision));
  }

  return ticks;
}

function tickStep(start: number, stop: number, count: number): number {
  const step0 = Math.abs(stop - start) / Math.max(0, count);
  let step1 = Math.pow(10, Math.floor(Math.log10(step0)));
  const error = step0 / step1;
  
  if (error >= Math.sqrt(50)) step1 *= 10;
  else if (error >= Math.sqrt(10)) step1 *= 5;
  else if (error >= Math.sqrt(2)) step1 *= 2;
  
  return stop < start ? -step1 : step1;
}
