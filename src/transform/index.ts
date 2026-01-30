/**
 * Transform system.
 */

import { Transform } from '../spec';
import { stackY } from './stackY';
import { dodgeX } from './dodgeX';

export * from './stackY';
export * from './dodgeX';

export type TransformContext = {
  data: any[];
  encodeFields: {
    x?: string;
    y?: string;
    color?: string;
  };
};

const transformHandlers: Record<string, (data: any[], transform: any, encodeFields: any) => any[]> = {
  stackY,
  dodgeX,
};

/**
 * Apply data transformations.
 */
export function applyTransforms(context: TransformContext, transforms: Transform[]): any[] {
  let { data } = context;

  for (const transform of transforms) {
    const handler = transformHandlers[transform.type];
    if (handler) {
      data = handler(data, transform, context.encodeFields);
    } else {
      console.warn(`Unsupported transform type: ${(transform as any).type}`);
    }
  }

  return data;
}
