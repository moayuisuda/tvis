<div align="center">
  <h1 align="center">@antv/tvis</h1>
  <p align="center">📊 Terminal chart renderer with G2 spec support</p>
  <p align="center">
    <a href="https://www.npmjs.com/package/@antv/tvis">
      <img src="https://img.shields.io/npm/v/@antv/tvis?style=flat-square" alt="NPM Version">
    </a>
    <a href="https://www.npmjs.com/package/@antv/tvis">
      <img src="https://img.shields.io/npm/dm/@antv/tvis?style=flat-square" alt="NPM Downloads">
    </a>
    <a href="./LICENSE">
      <img src="https://img.shields.io/npm/l/@antv/tvis?style=flat-square" alt="License">
    </a>
  </p>
  <img src="https://mdn.alipayobjects.com/huamei_qa8qxu/afts/img/A*gg3yRIwoXpcAAAAAQYAAAAgAemJ7AQ/original" alt="Demo" width="400" />
</div>

<br />

**tvis** is a powerful terminal chart rendering tool that allows you to visualize data directly in your command line. It supports both ASCII and color modes, and is compatible with G2 data specifications, making data analysis clear and intuitive right in your terminal.

## ✨ Features

- 🎨 **Dual Rendering Modes**: Supports both plain text ASCII and high-light color block rendering, adapting to different terminal environments.
- 📊 **Multiple Chart Types**: Built-in support for Interval (Bar), Line, and Point (Scatter) charts.
- 🔄 **Data Transforms**: Supports data stacking (`StackY`) and grouping (`DodgeX`), easily handling complex data.
- 📐 **Flexible Coordinates**: Supports coordinate transposition (`Transpose`), allowing free switching between horizontal and vertical layouts.
- 🛠 **Formatting**: Supports D3 formatting templates for customizing axis labels and data labels.
- 💻 **CLI & API**: Can be used as a command-line tool via pipes or integrated into projects as a JS library.

## 📦 Installation

### Global Installation (CLI Tool)

```bash
npm install -g @antv/tvis
```

### Project Dependency (JS Library)

```bash
npm install @antv/tvis
```

## 🚀 Usage

### Command Line Interface (CLI)

Pass JSON configuration directly:

```bash
tvis '{
  "type": "interval",
  "data": [
    { "category": "A", "value": 10 },
    { "category": "B", "value": 20 }
  ],
  "encode": {
    "x": "category",
    "y": "value"
  }
}'
```

Support for Pipe operations:

```bash
# Read from file
cat ./spec.json | tvis

# Process raw data (default whitespace delimiter)
echo "A 10\nB 20" | tvis

# Process CSV data
echo "Product,Sales\nA,100\nB,200" | tvis --delimiter , --transpose
```

#### CLI Options

| Option | Description | Default |
| :--- | :--- | :--- |
| `--help` | Show help message | `false` |
| `--type` | Chart type (`interval`, `line`, `point`) | `interval` |
| `--delimiter` | Delimiter for raw data input | whitespace |
| `--transpose` | Transpose the chart (swap X/Y axis) | `false` |

### Code Integration (JS API)

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

## 📖 Configuration

Supported configuration options:

- **type**: Chart type `"interval" | "line" | "point"`
- **data**: Data array `Array<Object>`
- **encode**: Field mapping
  - `x`: x-axis field name
  - `y`: y-axis field name
  - `color`: Color mapping field (optional)
- **transform**: Data transformation
  - `{ type: "stackY" }`: Stack
  - `{ type: "dodgeX" }`: Group
- **coordinate**: Coordinate system
  - `{ type: "transpose" }`: Transpose
- **axis**: Axis configuration
  - `x`, `y`: `{ title?: string, label?: { formatter?: string } }`
- **label**: Data label
  - `{ formatter?: string }`
- **legend**: Legend configuration
  - `{ color?: false }` (Hide legend)
- **title**: Chart title
- **colors**: Custom color array `string[]`
- **mode**: Rendering mode `"ascii" | "color"`

## 💡 Examples

### Bar Chart (Transposed)

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

### Scatter Plot (Custom Colors)

```bash
tvis '{
  "type": "point",
  "colors": ["#28a745", "#dc3545"],
  "data": [
    { "height": 172, "weight": 63 },
    { "height": 180, "weight": 75 }
  ],
  "encode": {
    "x": "height",
    "y": "weight",
    "color": "weight"
  }
}'
```

## 💻 Development

```bash
# Install dependencies
npm install

# Build project
npm run build

# Development mode
npm run dev

# Run tests
npm test
```

---