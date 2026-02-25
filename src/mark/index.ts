import { CanvasRenderer } from '../canvas';
import { MarkType } from '../spec';
import { adaptIntervalSpec, createIntervalLabelItems, render as renderInterval } from './interval';
import { adaptLineSpec, createLineLabelItems, render as renderLine } from './line';
import { adaptPointSpec, createPointLabelItems, render as renderPoint } from './point';
import { adaptBoxSpec, createBoxLabelItems, render as renderBox } from './box';
import { MarkLabelItem, RenderMarkBaseOptions } from '../types/mark';

export {
  adaptIntervalSpec,
  createIntervalLabelItems,
  render as renderInterval,
  IntervalMarkData,
  IntervalMarkOptions,
  RenderIntervalMarkOptions,
} from './interval';
export {
  adaptLineSpec,
  createLineLabelItems,
  render as renderLine,
  LineMarkData,
  LineMarkOptions,
  RenderLineMarkOptions,
} from './line';
export {
  adaptPointSpec,
  createPointLabelItems,
  render as renderPoint,
  PointMarkData,
  PointMarkOptions,
  RenderPointMarkOptions,
} from './point';
export {
  adaptBoxSpec,
  createBoxLabelItems,
  render as renderBox,
  BoxMarkData,
  BoxMarkOptions,
  RenderBoxMarkOptions,
} from './box';
export * from '../types/mark';

export { getEncodeField } from '../spec';

const ADAPT_MAP: Record<string, (spec: any) => any> = {
  interval: adaptIntervalSpec,
  line: adaptLineSpec,
  point: adaptPointSpec,
  box: adaptBoxSpec,
};

export function appendBestSpec<T extends { type?: string }>(options: T): T {
  const type = options.type || 'interval';
  const adapt = ADAPT_MAP[type];
  if (adapt) {
    return adapt(options) as T;
  }
  return options;
}

export type RenderMarkOptions = RenderMarkBaseOptions & {
  type?: MarkType;
};

type RenderHandler = (canvas: CanvasRenderer, options: RenderMarkBaseOptions) => void;

const RENDER_MAP: Record<MarkType, RenderHandler> = {
  interval: renderInterval,
  line: renderLine,
  point: renderPoint,
  box: renderBox,
};

export function renderMark(canvas: CanvasRenderer, options: RenderMarkOptions): void {
  const markType = options.type ?? 'interval';
  const render = RENDER_MAP[markType];
  if (!render) {
    throw new Error(`Unsupported mark type: ${markType}`);
  }
  render(canvas, options);
}

export type RenderMarkLabelOptions = RenderMarkBaseOptions & {
  type?: MarkType;
  formatDataLabel: (val: any) => string;
  isStacked?: boolean;
  hasDodge?: boolean;
  dodgeCount?: number;
};

type LabelHandler = (options: RenderMarkLabelOptions) => MarkLabelItem[];

const LABEL_MAP: Record<MarkType, LabelHandler> = {
  interval: createIntervalLabelItems,
  line: createLineLabelItems,
  point: createPointLabelItems,
  box: createBoxLabelItems,
};

export function createMarkLabels(options: RenderMarkLabelOptions): MarkLabelItem[] {
  const markType = options.type ?? 'interval';
  const createLabels = LABEL_MAP[markType];
  if (!createLabels) {
    throw new Error(`Unsupported mark type: ${markType}`);
  }
  return createLabels(options);
}
