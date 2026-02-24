#!/usr/bin/env python3
import subprocess

subprocess.run(["tvis", '''{
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
    "formatter": ".1~f"
  },
  "encode": {
    "x": "category",
    "y": "value",
    "color": "category"
  }
}'''], check=True)
