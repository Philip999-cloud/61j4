"""
ASEA STEM：3D/2D 數學函數 Matplotlib 沙箱 API + /api/v1/render DSL 路由。
啟動：uvicorn app:app --host 127.0.0.1 --port 8765
"""
from __future__ import annotations

import asyncio
import io
import os
import re
from pathlib import Path
from typing import Literal

import matplotlib

matplotlib.use("Agg")
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from asea_render_runner import render_with_cache, validate_body_size

app = FastAPI(title="ASEA Python Function Plot Sandbox")

REPO_ROOT = Path(__file__).resolve().parent.parent
ASEA_SVG_ASSETS = REPO_ROOT / "public" / "asea-svg"
RENDER_TIMEOUT_SEC = float(os.environ.get("ASEA_RENDER_TIMEOUT_SEC", "5"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)

# 僅允許以 X、Y、np 為基礎的數值表達式，阻擋明顯危險片段
_FUNC_STR_MAX_LEN = 512
_BANNED_SUBSTRINGS = (
    "__",
    "import",
    "exec",
    "eval",
    "open",
    "file",
    "input",
    "os.",
    "sys.",
    "subprocess",
    "compile",
    "globals",
    "locals",
    "getattr",
    "setattr",
    "delattr",
    "breakpoint",
    "memoryview",
    "bytearray",
)
# 允許 np.*、X、Y 與常見數學呼叫；危險片段由 _BANNED_SUBSTRINGS 擋下
_SAFE_FUNC_PATTERN = re.compile(
    r"^[\s0-9XYnp\+\-\*\/\^\.\,\(\)\[\]:eE_a-zA-Z]+$"
)


def _validate_func_str(func_str: str) -> None:
    s = (func_str or "").strip()
    if not s or len(s) > _FUNC_STR_MAX_LEN:
        raise HTTPException(status_code=400, detail="Invalid func_str length")
    low = s.lower()
    for bad in _BANNED_SUBSTRINGS:
        if bad in low:
            raise HTTPException(status_code=400, detail="Unsafe expression")
    if not _SAFE_FUNC_PATTERN.match(s):
        raise HTTPException(status_code=400, detail="Expression contains disallowed characters")


def generate_function_plot_svg(
    func_str: str,
    x_range: tuple[float, float],
    y_range: tuple[float, float],
    mode: Literal["3d", "2d"] = "3d",
) -> str:
    x = np.linspace(x_range[0], x_range[1], 200)
    y = np.linspace(y_range[0], y_range[1], 200)
    X, Y = np.meshgrid(x, y)
    local_env: dict = {"np": np, "X": X, "Y": Y}
    _validate_func_str(func_str)
    try:
        exec(f"Z = {func_str}", {"__builtins__": {}}, local_env)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Plot evaluation error: {e!s}") from e
    Z = local_env.get("Z")
    if Z is None:
        raise HTTPException(status_code=400, detail="Z was not assigned")
    try:
        Z = np.asarray(Z, dtype=float)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Z is not numeric: {e!s}") from e
    if Z.shape != X.shape:
        raise HTTPException(
            status_code=400,
            detail=f"Z shape {Z.shape} must match X/Y {X.shape}",
        )

    import matplotlib.pyplot as plt
    from mpl_toolkits.mplot3d import Axes3D  # noqa: F401 — register 3d projection

    plt.rcParams["svg.fonttype"] = "none"

    fig = plt.figure(figsize=(8, 6))
    if mode == "3d":
        ax = fig.add_subplot(111, projection="3d")
        surf = ax.plot_surface(X, Y, Z, cmap="magma", edgecolor="none", antialiased=True)
        fig.colorbar(surf, ax=ax, shrink=0.5, aspect=5)
    else:
        ax = fig.add_subplot(111)
        cf = ax.contourf(X, Y, Z, cmap="magma")
        fig.colorbar(cf, ax=ax)

    buf = io.StringIO()
    try:
        fig.savefig(buf, format="svg", bbox_inches="tight", transparent=True)
    finally:
        plt.close(fig)
    svg_string = buf.getvalue()
    start = svg_string.find("<svg")
    if start < 0:
        raise HTTPException(status_code=500, detail="Matplotlib did not emit valid SVG")
    return svg_string[start:]


class PlotRequest(BaseModel):
    func_str: str = Field(..., description="Right-hand side for Z = ... using X, Y, np")
    x_range: tuple[float, float]
    y_range: tuple[float, float]
    mode: Literal["3d", "2d"] = "3d"


class PlotResponse(BaseModel):
    ok: bool = True
    svg: str


@app.get("/health")
def health():
    return {"ok": True, "service": "asea-python-plot-sandbox"}


@app.post("/api/python-plot", response_model=PlotResponse)
def post_python_plot(body: PlotRequest):
    svg = generate_function_plot_svg(
        body.func_str.strip(),
        body.x_range,
        body.y_range,
        body.mode,
    )
    return PlotResponse(svg=svg)


# --- ASEA DSL 統一渲染 ---


class RenderRequest(BaseModel):
    engine: str = Field(..., description="math | physics | chemistry | biology")
    topic: str
    data: dict = Field(default_factory=dict)
    styling: dict = Field(default_factory=dict)
    apply_layout: bool = False


class RenderResponse(BaseModel):
    status: str = "success"
    svg: str | None = None
    detail: str | None = None
    from_cache: bool = False


@app.post("/api/v1/render", response_model=RenderResponse)
async def post_asea_render(body: RenderRequest):
    try:
        validate_body_size(body)
        try:
            svg, from_cache = await asyncio.wait_for(
                asyncio.to_thread(render_with_cache, body, ASEA_SVG_ASSETS),
                timeout=RENDER_TIMEOUT_SEC,
            )
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=504,
                detail=(
                    f"渲染逾時（>{RENDER_TIMEOUT_SEC}s），請簡化算式、縮小 domain，"
                    "或稍後再試"
                ),
            ) from None
        return RenderResponse(status="success", svg=svg, from_cache=from_cache)
    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValueError as e:
        msg = str(e)
        if "PHYSICS_NOT_SUPPORTED" in msg:
            raise HTTPException(
                status_code=501,
                detail=(
                    "Server-side physics SVG is not used: render inclined-plane FBD "
                    "on the client (free_body_diagram + environment.inclined_plane)."
                ),
            ) from e
        raise HTTPException(status_code=400, detail=msg) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"render failed: {e!s}") from e


@app.post("/api/v1/math/plot", response_model=RenderResponse)
async def post_math_plot_sympy(body: RenderRequest):
    """SymPy 精準 2D 函數圖（與 /api/v1/render engine=math 等價）。"""
    r = RenderRequest(
        engine="math",
        topic=body.topic or "function_2d",
        data=body.data,
        styling=body.styling,
        apply_layout=body.apply_layout,
    )
    return await post_asea_render(r)
