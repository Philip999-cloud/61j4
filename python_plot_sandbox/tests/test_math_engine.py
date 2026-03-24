"""SymPy 數學引擎煙霧測試：python -m unittest discover -s tests"""
from __future__ import annotations

import unittest

from engines.math_engine import render_math_function_2d


class TestMathEngine(unittest.TestCase):
    def test_quadratic_roots_vertex_svg(self):
        svg = render_math_function_2d(
            {
                "equations": ["x**2 - 4*x + 3"],
                "domain": {"x_min": -1, "x_max": 5},
                "features_to_highlight": ["roots", "vertex"],
                "styling": {"grid": True, "theme": "light"},
            }
        )
        self.assertIn("<svg", svg)
        self.assertIn("path", svg)

    def test_wide_domain_still_emits_svg(self):
        """極端／寬 domain 壓測：仍須產出合法 SVG（計畫 2.3）。"""
        svg = render_math_function_2d(
            {
                "equations": ["sin(x)"],
                "domain": {"x_min": -50, "x_max": 50},
                "features_to_highlight": [],
                "styling": {"grid": False, "theme": "dark"},
            }
        )
        self.assertIn("<svg", svg)
        self.assertGreater(len(svg), 200)


if __name__ == "__main__":
    unittest.main()
