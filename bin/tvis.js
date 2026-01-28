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
  tvis [spec-json | spec-file | -]

Arguments:
  spec-json     JSON string of G2 spec
  spec-file     Path to JSON file containing G2 spec
  -             Read spec from stdin

Options:
  -h, --help    Show this help message

Examples:
  # Use built-in demo
  tvis
  
  # Render from JSON file
  tvis spec.json
  
  # Render from JSON string
  tvis '{"type":"interval","data":[...],"encode":{...}}'
  
  # Render from stdin
  cat spec.json | tvis -
  echo '{"type":"line",...}' | tvis -

Note:
  All options (mode, transform, coordinate, etc.) should be specified in the spec JSON.
`);
}

async function main() {
  const args = process.argv.slice(2);

  // Check for help flag.
  if (args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  const specArg = args[0];
  let spec;

  // Read spec.
  if (!specArg) {
    // Use built-in demo.
    spec = DEMO_SPEC;
  } else if (specArg === '-') {
    // Read from stdin.
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks).toString('utf-8');
    try {
      spec = JSON.parse(content);
    } catch (err) {
      console.error('Error: Invalid JSON from stdin');
      console.error(err.message);
      process.exit(1);
    }
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
      spec = JSON.parse(content);
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
