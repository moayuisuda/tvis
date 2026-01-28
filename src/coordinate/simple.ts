/**
 * Simple Coordinate System.
 */
export class Coordinate {
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  constructor(options: { x: number; y: number; width: number; height: number }) {
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
  }

  map(point: [number, number]): [number, number] {
    const [nx, ny] = point;
    const w = this.width;
    const h = this.height;
    
    return [nx * w, ny * h];
  }
}
