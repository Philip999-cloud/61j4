"""RDKit 2D 結構 → SVG（可選 SMARTS 原子高光）。"""
from __future__ import annotations

import os
from typing import Any

_MAX_SMILES_LEN = int(os.environ.get("ASEA_CHEM_MAX_SMILES_LEN", "4096"))

try:
    from rdkit import Chem
except ImportError:  # pragma: no cover
    Chem = None  # type: ignore[misc, assignment]


def render_chemistry_2d(data: dict[str, Any]) -> str:
    if Chem is None:
        raise RuntimeError(
            "RDKit is not installed in this Python environment. "
            "Install rdkit (e.g. conda install rdkit or pip install rdkit) for chemistry rendering."
        )

    smiles = str(data.get("molecule_string") or "").strip()
    if not smiles:
        raise ValueError("molecule_string required")
    if len(smiles) > _MAX_SMILES_LEN:
        raise ValueError(f"SMILES too long (max {_MAX_SMILES_LEN})")

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError("invalid SMILES")

    highlight_atoms: set[int] = set()
    annotations = data.get("annotations") or []
    if isinstance(annotations, list):
        for ann in annotations:
            if not isinstance(ann, dict):
                continue
            smarts = str(ann.get("target_substructure_smarts") or "").strip()
            if not smarts:
                continue
            pat = Chem.MolFromSmarts(smarts)
            if pat is None:
                continue
            for m in mol.GetSubstructMatches(pat):
                highlight_atoms.update(m)

    from rdkit.Chem.Draw import rdMolDraw2D

    d2d = rdMolDraw2D.MolDraw2DSVG(400, 320)
    opts = d2d.drawOptions()
    opts.clearBackground = False
    ha = list(highlight_atoms) if highlight_atoms else []
    if ha:
        d2d.DrawMolecule(mol, highlightAtoms=ha)
    else:
        d2d.DrawMolecule(mol)
    d2d.FinishDrawing()
    return d2d.GetDrawingText()
