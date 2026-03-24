"""預製 SVG 母版 + 依 DSL 切換圖層。"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from lxml import etree

SVG_NS = "http://www.w3.org/2000/svg"


def _q(tag: str) -> str:
    return f"{{{SVG_NS}}}{tag}"


def render_biology(data: dict[str, Any], assets_dir: Path) -> str:
    base = str(data.get("base_template") or "").strip()
    if not base or ".." in base or base.startswith("/"):
        raise ValueError("invalid base_template")
    path = (assets_dir / base).resolve()
    if not str(path).startswith(str(assets_dir.resolve())):
        raise ValueError("path escape")
    if not path.is_file():
        raise FileNotFoundError(f"Bio template not found: {base}")

    tree = etree.parse(str(path))
    root = tree.getroot()
    states: dict[str, Any] = data.get("dynamic_states") or {}

    def _g_by_id(r: etree._Element, gid: str) -> etree._Element | None:
        for el in r.iter(_q("g")):
            if el.get("id") == gid:
                return el
        return None

    beta = states.get("pancreas_beta_cells")
    if isinstance(beta, dict):
        if beta.get("status") == "secreting":
            for gid in ("insulin_flow", "layer_insulin"):
                g = _g_by_id(root, gid)
                if g is not None:
                    g.set("display", "inline")
                    intensity = beta.get("intensity")
                    if intensity is not None:
                        try:
                            g.set("opacity", str(max(0.0, min(1.0, float(intensity)))))
                        except (TypeError, ValueError):
                            pass

    liver = states.get("liver_cells")
    if isinstance(liver, dict) and liver.get("action"):
        g = _g_by_id(root, "layer_liver_active")
        if g is not None:
            g.set("display", "inline")

    bg = states.get("blood_glucose_level")
    if bg == "high":
        el = _g_by_id(root, "layer_glucose_high")
        if el is not None:
            el.set("display", "inline")

    return etree.tostring(root, encoding="unicode", xml_declaration=False)
