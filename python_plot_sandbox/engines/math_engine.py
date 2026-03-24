"""SymPy 驅動 2D 函數圖 → Matplotlib SVG。"""
from __future__ import annotations

import io
import os
import re
from typing import Any

_MAX_EQ_LEN = int(os.environ.get("ASEA_MATH_MAX_EQ_LEN", "384"))
_MAX_DOMAIN_SPAN = float(os.environ.get("ASEA_MATH_MAX_DOMAIN_SPAN", "800"))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import sympy as sp
from sympy import lambdify


_EQ_STRIP = re.compile(r"^\s*y\s*=")


def _expr_from_equation(eq: str) -> sp.Expr:
    s = (eq or "").strip()
    if not s:
        raise ValueError("empty equation")
    s = _EQ_STRIP.sub("", s).strip()
    x = sp.Symbol("x", real=True)
    local_dict = {"x": x, "E": sp.E, "pi": sp.pi, "I": sp.I}
    return sp.parse_expr(s, local_dict=local_dict, transformations="all")


def _numeric_features(
    expr: sp.Expr,
    x_sym: sp.Symbol,
    features: list[str],
    x_min: float,
    x_max: float,
) -> dict[str, list[tuple[float, float]]]:
    out: dict[str, list[tuple[float, float]]] = {}
    f = sp.lambdify(x_sym, expr, modules=["numpy"])

    if "roots" in features:
        roots: list[tuple[float, float]] = []
        try:
            for r in sp.solve(sp.Eq(expr, 0), x_sym):
                if r.is_real:
                    xv = float(r.evalf())
                    if x_min - 1e-6 <= xv <= x_max + 1e-6:
                        roots.append((xv, 0.0))
                elif r.is_complex and abs(sp.im(r)) < 1e-10:
                    xv = float(sp.re(r).evalf())
                    if x_min - 1e-6 <= xv <= x_max + 1e-6:
                        roots.append((xv, 0.0))
        except Exception:
            pass
        out["roots"] = roots

    if "vertex" in features:
        verts: list[tuple[float, float]] = []
        try:
            d1 = sp.diff(expr, x_sym)
            critical = sp.solve(sp.Eq(d1, 0), x_sym)
            if not isinstance(critical, list):
                critical = [critical]
            for c in critical:
                if not hasattr(c, "is_real") or not c.is_real:
                    continue
                xv = float(c.evalf())
                if x_min - 1e-6 <= xv <= x_max + 1e-6:
                    yv = float(expr.subs(x_sym, c).evalf())
                    verts.append((xv, yv))
            out["vertex"] = verts[:2]
        except Exception:
            out["vertex"] = []

    if "y_intercept" in features:
        try:
            y0 = float(expr.subs(x_sym, 0).evalf())
            if y0 == y0:  # not nan
                out["y_intercept"] = [(0.0, y0)]
        except Exception:
            out["y_intercept"] = []

    return out


def render_math_function_2d(data: dict[str, Any]) -> str:
    equations = data.get("equations") or []
    if not equations or not isinstance(equations, list):
        raise ValueError("data.equations must be a non-empty list")
    domain = data.get("domain") or {}
    x_min = float(domain.get("x_min", -5))
    x_max = float(domain.get("x_max", 5))
    if x_max <= x_min:
        raise ValueError("domain: x_max must be > x_min")
    span = abs(x_max - x_min)
    if span > _MAX_DOMAIN_SPAN:
        raise ValueError(f"domain span too large (max {_MAX_DOMAIN_SPAN})")

    features = list(data.get("features_to_highlight") or [])
    styling = data.get("styling") or {}
    grid = bool(styling.get("grid", True))
    theme = str(styling.get("theme") or "light")
    dark = "dark" in theme.lower()

    eq0 = str(equations[0])
    if len(eq0) > _MAX_EQ_LEN:
        raise ValueError(f"equation string too long (max {_MAX_EQ_LEN})")
    x_sym = sp.Symbol("x", real=True)
    expr = _expr_from_equation(eq0)
    f = lambdify(x_sym, expr, modules=["numpy"])

    xs = np.linspace(x_min, x_max, 400)
    try:
        ys = np.asarray(f(xs), dtype=float)
    except Exception as e:
        raise ValueError(f"evaluation failed: {e}") from e

    feats = _numeric_features(expr, x_sym, features, x_min, x_max)

    fig, ax = plt.subplots(figsize=(6, 4), dpi=120)
    if dark:
        fig.patch.set_facecolor("#0f172a")
        ax.set_facecolor("#0f172a")
        ax.tick_params(colors="#e2e8f0")
        ax.spines["bottom"].set_color("#94a3b8")
        ax.spines["left"].set_color("#94a3b8")
        ax.xaxis.label.set_color("#e2e8f0")
        ax.yaxis.label.set_color("#e2e8f0")
        ax.title.set_color("#f1f5f9")
        line_color = "#38bdf8"
        point_color = "#f472b6"
    else:
        line_color = "#2563eb"
        point_color = "#dc2626"

    ax.plot(xs, ys, color=line_color, linewidth=2, label="f(x)")
    ax.axhline(0, color="#64748b" if not dark else "#475569", linewidth=0.8)
    ax.axvline(0, color="#64748b" if not dark else "#475569", linewidth=0.8)
    if grid:
        ax.grid(True, linestyle="--", alpha=0.35)

    for label, pts in feats.items():
        for px, py in pts:
            ax.scatter([px], [py], s=80, zorder=5, color=point_color, edgecolors="white", linewidths=0.5)
            ax.annotate(
                f"({px:.2g},{py:.2g})" if label != "roots" else f"root",
                (px, py),
                textcoords="offset points",
                xytext=(8, 8),
                fontsize=8,
                color="#e2e8f0" if dark else "#1e293b",
            )

    ax.set_xlim(x_min, x_max)
    y_pad = 0.15 * (np.nanmax(ys) - np.nanmin(ys) + 1e-9)
    y_lo = float(np.nanmin(ys)) - y_pad
    y_hi = float(np.nanmax(ys)) + y_pad
    ax.set_ylim(y_lo, y_hi)
    ax.set_xlabel("x")
    ax.set_ylabel("y")

    buf = io.StringIO()
    fig.savefig(buf, format="svg", bbox_inches="tight")
    plt.close(fig)
    return buf.getvalue()
