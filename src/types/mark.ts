import { Coordinate } from '../coordinate';
import { Scale } from '../scale';

export type MarkBaseOptions<T> = {
  data: T[];
  xScale: Scale;
  yScale: Scale;
  colorScale: (value: any) => { symbol: string; style?: any };
  coordinate: Coordinate;
  plotX: number;
  plotY: number;
  plotWidth: number;
  plotHeight: number;
  leadingGap: number;
  isTransposed?: boolean;
};

export type MarkBandOptions<T> = MarkBaseOptions<T> & {
  bandGap: number;
};

export type RenderMarkBaseOptions = {
  data: any[];
  xField: string;
  yField: string;
  colorField?: string;
  colorScale: (value: any) => { symbol: string; style?: any };
  xScale: Scale;
  yScale: Scale;
  coordinate: Coordinate;
  plotX: number;
  plotY: number;
  plotWidth: number;
  plotHeight: number;
  leadingGap: number;
  bandGap: number;
  isTransposed?: boolean;
};

export type XYMarkData = {
  x: any;
  y: number;
  color?: any;
};

export type MarkLabelItem = {
  x: number;
  y: number;
  text: string;
  position?: 'top' | 'bottom' | 'middle' | 'left' | 'right';
};
