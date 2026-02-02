import { describe, it, expect } from 'vitest';
import { Chart } from "../src/index";

describe('Robustness', () => {
  it('should not crash when data contains NaN values', () => {
    const data = [
        { x: 'Product', y: NaN },
        { x: 'A', y: 100 },
        { x: 'B', y: 200 }
    ];
    
    expect(() => {
        Chart({
            type: 'interval',
            data,
            encode: { x: 'x', y: 'y' }
        });
    }).not.toThrow();
  });
});
