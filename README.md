# @antv/tvis

📊 Terminal chart renderer with G2 spec support.
![alt text](https://mdn.alipayobjects.com/huamei_qa8qxu/afts/img/A*gg3yRIwoXpcAAAAAQYAAAAgAemJ7AQ/original)

## Installation

```bash
# install the CLI globally
npm install -g @antv/tvis

# install the library locally
npm install @antv/tvis
```

## Usage

### CLI

```bash
tvis '{
  "type": "interval",
  "data": [
    { "category": "A", "value": 10, "type": "X" },
    { "category": "A", "value": 8, "type": "Y" },
    { "category": "B", "value": 12.23, "type": "X" },
    { "category": "B", "value": 9, "type": "Y" },
    { "category": "C", "value": 4, "type": "X" },
    { "category": "C", "value": 2, "type": "Y" }
  ],
  "axis": {
    "y": {
      "title": "Sales",
      "label": {
        "formatter": "$.1f"
      }
    },
    "x": {
      "title": "Category"
    }
  },
  "label": {
    "formatter": "~.1f"
  },
  "encode": {
    "x": "category",
    "y": "value",
    "color": "value"
  }
}'

tvis ./spec.json

cat ./spec.json | tvis -
```

### JS API

```ts
import { Chart } from "@antv/tvis";

const output = Chart({
  type: "interval",
  data: [
    { month: "Jan", sales: 100 },
    { month: "Feb", sales: 120 },
    { month: "Mar", sales: 150 },
  ],
  encode: {
    x: "month",
    y: "sales",
  },
});

console.log(output);
```

## Supported Options

- type: "interval" | "line" | "point"
- data: Array
- encode:
  - x: field name
  - y: field name
  - color: field name (optional, discrete/continuous)
- transform:
  - { type: "stackY" }
  - { type: "dodgeX" }
- coordinate:
  - { type: "transpose" }
- axis:
  - { x?: AxisSpec, y?: AxisSpec }
  - AxisSpec: { title?: string, label?: boolean | { formatter?: string | ((v: string | number) => string) } }
- label: boolean | { formatter?: string | ((v: string | number) => string) }
- legend: { color?: false }
- title: string
- colors: string[]
- mode: "ascii" | "color"

## Examples

### Transpose (bar chart)

```bash
tvis '{
  "type": "interval",
  "data": [
    { "month": "Jan", "sales": 100 },
    { "month": "Feb", "sales": 120 },
    { "month": "Mar", "sales": 150 }
  ],
  "encode": {
    "x": "month",
    "y": "sales"
  },
  "coordinate": {
    "type": "transpose"
  }
}'
```

### Linear Scale

```bash
tvis '{
  "type": "point",
  "colors": ["#28a745", "#dc3545"],
  "data": [
    { "height": 85, "weight": 44 },
    { "height": 172, "weight": 63 },
    { "height": 180, "weight": 150 },
    { "height": 180, "weight": 75 },
    { "height": 188, "weight": 86 },
    { "height": 20, "weight": 12 }
  ],
  "encode": {
    "x": "height",
    "y": "weight",
    "color": "weight"
  }
}'
```

## Development

```bash
npm install
npm run build
npm run dev
npm test
```

## Features

- ✅ **Dual Rendering Modes**: Supports ASCII and Color terminal rendering
- ✅ **Multiple Chart Types**: interval, line, point
- ✅ **Data Transforms**: stackY (stacked), dodgeX (grouped side-by-side)
- ✅ **Coordinate Transpose**: coordinate.type = "transpose"
- ✅ **Formatter**: Customize axis and label formats with d3 string templates
