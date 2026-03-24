"""簡易 SVG 文字 bbox 碰撞避讓與指引線（軸對齊）。"""
from __future__ import annotations

from lxml import etree

SVG_NS = "http://www.w3.org/2000/svg"


def _q(tag: str) -> str:
    return f"{{{SVG_NS}}}{tag}"


def _text_boxes(root: etree._Element) -> list[tuple[etree._Element, float, float, float, float]]:
    """回傳 (element, x, y, w, h) — y 為文字基線近似，h 為字高。"""
    boxes: list[tuple[etree._Element, float, float, float, float]] = []
    for el in root.iter():
        if el.tag != _q("text"):
            continue
        try:
            x = float(el.get("x", "0"))
            y = float(el.get("y", "0"))
        except ValueError:
            continue
        fs_raw = el.get("font-size") or "11"
        try:
            fs = float(fs_raw.replace("px", "").strip())
        except ValueError:
            fs = 11.0
        text = "".join(el.itertext()).strip() or "."
        w = max(24.0, len(text) * fs * 0.58)
        h = fs * 1.25
        boxes.append((el, x, y - h, w, h))
    return boxes


def _overlap(
    a: tuple[float, float, float, float], b: tuple[float, float, float, float]
) -> bool:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by


def apply_simple_label_layout(svg: str, pad: float = 6.0, step: float = 14.0) -> str:
    if not svg or "<text" not in svg:
        return svg
    try:
        root = etree.fromstring(svg.encode("utf-8"))
    except etree.XMLSyntaxError:
        return svg

    boxes = _text_boxes(root)
    rects = [(bx[1], bx[2], bx[3], bx[4]) for bx in boxes]

    for i, (el, x, y, w, h) in enumerate(boxes):
        rect = (x - pad, y - pad, w + 2 * pad, h + 2 * pad)
        for j, other in enumerate(rects):
            if i == j:
                continue
            ox, oy, ow, oh = other
            orect = (ox - pad, oy - pad, ow + 2 * pad, oh + 2 * pad)
            if not _overlap(
                (rect[0], rect[1], rect[2], rect[3]),
                (orect[0], orect[1], orect[2], orect[3]),
            ):
                continue
            # 嘗試垂直推移
            new_y = y
            for _ in range(12):
                new_y -= step
                rect_try = (x - pad, new_y - pad, w + 2 * pad, h + 2 * pad)
                ok = True
                for k, (ox2, oy2, ow2, oh2) in enumerate(rects):
                    if k == i:
                        continue
                    o2 = (ox2 - pad, oy2 - pad, ow2 + 2 * pad, oh2 + 2 * pad)
                    if _overlap(
                        (rect_try[0], rect_try[1], rect_try[2], rect_try[3]),
                        (o2[0], o2[1], o2[2], o2[3]),
                    ):
                        ok = False
                        break
                if ok:
                    break
            dy = new_y - y
            if abs(dy) < 1e-6:
                continue
            old_ty = float(el.get("y", "0"))
            el.set("y", str(old_ty + dy))
            # 指引線：從原基線附近到新位置左側
            parent = el.getparent()
            if parent is None:
                continue
            x1, y1 = x + w * 0.2, old_ty
            x2, y2 = x, old_ty + dy
            path = etree.Element(_q("path"))
            path.set(
                "d",
                f"M {x1:.1f},{y1:.1f} L {x2 - 2:.1f},{y2 - h * 0.3:.1f}",
            )
            path.set("fill", "none")
            path.set("stroke", "#64748b")
            path.set("stroke-width", "0.6")
            path.set("opacity", "0.85")
            idx = parent.index(el)
            parent.insert(idx, path)

    out = etree.tostring(root, encoding="unicode", xml_declaration=False)
    return out
