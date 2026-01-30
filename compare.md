# 终端图表库能力对比

本文档详细对比了本库 (`term-chart`) 与社区主流终端图表库 `termplotlib` (Python) 和 `YouPlot` (Ruby/CLI) 的能力与特性。

## 概览

| 特性 | term-chart (tvis) | termplotlib | YouPlot (uplot) |
| :--- | :--- | :--- | :--- |
| **核心理念** | **声明式 (G2 Grammar)** | **编程式 (Matplotlib-like)** | **命令行管道 (Pipe-friendly)** |
| **开发语言** | TypeScript / Node.js | Python | Ruby |
| **输入格式** | JSON Spec (G2 规范) / Raw Data (CSV/TSV) | Python 对象 (Numpy/Lists) | TSV, CSV, stdin stream |
| **调用方式** | CLI (JSON/Pipe friendly) | Python 脚本引用 | CLI 命令 (Flags 控制) |
| **图表类型** | 柱状图(Interval), 折线图(Line), 散点图(Point) | 折线图, 直方图(横/纵), 条形图 | 条形图, 直方图, 折线图, 散点图, 密度图, 箱线图 |
| **格式化器** | **d3-format** (强大且标准) | Python 字符串格式化 | 基础格式化参数 |
| **配置丰富度** | 高 (基于图形语法的细粒度控制) | 中 (Python 函数参数) | 中 (命令行参数) |
| **外部依赖** | 无 (Node.js 环境) | gnuplot (部分图表需要) | Ruby 环境 |

## 详细对比

### 1. term-chart (本项目)
**定位**：基于图形语法 (G2 Specification) 的终端渲染引擎。适合需要标准化图表描述、集成到 Node.js 工作流或需要精细控制图表元素的场景。

*   **优势**：
    *   **声明式语法**：使用 JSON 描述图表，与 AntV G2/Vega-Lite 理念一致，易于存储、传输和生成。
    *   **管道支持**：支持直接管道输入 Raw Data (CSV/TSV)，自动推断生成图表，体验接近 YouPlot。
    *   **Formatter 强大**：内置集成 `d3-format`，支持丰富的数据格式化能力（如货币、百分比、科学计数法等）。
    *   **易于集成**：作为 npm 包发布，方便 JS/TS 项目调用，也提供 CLI 工具。
    *   **配置灵活**：通过 `encode`, `transform`, `scale` 等概念进行配置，扩展性强。
*   **不足**：
    *   目前支持的图表类型相对较少（核心基础图形）。
    *   对于简单的 shell 脚本快速画图，编写 JSON Spec 可能比简单的 CLI flags 稍显繁琐。

**调用示例**：
```bash
# 通过 JSON 字符串
tvis '{"type":"interval","data":[{"x":"A","y":10}],"encode":{"x":"x","y":"y"}}'

# 通过文件或管道 (JSON)
cat spec.json | tvis

# 通过管道 (Raw Data) - 类似 YouPlot
ls -l | awk '{print $9, $5}' | tvis
echo "A 10\nB 20" | tvis
```

#### CLI 增强功能
`term-chart` 最新版增加了对命令行管道的友好支持：

1.  **自动数据解析**：
    *   **单列数据**：自动视为 Y 轴数值，X 轴为索引。
    *   **多列数据**：第一列为 X 轴，第二列为 Y 轴。
    *   **智能分隔符**：默认支持空白字符，可通过 `-d` 指定。

2.  **快捷参数**：
    *   `-t, --type <type>`: 指定图表类型 (默认为 `interval`，可选 `line`, `point`)。
    *   `-d, --delimiter <char>`: 指定数据分隔符 (如 `,` 处理 CSV)。


### 2. termplotlib
**定位**：Python 用户的终端绘图库，旨在提供类似 Matplotlib 的体验。

*   **优势**：
    *   **Python 生态**：无缝集成 NumPy 等数据科学工具栈。
    *   **API 熟悉**：对习惯 Matplotlib 的用户非常友好。
*   **不足**：
    *   **依赖问题**：绘制折线图等需要安装 `gnuplot`，增加了环境配置成本。
    *   **调用方式**：必须编写 Python 脚本，无法直接在 Shell 管道中通过一行命令快速使用（除非自己封装）。
    *   **图表类型**：主要侧重于统计类图表（直方图）。

**调用示例**：
```python
import termplotlib as tpl
import numpy as np

x = np.linspace(0, 2 * np.pi, 10)
y = np.sin(x)
fig = tpl.figure()
fig.plot(x, y, label="data", width=50, height=15)
fig.show()
```

### 3. YouPlot
**定位**：专为命令行设计的数据可视化工具，强调管道操作和快速预览。

*   **优势**：
    *   **Shell 友好**：极佳的管道支持，适合直接处理 `ls`, `curl`, `awk` 等命令的输出。
    *   **图表丰富**：支持密度图、箱线图等统计图表。
    *   **开箱即用**：参数简单直接，无需编写配置文件。
*   **不足**：
    *   **配置上限**：复杂的自定义（如多轴、特定颜色映射、复杂布局）可能受限于命令行参数。
    *   **依赖环境**：需要 Ruby 环境。
    *   **数据描述**：非结构化输入（CSV/TSV），缺乏对数据类型的严格定义。

**调用示例**：
```bash
curl -sL https://git.io/ISLANDScsv \
| sort -nk2 -t, \
| tail -n15 \
| uplot bar -d, -t "Areas of the World's Major Landmasses"
```

## 总结

*   如果你是 **JS/TS 开发者**，或者需要一个**跨平台、标准配置格式**（JSON Spec）的渲染引擎，`term-chart` 是最佳选择。特别是它对 `d3-format` 的支持，使其在处理商业数据展示时更具优势。
*   如果你是 **Python 数据分析师**，希望在服务器终端快速查看数据分布，`termplotlib` 是自然的选择。
*   如果你是 **运维工程师** 或 **Shell 脚本重度用户**，需要快速分析日志或系统指标，`YouPlot` 的管道流处理方式最为高效。
