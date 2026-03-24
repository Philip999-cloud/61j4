"""DSL 渲染 LRU 快取：相同 payload 第二次命中。"""
from __future__ import annotations

import unittest
from pathlib import Path
from types import SimpleNamespace

from asea_render_runner import clear_render_cache, render_with_cache

_ROOT = Path(__file__).resolve().parent.parent.parent
_ASSETS = _ROOT / "public" / "asea-svg"


class TestRenderCache(unittest.TestCase):
    def setUp(self) -> None:
        clear_render_cache()

    def tearDown(self) -> None:
        clear_render_cache()

    def test_second_identical_math_request_uses_cache(self):
        body = SimpleNamespace(
            engine="math",
            topic="function_2d",
            data={
                "equations": ["x"],
                "domain": {"x_min": 0, "x_max": 1},
                "features_to_highlight": [],
                "styling": {"grid": False},
            },
            styling={},
            apply_layout=False,
        )
        svg1, c1 = render_with_cache(body, _ASSETS)
        svg2, c2 = render_with_cache(body, _ASSETS)
        self.assertFalse(c1)
        self.assertTrue(c2)
        self.assertEqual(svg1, svg2)
        self.assertIn("<svg", svg1)


if __name__ == "__main__":
    unittest.main()
