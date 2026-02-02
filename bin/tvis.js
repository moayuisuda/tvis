#!/usr/bin/env node

const fs = require('fs');
const { Chart } = require('../lib/index');

// Built-in demo.
const DEMO_SPEC = {
  type: 'interval',
  data: [
    { date: 'Jan 12', temperature: 15 },
    { date: 'Jan 13', temperature: 14 },
    { date: 'Jan 14', temperature: 18 },
    { date: 'Jan 15', temperature: 16 },
    { date: 'Jan 16', temperature: 17 },
    { date: 'Jan 17', temperature: 18 },
    { date: 'Jan 18', temperature: 16 },
    { date: 'Jan 19', temperature: 11 },
    { date: 'Jan 20', temperature: 8 },
  ],
  encode: {
    x: 'date',
    y: 'temperature',
  },
};

function printUsage() {
  console.log(`
tvis - Terminal chart renderer with G2 spec

Usage:
  tvis [options] [spec-json | spec-file | -]
  cat data.txt | tvis [options]

Arguments:
  spec-json     JSON string of G2 spec
  spec-file     Path to JSON file containing G2 spec
  -             (Optional) Explicitly read spec from stdin

Options:
  --help            Show this help message
  --type <type>     Chart type (interval, line, point). Default: interval
  --delimiter <char> Delimiter for raw data input. Default: whitespace
  --transpose       Transpose the chart (swap X and Y axis)

Examples:
  # Use built-in demo
  tvis
  
  # Render from JSON file
  tvis spec.json
  
  # Render from JSON string
  tvis '{"type":"interval","data":[...],"encode":{...}}'
  
  # Render from stdin (JSON)
  cat spec.json | tvis
  
  # Render from stdin (Raw Data)
  # 2 columns: x y
  echo "A 10\\nB 20" | tvis
  
  # 1 column: y (x will be index)
  seq 1 10 | tvis --type line
  
  # Custom delimiter
  echo "A,10\\nB,20" | tvis --delimiter ,

Note:
  If input is not valid JSON, tvis attempts to parse it as raw data.
  - 1 column: treated as Y values, X is index.
  - 2+ columns: 1st column is X, 2nd column is Y.
`);
}

function parseArgs(args) {
  const options = {
    type: 'interval',
    delimiter: undefined,
    transpose: false,
    help: false,
    specArg: null
  };
  


  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-t' || arg === '--type') {
      options.type = args[++i];
    } else if (arg === '-d' || arg === '--delimiter') {
      options.delimiter = args[++i];
    } else if (arg === '--transpose') {
      options.transpose = true;
    } else if (arg === '-') {
      options.specArg = '-';
    } else if (!arg.startsWith('-')) {
      if (!options.specArg) options.specArg = arg;
    }
  }
  return options;
}

function parseRawData(content, options) {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return null;

  // Detect column count from first line
  const firstParts = options.delimiter 
      ? lines[0].split(options.delimiter) 
      : lines[0].trim().split(/\s+/);
  
  const isSingleColumn = firstParts.length === 1;

  const data = lines.map((line, index) => {
     // Skip empty lines
     if (!line.trim()) return null;

     const parts = options.delimiter 
      ? line.split(options.delimiter) 
      : line.trim().split(/\s+/);
      
     if (isSingleColumn) {
         return { x: String(index), y: Number(parts[0]) };
     } else {
         return { x: parts[0], y: Number(parts[1]) };
     }
  }).filter(d => d !== null);

  // Auto-detect header: if first row Y is NaN but second row Y is number, assume header.
  let header = null;
  if (data.length > 1 && isNaN(data[0].y) && !isNaN(data[1].y)) {
      header = data.shift();
  }

  const spec = {
    type: options.type || 'interval',
    data,
    encode: { x: 'x', y: 'y' },
    axis: header ? {
        x: { title: header.x },
        y: { title: String(header.y) === 'NaN' ? '' : String(header.y) }
    } : undefined,
    coordinate: options.transpose ? { type: 'transpose' } : undefined
  };
  
  // If we have a header, override axis titles.
  if (header && spec.axis) {
      const firstLineParts = options.delimiter 
        ? lines[0].split(options.delimiter) 
        : lines[0].trim().split(/\s+/);
      
      if (firstLineParts.length > 1) {
          spec.axis.y.title = firstLineParts[1];
      }
  }

  return spec;
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Check for help flag.
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const specArg = options.specArg;
  let spec;

  // Helper to read from stdin
  const readStdin = async () => {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  };

  // Determine source
  if (specArg === '-' || (!specArg && !process.stdin.isTTY)) {
    // Read from stdin.
    const content = await readStdin();
    if (!content.trim()) {
       if (specArg === '-') {
         console.error('Error: Empty input from stdin');
         process.exit(1);
       } else {
         // Implicit stdin but empty... treat as no input -> Demo
         spec = DEMO_SPEC;
       }
    } else {
      try {
        spec = JSON.parse(content);
      } catch (err) {
        // Fallback to raw data parsing
        try {
            spec = parseRawData(content, options);
            if (!spec) throw new Error("Empty data");
        } catch (rawErr) {
            console.error('Error: Failed to parse input as JSON or Raw Data');
            console.error('JSON Error:', err.message);
            console.error('Raw Data Error:', rawErr.message);
            process.exit(1);
        }
      }
    }
  } else if (!specArg) {
    // Use built-in demo.
    spec = DEMO_SPEC;
  } else if (specArg.trim().startsWith('{') || specArg.trim().startsWith('[')) {
    // Direct JSON string input.
    try {
      spec = JSON.parse(specArg);
    } catch (err) {
      console.error('Error: Invalid JSON string');
      console.error(err.message);
      console.error('\nTip: Make sure to quote the JSON string, e.g.:');
      console.error('  tvis \'{"type":"interval",...}\'');
      process.exit(1);
    }
  } else {
    // Read from file.
    try {
      if (!fs.existsSync(specArg)) {
        console.error(`Error: File not found: ${specArg}`);
        process.exit(1);
      }
      const content = fs.readFileSync(specArg, 'utf-8');
      try {
        spec = JSON.parse(content);
      } catch (e) {
         // Fallback to raw data parsing for file
         spec = parseRawData(content, options);
      }
    } catch (err) {
      console.error(`Error reading file: ${specArg}`);
      console.error(err.message);
      process.exit(1);
    }
  }

  // Validate spec.
  if (!spec.type) {
    console.error('Error: Spec must have a "type" field (e.g., "interval", "line", "point")');
    process.exit(1);
  }
  if (!spec.data || !Array.isArray(spec.data)) {
    console.error('Error: Spec must have a "data" field as an array');
    process.exit(1);
  }
  if (!spec.encode || !spec.encode.x || !spec.encode.y) {
    console.error('Error: Spec must have "encode.x" and "encode.y" fields');
    process.exit(1);
  }

  // Render chart.
  try {
    const chart = Chart(spec);
    console.log(chart);
  } catch (err) {
    console.error('Error rendering chart:', err.message);
    if (err.stack) {
      console.error('\nStack trace:');
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
