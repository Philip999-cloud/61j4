"""Layout agent：重疊文字 fixture（計畫 2.3 壓測／golden smoke）。"""
from __future__ import annotations

import unittest

from engines.layout_svg import apply_simple_label_layout

_OVERLAP_SVG = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">
  <text x="40" y="40" font-size="12">LabelA</text>
  <text x="42" y="38" font-size="12">LabelB</text>
</svg>
"""


class TestLayoutSvg(unittest.TestCase):
    def test_apply_layout_returns_svg(self):
        out = apply_simple_label_layout(_OVERLAP_SVG)
        self.assertIn("<svg", out)
        self.assertIn("text", out)

    def test_passthrough_without_text(self):
        s = "<svg xmlns='http://www.w3.org/2000/svg'></svg>"
        self.assertEqual(apply_simple_label_layout(s), s)


if __name__ == "__main__":
    unittest.main()
