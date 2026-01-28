/**
 * Coordinate system.
 */

import { Coordinate as SimpleCoordinate } from './simple';
import { CoordinateSpec } from '../spec';

export type Coordinate = SimpleCoordinate;

/**
 * Create coordinate system.
 */
export function createCoordinate(
  x: number,
  y: number,
  width: number,
  height: number,
  spec?: CoordinateSpec
): Coordinate {
  const coord = new SimpleCoordinate({
    x,
    y,
    width,
    height,
  });

  return coord;
}
