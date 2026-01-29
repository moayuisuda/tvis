/**
 * Simple Coordinate System.
 */
export class Coordinate {
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private transposed: boolean;

  constructor(options: { x: number; y: number; width: number; height: number; transposed?: boolean }) {
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
    this.transposed = options.transposed ?? false;
  }

  map(point: [number, number]): [number, number] {
    const [nx, ny] = point;
    const w = this.width;
    const h = this.height;

    if (this.transposed) {
      return [ny * w, nx * h];
    }

    return [nx * w, ny * h];
  }
}
