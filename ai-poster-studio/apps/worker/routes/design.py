"""Poster design: generate or revise HTML poster.

In production: uses Claude (or a coding-agent SDK) to generate editable HTML.
For the skeleton, returns a templated HTML poster.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from schemas import DesignRequest, DraftResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/design", tags=["design"])


@router.post("")
async def design(req: DesignRequest) -> DraftResponse:
    logger.info("Designing poster, turn %d", req.turnNumber)

    html = _render_poster_html(req.contentBrief, req.posterPlan, req.turnNumber)

    return DraftResponse(
        id=str(uuid.uuid4()),
        turnNumber=req.turnNumber,
        htmlContent=html,
        durationMs=30000,
        createdAt=datetime.now(timezone.utc).isoformat(),
    )


def _render_poster_html(brief, plan: dict, turn: int) -> str:
    """Render poster HTML from brief + plan."""
    palette = plan.get("palette", {})
    accent = palette.get("primary", "#4f46e5")
    font = plan.get("typography", {}).get("displayFont", "Inter")

    sections_html = ""
    for sec in brief.sections[:6]:
        sections_html += f"""
        <section class="panel">
          <h2>{sec.get('heading', '')}</h2>
          <p>{sec.get('text', '')[:400]}</p>
        </section>
        """

    claims_html = ""
    for claim in brief.claims[:3]:
        claims_html += f"""
        <li class="claim" data-page="{claim.get('sourcePage', '')}">
          {claim.get('text', '')}
        </li>
        """

    figures_html = ""
    for fig in brief.figures[:3]:
        figures_html += f"""
        <figure class="figure">
          <div class="figure-placeholder">{fig.get('caption', '')}</div>
          <figcaption>{fig.get('caption', '')}</figcaption>
        </figure>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{brief.paperTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
  :root {{
    --accent: {accent};
    --fg: #111827;
    --fg-2: #374151;
    --muted: #6b7280;
    --border: #dfe3ed;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: '{font}', sans-serif;
    color: var(--fg);
    background: white;
    width: 841px;
    height: 1189px;
    padding: 48px;
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    gap: 24px;
  }}
  header.title {{
    border-bottom: 2px solid var(--accent);
    padding-bottom: 16px;
  }}
  header.title h1 {{
    font-size: 42px;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.05;
    margin-bottom: 8px;
  }}
  header.title .authors {{
    font-size: 14px;
    color: var(--fg-2);
  }}
  .abstract {{
    background: #f7f8fc;
    padding: 16px;
    border-left: 4px solid var(--accent);
    font-size: 13px;
    line-height: 1.5;
  }}
  .body {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    overflow: hidden;
  }}
  .panel {{
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }}
  .panel h2 {{
    font-size: 18px;
    font-weight: 600;
    color: var(--accent);
    margin-bottom: 8px;
  }}
  .panel p {{
    font-size: 12px;
    line-height: 1.5;
    color: var(--fg-2);
  }}
  .figure-placeholder {{
    background: linear-gradient(135deg, #eef1ff 0%, #f7f8fc 100%);
    border: 1px dashed var(--border);
    border-radius: 8px;
    height: 180px;
    display: grid;
    place-items: center;
    color: var(--muted);
    font-size: 11px;
  }}
  footer {{
    border-top: 1px solid var(--border);
    padding-top: 12px;
    font-size: 10px;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    display: flex;
    justify-content: space-between;
  }}
  .claim {{
    list-style: none;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
    font-size: 11px;
  }}
  .claim::before {{
    content: '✓';
    color: var(--accent);
    font-weight: 700;
    margin-right: 6px;
  }}
</style>
</head>
<body data-draft="{turn}">
  <header class="title">
    <h1>{brief.paperTitle}</h1>
    <div class="authors">{', '.join(brief.authors[:5])}</div>
  </header>
  <div class="abstract">
    <strong>Abstract.</strong> {brief.abstract[:600]}
  </div>
  <div class="body">
    <div class="left">
      {sections_html}
    </div>
    <div class="right">
      {figures_html}
      <ul class="claims">
        {claims_html}
      </ul>
    </div>
  </div>
  <footer>
    <span>AI Poster Studio · Draft {turn}</span>
    <span>Generated from arXiv paper</span>
  </footer>
</body>
</html>"""