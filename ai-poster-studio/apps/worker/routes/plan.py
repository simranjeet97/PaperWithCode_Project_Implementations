"""Poster planning: generate panels, palette, typography."""

from __future__ import annotations

import logging
import os

from fastapi import APIRouter
from groq import Groq
from pydantic import BaseModel

from schemas import ContentBrief, PosterPlan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plan", tags=["plan"])


class PlanRequest(BaseModel):
    contentBrief: ContentBrief
    template: str = "cvpr-portrait"
    aspectRatio: str = "A0-portrait"
    accentColor: str = "#4f46e5"


@router.post("")
async def plan(req: PlanRequest) -> PosterPlan:
    logger.info("Planning poster for: %s", req.contentBrief.paperTitle)

    panels = _infer_panels(req.contentBrief)
    palette = _infer_palette(req.contentBrief, req.accentColor)
    typography = _infer_typography(req.template)

    return PosterPlan(
        template=req.template,
        panels=panels,
        palette=palette,
        typography=typography,
        generatedAt=_now(),
    )


def _infer_panels(brief: ContentBrief) -> list:
    """Infer poster panel structure from content brief."""
    panels = [
        {
            "id": "p-title",
            "type": "title",
            "title": brief.paperTitle,
            "contentRefs": [],
            "position": {"x": 0, "y": 0, "width": 1, "height": 0.1},
            "priority": 1,
        },
        {
            "id": "p-abstract",
            "type": "abstract",
            "title": "Abstract",
            "contentRefs": [brief.sections[0].id] if brief.sections else [],
            "position": {"x": 0, "y": 0.1, "width": 1, "height": 0.1},
            "priority": 2,
        },
    ]

    for idx, sec in enumerate(brief.sections[:5], start=1):
        panels.append({
            "id": f"p-section-{idx}",
            "type": "method" if idx == 1 else "results" if idx == 2 else "body",
            "title": sec.heading,
            "contentRefs": [sec.id],
            "position": {"x": (idx % 2) * 0.5, "y": 0.2 + (idx // 2) * 0.15, "width": 0.5, "height": 0.15},
            "priority": 3 + idx,
        })

    for fig in brief.figures[:4]:
        panels.append({
            "id": f"p-fig-{fig.id}",
            "type": "figure",
            "title": fig.caption,
            "contentRefs": [fig.id],
            "position": {"x": 0, "y": 0.6, "width": 0.4, "height": 0.2},
            "priority": 5,
        })

    panels.append({
        "id": "p-references",
        "type": "references",
        "title": "References",
        "contentRefs": [],
        "position": {"x": 0, "y": 0.92, "width": 1, "height": 0.08},
        "priority": 99,
    })

    return panels


def _infer_palette(_brief: ContentBrief, accent: str) -> dict:
    """Generate palette. In production, use Colormind API."""
    return {
        "primary": accent,
        "secondary": _lighten(accent, 0.2),
        "accent": accent,
        "background": "#ffffff",
        "text": "#111827",
        "muted": "#6b7280",
        "source": "template",
    }


def _infer_typography(template: str) -> dict:
    """Pick typography based on template."""
    if "cvpr" in template or "icml" in template or "neurips" in template:
        return {"displayFont": "Inter", "bodyFont": "Inter", "monoFont": "JetBrains Mono"}
    return {"displayFont": "Inter", "bodyFont": "Inter", "monoFont": "JetBrains Mono"}


def _lighten(hex_color: str, amount: float) -> str:
    """Lighten a hex color by mixing toward white."""
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    r = int(r + (255 - r) * amount)
    g = int(g + (255 - g) * amount)
    b = int(b + (255 - b) * amount)
    return f"#{r:02x}{g:02x}{b:02x}"


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()