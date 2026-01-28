
/**
 * Largest-Triangle-Three-Buckets (LTTB) Downsampling Algorithm.
 * 
 * Adapted from: https://github.com/sveinn-steinarsson/flot-downsample
 * 
 * @param data The original data array.
 * @param xField The field name for x-axis.
 * @param yField The field name for y-axis.
 * @param threshold The target number of data points.
 * @returns The downsampled data array.
 */
export function lttb(data: any[], xField: string, yField: string, threshold: number): any[] {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold === 0) {
    return data;
  }

  const sampled = [];
  let sampledIndex = 0;

  // Bucket size. Leave room for start and end data points
  const every = (dataLength - 2) / (threshold - 2);

  let a = 0;  // Initially a is the first point in the triangle
  let maxAreaPoint;
  let maxArea;
  let area;
  let nextA;

  // Always add the first point
  sampled[sampledIndex++] = data[a];

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (containing c)
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * every) + 1;
    let avgRangeEnd = Math.floor((i + 2) * every) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      const d = data[avgRangeStart];
      // Handle non-numeric x: use index if not number
      const xVal = typeof d[xField] === 'number' ? d[xField] : avgRangeStart;
      const yVal = Number(d[yField]) || 0;
      
      avgX += xVal;
      avgY += yVal;
    }

    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    let rangeOffs = Math.floor((i + 0) * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    // Point a
    const pointADatum = data[a];
    const pointAX = typeof pointADatum[xField] === 'number' ? pointADatum[xField] : a;
    const pointAY = Number(pointADatum[yField]) || 0;

    maxArea = -1;
    maxAreaPoint = data[rangeOffs]; // Default to first point in bucket
    nextA = rangeOffs;

    for (; rangeOffs < rangeTo; rangeOffs++) {
      // Calculate triangle area over three buckets
      const d = data[rangeOffs];
      const xVal = typeof d[xField] === 'number' ? d[xField] : rangeOffs;
      const yVal = Number(d[yField]) || 0;

      area = Math.abs(
        (pointAX - avgX) * (yVal - pointAY) -
        (pointAX - xVal) * (avgY - pointAY)
      );
      
      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[rangeOffs];
        nextA = rangeOffs; // Next a is this b
      }
    }

    sampled[sampledIndex++] = maxAreaPoint;
    a = nextA; // This a is the next a (chosen b)
  }

  // Always add the last point
  sampled[sampledIndex++] = data[dataLength - 1];

  return sampled;
}
