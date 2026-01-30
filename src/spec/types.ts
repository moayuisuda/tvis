/**
 * Core type definitions, aligned with G2 specification.
 */

// ============ Primitive Types ============

export type Primitive = string | number | boolean | Date | null | undefined;

// ============ Encode ============

export type Encode =
  | Primitive
  | {
      type?: "field" | "constant" | "transform" | "column";
      value?: any;
    };

export type EncodeSpec = Partial<{
  x: Encode;
  y: Encode;
  color: Encode;
}>;

// ============ Transform ============

export type TransformOrder =
  | "series"
  | ((data: Record<string, Primitive>) => Primitive);

export type StackYTransform = {
  type: "stackY";
  groupBy?: string | string[];
  reverse?: boolean;
  orderBy?: TransformOrder;
};

export type DodgeXTransform = {
  type: "dodgeX";
  groupBy?: string | string[];
  reverse?: boolean;
};

export type Transform =
  | StackYTransform
  | DodgeXTransform;

// ============ Scale ============

export type ScaleType =
  | "linear"
  | "ordinal"
  | "band"
  | "point";

export type ScaleSpec = {
  type?: ScaleType;
  domain?: any[];
  range?: any[];
  nice?: boolean;
};

// ============ Coordinate ============

export type CoordinateType = "transpose";

export type TransposeTransform = {
  type: "transpose";
};

export type CoordinateTransform = TransposeTransform;

export type CoordinateSpec = {
  type?: CoordinateType;
  transform?: CoordinateTransform[];
};

// ============ Component ============

export type AxisSpec =
  | {
      tickCount?: number;
      tickValues?: any[];
      grid?: boolean;
      title?: string;
      label?:
        | boolean
        | {
            formatter?: string | ((value: any) => string);
          };
    }
  | false;

export type LegendSpec =
  | {
    }
  | false;

// ============ Mark ============

export type MarkType = "interval" | "line" | "point";

export type BaseMark = {
  type?: MarkType;
  data?: any[];
  encode?: EncodeSpec;
  transform?: Transform[];
  scale?: Partial<{
    x: ScaleSpec;
    y: ScaleSpec;
    color: ScaleSpec;
  }>;
  coordinate?: CoordinateSpec;
  axis?: Partial<{
    x: AxisSpec;
    y: AxisSpec;
  }>;
  legend?: Partial<{
    color: LegendSpec;
    size: LegendSpec;
  }>;
  label?: boolean | { formatter?: string | ((value: any) => string) };
};

export type IntervalMark = BaseMark & {
  type?: "interval";
};

export type LineMark = BaseMark & {
  type?: "line";
};

export type PointMark = BaseMark & {
  type?: "point";
};

export type Mark = IntervalMark | LineMark | PointMark | BaseMark;

// ============ Chart Spec ============

export type ChartSpec = Mark & {
  title?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  colors?: string[];
};

// ============ Render Options ============

export type RenderMode = "ascii" | "color";

export type RenderOptions = {
  mode?: RenderMode;
};
