import { Chart } from "./src/index";

// ============ 数据准备 ============

const basicLineData = [
  { date: "Jan", temperature: 15 },
  { date: "Feb", temperature: 18 },
  { date: "Mar", temperature: 22 },
  { date: "Apr", temperature: 25 },
  { date: "May", temperature: 28 },
  { date: "Jun", temperature: 32 },
  { date: "Jul", temperature: 35 },
  { date: "Aug", temperature: 33 },
  { date: "Sep", temperature: 29 },
  { date: "Oct", temperature: 24 },
  { date: "Nov", temperature: 26 },
  { date: "Dec", temperature: 28 },
];

const multiLineData = [
  { month: "Jan", revenue: 100, category: "Product A" },
  { month: "Feb", revenue: 120, category: "Product A" },
  { month: "Mar", revenue: 150, category: "Product A" },
  { month: "Apr", revenue: 130, category: "Product A" },
  { month: "May", revenue: 170, category: "Product A" },
  { month: "Jun", revenue: 180, category: "Product A" },
  { month: "Jul", revenue: 190, category: "Product A" },
  { month: "Aug", revenue: 175, category: "Product A" },
  { month: "Sep", revenue: 160, category: "Product A" },
  { month: "Oct", revenue: 140, category: "Product A" },
  { month: "Nov", revenue: 125, category: "Product A" },
  { month: "Dec", revenue: 155, category: "Product A" },
  { month: "Jan", revenue: 50, category: "Product B" },
  { month: "Feb", revenue: 55, category: "Product B" },
  { month: "Mar", revenue: 65, category: "Product B" },
  { month: "Apr", revenue: 60, category: "Product B" },
  { month: "May", revenue: 70, category: "Product B" },
  { month: "Jun", revenue: 75, category: "Product B" },
  { month: "Jul", revenue: 80, category: "Product B" },
  { month: "Aug", revenue: 78, category: "Product B" },
  { month: "Sep", revenue: 72, category: "Product B" },
  { month: "Oct", revenue: 68, category: "Product B" },
  { month: "Nov", revenue: 62, category: "Product B" },
  { month: "Dec", revenue: 70, category: "Product B" },
];

const scatterData = [
  // 正相关散点数据：收入与支出
  { height: 10, weight: 12 },
  { height: 15, weight: 18 },
  { height: 18, weight: 20 },
  { height: 22, weight: 25 },
  { height: 25, weight: 28 },
  { height: 28, weight: 32 },
  { height: 30, weight: 35 },
  { height: 33, weight: 38 },
  { height: 35, weight: 40 },
  { height: 38, weight: 42 },
  { height: 40, weight: 45 },
  { height: 42, weight: 48 },
  { height: 45, weight: 50 },
  { height: 48, weight: 52 },
  { height: 50, weight: 55 },
  { height: 52, weight: 58 },
  { height: 55, weight: 60 },
  { height: 58, weight: 62 },
  { height: 60, weight: 65 },
  { height: 62, weight: 68 },
  { height: 65, weight: 70 },
  { height: 68, weight: 72 },
  { height: 70, weight: 75 },
  { height: 72, weight: 78 },
  { height: 75, weight: 80 },
  { height: 78, weight: 82 },
  { height: 80, weight: 85 },
  { height: 82, weight: 88 },
  { height: 85, weight: 90 },
  { height: 88, weight: 92 },
  // 增加一些随机性
  { height: 20, weight: 22 },
  { height: 32, weight: 30 },
  { height: 44, weight: 48 },
  { height: 56, weight: 52 },
  { height: 67, weight: 68 },
  { height: 24, weight: 30 },
  { height: 36, weight: 38 },
  { height: 47, weight: 52 },
  { height: 59, weight: 58 },
  { height: 71, weight: 78 },
  // 离群点
  { height: 15, weight: 85 },
  { height: 85, weight: 15 },
  { height: 50, weight: 25 },
  { height: 30, weight: 75 },
];

const categoryScatterData = [
  // Group A: 年轻群体 - 收入较低但储蓄率高
  { height: 10, weight: 30, gender: "A" },
  { height: 15, weight: 35, gender: "A" },
  { height: 20, weight: 40, gender: "A" },
  { height: 22, weight: 42, gender: "A" },
  { height: 25, weight: 45, gender: "A" },
  { height: 28, weight: 48, gender: "A" },
  { height: 30, weight: 50, gender: "A" },
  { height: 32, weight: 52, gender: "A" },
  { height: 35, weight: 55, gender: "A" },
  { height: 38, weight: 58, gender: "A" },
  { height: 18, weight: 38, gender: "A" },
  { height: 27, weight: 46, gender: "A" },
  { height: 33, weight: 53, gender: "A" },
  { height: 23, weight: 43, gender: "A" },
  { height: 29, weight: 49, gender: "A" },

  // Group B: 中年群体 - 收入与储蓄成正比
  { height: 40, weight: 42, gender: "B" },
  { height: 45, weight: 48, gender: "B" },
  { height: 50, weight: 52, gender: "B" },
  { height: 52, weight: 55, gender: "B" },
  { height: 55, weight: 58, gender: "B" },
  { height: 58, weight: 60, gender: "B" },
  { height: 60, weight: 62, gender: "B" },
  { height: 62, weight: 65, gender: "B" },
  { height: 65, weight: 68, gender: "B" },
  { height: 68, weight: 70, gender: "B" },
  { height: 48, weight: 50, gender: "B" },
  { height: 54, weight: 56, gender: "B" },
  { height: 59, weight: 61, gender: "B" },
  { height: 63, weight: 66, gender: "B" },
  { height: 67, weight: 69, gender: "B" },

  // Group C: 高收入群体 - 储蓄增长放缓
  { height: 70, weight: 72, gender: "C" },
  { height: 72, weight: 74, gender: "C" },
  { height: 75, weight: 76, gender: "C" },
  { height: 78, weight: 78, gender: "C" },
  { height: 80, weight: 80, gender: "C" },
  { height: 82, weight: 82, gender: "C" },
  { height: 85, weight: 83, gender: "C" },
  { height: 88, weight: 85, gender: "C" },
  { height: 90, weight: 86, gender: "C" },
  { height: 92, weight: 88, gender: "C" },
  { height: 74, weight: 75, gender: "C" },
  { height: 77, weight: 77, gender: "C" },
  { height: 83, weight: 81, gender: "C" },
  { height: 87, weight: 84, gender: "C" },
  { height: 91, weight: 87, gender: "C" },

  // 离群点
  { height: 20, weight: 75, gender: "A" },
  { height: 50, weight: 25, gender: "B" },
  { height: 80, weight: 40, gender: "C" },
  { height: 35, weight: 80, gender: "A" },
  { height: 70, weight: 35, gender: "C" },
];

const intervalData = [
  { month: "Jan", sales: 100 },
  { month: "Feb", sales: 120 },
  { month: "Mar", sales: 150 },
  { month: "Apr", sales: 130 },
  { month: "May", sales: 170 },
  { month: "Jun", sales: 140 },
  { month: "Jul", sales: 160 },
];

const dodgeData = [
  { category: "A", value: 100, type: "X" },
  { category: "A", value: 80, type: "Y" },
  { category: "A", value: 60, type: "Z" },
  { category: "B", value: 120, type: "X" },
  { category: "B", value: 90, type: "Y" },
  { category: "B", value: 70, type: "Z" },
  { category: "C", value: 90, type: "X" },
  { category: "C", value: 110, type: "Y" },
  { category: "C", value: 85, type: "Z" },
];

const stackData = [
  { month: "Jan", value: 100, type: "A" },
  { month: "Jan", value: 40, type: "B" },
  { month: "Feb", value: 80, type: "A" },
  { month: "Feb", value: 30, type: "B" },
  { month: "Mar", value: 120, type: "A" },
  { month: "Mar", value: 60, type: "B" },
  { month: "Apr", value: 70, type: "A" },
  { month: "Apr", value: 30, type: "B" },
  { month: "May", value: 50, type: "A" },
  { month: "May", value: 20, type: "B" },
];

// ============ 1. 折线图 ============

console.log("========================================");
console.log("1. 折线图（Line）");
console.log("========================================\n");

console.log(
  Chart({
    colors: ["#28a745", "#dc3545"],
    type: "line",
    data: basicLineData,
    label: true,
    encode: {
      x: "date",
      y: "temperature",
      color: "temperature",
    },
  }),
);

// ascii 模式，用于不支持颜色输出的终端
console.log(
  Chart({
    type: "line",
    data: basicLineData,
    label: true,
    encode: {
      x: "date",
      y: "temperature",
    },
    mode: "ascii",
  }),
);

// ============ 2. 多系列折线图 ============

console.log("\n\n========================================");
console.log("2. 多系列折线图（Multi-series Line）");
console.log("========================================\n");

console.log(
  Chart({
    title: "Monthly Revenue",
    type: "line",
    data: multiLineData,
    encode: {
      x: "month",
      y: "revenue",
      color: "category",
    },
  }),
);

// ============ 3. 散点图 ============

console.log("\n\n========================================");
console.log("3. 散点图（Point）");
console.log("========================================\n");

console.log(
  Chart({
    type: "point",
    label: true,
    data: scatterData,
    encode: {
      x: "height",
      y: "weight",
    },
  }),
);

console.log("\n3.3 散点图 - 连续颜色 (Linear Color)");
console.log(
  Chart({
    colors: ["#28a745", "#dc3545"],
    type: "point",
    data: scatterData,
    encode: {
      x: "height",
      y: "weight",
      color: "weight",
    },
  }),
);
console.log(
  Chart({
    colors: ["#28a745", "#dc3545"],
    type: "point",
    data: scatterData,
    encode: {
      x: "height",
      y: "weight",
      color: "weight",
    },
    mode: "ascii",
  }),
);

// ============ 4. 分类散点图 ============

console.log("\n\n========================================");
console.log("4. 分类散点图（Categorical Point）");
console.log("========================================\n");

console.log(
  Chart({
    type: "point",
    data: categoryScatterData,
    encode: {
      x: "height",
      y: "weight",
    },
  }),
);

// ============ 5. 柱状图 ============

console.log("\n\n========================================");
console.log("5. 柱状图（Interval）");
console.log("========================================\n");

console.log(
  Chart({
    colors: ["#28a745", "#dc3545"],
    type: "interval",
    data: intervalData,
    encode: {
      x: "month",
      y: "sales",
      color: "sales",
    },
    mode: "ascii",
  }),
);

console.log("\n5.1 柱状图 - 转置");
console.log(
  Chart({
    colors: ["#28a745", "#dc3545"],
    type: "interval",
    data: intervalData,
    encode: {
      x: "month",
      y: "sales",
      color: "sales",
    },
    coordinate: {
      type: "transpose",
    },
    axis: {
      y: {
        title: "Value",
      },
      x: {
        title: "Month",
      },
    },
  }),
);

// ============ 6. DodgeX 分组柱状图 ============

console.log("\n\n========================================");
console.log("6. DodgeX 分组柱状图（Dodged Interval）");
console.log("========================================\n");

console.log(
  Chart({
    // colors: ["#28a745", "#dc3545"],
    type: "interval",
    data: dodgeData,
    encode: {
      x: "category",
      y: "value",
      color: "type",
    },
    transform: [{ type: "dodgeX" }],
  }),
);

console.log("\n6.1 DodgeX 分组柱状图 - 转置");
console.log(
  Chart({
    colors: ["#28a745", "#dc3545"],
    type: "interval",
    data: dodgeData,
    encode: {
      x: "category",
      y: "value",
      color: "value",
    },
    transform: [{ type: "dodgeX" }],
    coordinate: {
      type: "transpose",
    },
    axis: {
      y: {
        title: "Value",
      },
      x: {
        title: "Category",
      },
    },
  }),
);

console.log("\n\n========================================");
console.log("7. StackY 堆叠柱状图（Stacked Interval）");
console.log("========================================\n");

console.log(
  Chart({
    type: "interval",
    data: stackData,
    title: "Stacked Interval",
    encode: {
      x: "month",
      y: "value",
      color: "type",
    },
    axis: {
      x: {
        title: "Month",
      },
      y: {
        label: { formatter: (v) => v + "¥" },
      },
    },
    transform: [{ type: "stackY" }],
  }),
);

console.log("\n\n========================================");
console.log("8. d3-format 格式化 测试");
console.log("========================================\n");

console.log(
  Chart({
    type: "interval",
    data: [
      { name: "A", value: 0.12345 },
      { name: "B", value: 0.98765 },
      { name: "C", value: 0.5 },
    ],
    encode: {
      x: "name",
      y: "value",
    },
    label: { formatter: ".1%" },
    axis: {
      y: {
        label: { formatter: ".2f" },
      },
    },
  }),
);
