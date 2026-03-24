"""
ASEA /api/v1/render 同步渲染、LRU 快取與請求體大小檢查（供 async 逾時包裝）。
"""
from __future__ import annotations

import hashlib
import json
import os
import threading
from collections import OrderedDict
from time import time
from typing import Any, Protocol

from fastapi import HTTPException

from engines.bio_engine import render_biology
from engines.chem_engine import render_chemistry_2d
from engines.layout_svg import apply_simple_label_layout
from engines.math_engine import render_math_function_2d

# --- 環境變數（可於部署時覆寫）---
MAX_PAYLOAD_BYTES = int(os.environ.get("ASEA_RENDER_MAX_PAYLOAD_BYTES", "49152"))
CACHE_MAX_ENTRIES = int(os.environ.get("ASEA_RENDER_CACHE_MAX", "512"))
CACHE_TTL_SEC = float(os.environ.get("ASEA_RENDER_CACHE_TTL_SEC", "3600"))

_cache_lock = threading.Lock()
_cache: OrderedDict[str, tuple[str, float]] = OrderedDict()


class _RenderBody(Protocol):
    engine: str
    topic: str
    data: dict[str, Any]
    styling: dict[str, Any]
    apply_layout: bool


def validate_body_size(body: _RenderBody) -> None:
    try:
        raw = json.dumps(
            {
                "engine": body.engine,
                "topic": body.topic,
                "data": body.data,
                "styling": body.styling,
                "apply_layout": body.apply_layout,
            },
            sort_keys=True,
            default=str,
        )
    except (TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"invalid render payload: {e}") from e
    n = len(raw.encode("utf-8"))
    if n > MAX_PAYLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"render payload too large ({n} bytes, max {MAX_PAYLOAD_BYTES})",
        )


def cache_key(body: _RenderBody) -> str:
    canonical = json.dumps(
        {
            "engine": body.engine,
            "topic": body.topic,
            "data": body.data,
            "styling": body.styling,
            "apply_layout": body.apply_layout,
        },
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def cache_get(key: str) -> str | None:
    now = time()
    with _cache_lock:
        if key not in _cache:
            return None
        svg, ts = _cache[key]
        if now - ts > CACHE_TTL_SEC:
            del _cache[key]
            return None
        _cache.move_to_end(key)
        return svg


def cache_set(key: str, svg: str) -> None:
    with _cache_lock:
        _cache[key] = (svg, time())
        _cache.move_to_end(key)
        while len(_cache) > CACHE_MAX_ENTRIES:
            _cache.popitem(last=False)


def clear_render_cache() -> None:
    """測試或維運用：清空記憶體快取。"""
    with _cache_lock:
        _cache.clear()


def sync_render_asea(body: _RenderBody, svg_assets_dir: Any) -> str:
    """不含快取；拋 ValueError / RuntimeError / FileNotFoundError 等由路由轉 HTTP。"""
    data = {**body.data}
    if body.styling:
        data.setdefault("styling", {**data.get("styling", {}), **body.styling})

    svg: str | None = None

    if body.engine == "math":
        if body.topic not in ("function_2d", "plot_2d", "math"):
            raise ValueError(f"unsupported math topic: {body.topic}")
        merged = {**data}
        if "styling" not in merged and body.styling:
            merged["styling"] = body.styling
        svg = render_math_function_2d(merged)

    elif body.engine == "chemistry":
        if body.topic not in ("molecular_structure", "chem_2d", "chemistry"):
            raise ValueError(f"unsupported chemistry topic: {body.topic}")
        svg = render_chemistry_2d(data)

    elif body.engine == "biology":
        if body.topic not in (
            "physiology_feedback_loop",
            "bio_template",
            "biology",
        ):
            raise ValueError(f"unsupported biology topic: {body.topic}")
        svg_assets_dir.mkdir(parents=True, exist_ok=True)
        svg = render_biology(data, svg_assets_dir)

    elif body.engine == "physics":
        raise ValueError(
            "PHYSICS_NOT_SUPPORTED: use client free_body_diagram + environment.inclined_plane"
        )
    else:
        raise ValueError(f"unknown engine: {body.engine}")

    if svg and body.apply_layout:
        svg = apply_simple_label_layout(svg)
    return svg


def render_with_cache(body: _RenderBody, svg_assets_dir: Any) -> tuple[str, bool]:
    """
    回傳 (svg, from_cache)。
    physics 引擎會拋 ValueError 含 PHYSICS_NOT_SUPPORTED。
    """
    key = cache_key(body)
    hit = cache_get(key)
    if hit is not None:
        return hit, True
    svg = sync_render_asea(body, svg_assets_dir)
    cache_set(key, svg)
    return svg, False
