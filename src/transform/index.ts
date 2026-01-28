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

/**
 * Apply data transformations.
 */
export function applyTransforms(context: TransformContext, transforms: Transform[]): any[] {
  let { data } = context;

  for (const transform of transforms) {
    switch (transform.type) {
      case 'stackY':
        data = stackY(data, transform, context.encodeFields);
        break;

      case 'dodgeX':
        data = dodgeX(data, transform, context.encodeFields);
        break;

      default:
        console.warn(`Unsupported transform type: ${(transform as any).type}`);
    }
  }

  return data;
}
