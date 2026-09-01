"""Critic: rule-based validation + VLM critique.

In production: combines deterministic checks with Gemini 2.5 Flash vision.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from schemas import CriticFeedback, RuleCheck, VLMCritique

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/critic", tags=["critic"])


class CriticRequest(BaseModel):
    draftId: str
    posterPlan: dict[str, Any]
    htmlContent: str | None = None
    previewPngUrl: str | None = None


@router.post("")
async def critic(req: CriticRequest) -> CriticFeedback:
    logger.info("Critiquing draft %s", req.draftId)

    rule_checks = _rule_checks(req.htmlContent or "")
    vlm = _vlm_critique_stub(req.posterPlan)

    blocking_failures = sum(1 for c in rule_checks if c.blocking and not c.passed)
    score = (
        vlm.layoutScore + vlm.densityScore + vlm.readabilityScore + vlm.aestheticsScore
    ) / 4

    consolidated = _consolidate(rule_checks, vlm)

    return CriticFeedback(
        ruleChecks=rule_checks,
        vlmCritique=vlm,
        consolidated=consolidated,
        blockingFailures=blocking_failures,
        score=score,
    )


def _rule_checks(html: str) -> list[RuleCheck]:
    """Deterministic validation."""
    checks: list[RuleCheck] = []

    checks.append(
        RuleCheck(
            name="html_present",
            blocking=True,
            passed=bool(html and len(html) > 100),
            message="HTML content present and non-empty",
        ),
    )
    checks.append(
        RuleCheck(
            name="has_title",
            blocking=True,
            passed="<h1" in html,
            message="Contains h1 title element",
        ),
    )
    checks.append(
        RuleCheck(
            name="has_abstract",
            blocking=False,
            passed="abstract" in html.lower(),
            message="Contains abstract section",
        ),
    )
    checks.append(
        RuleCheck(
            name="no_console_errors",
            blocking=False,
            passed=True,
            message="No console errors detected (placeholder)",
        ),
    )
    checks.append(
        RuleCheck(
            name="typography_contrast",
            blocking=False,
            passed=True,
            message="Typography contrast ≥ 4.5:1 (placeholder)",
        ),
    )
    return checks


def _vlm_critique_stub(plan: dict) -> VLMCritique:
    """Stub VLM critique. In production: call Gemini 2.5 Flash with preview PNG."""
    return VLMCritique(
        layoutScore=8.5,
        densityScore=7.8,
        readabilityScore=9.1,
        aestheticsScore=8.2,
        feedback="Layout is clean. Density is slightly high in section 3. Consider reducing figure size by 10%.",
        localizedIssues=[
            {"panelId": "p-method", "description": "Figure too large, density target exceeded", "severity": "major"},
        ],
    )


def _consolidate(checks: list[RuleCheck], vlm: VLMCritique) -> str:
    """Combine rule + VLM feedback into a single revision prompt."""
    parts: list[str] = []
    for c in checks:
        if c.blocking and not c.passed:
            parts.append(f"BLOCKING: {c.message}")
    if vlm.feedback:
        parts.append(f"VLM: {vlm.feedback}")
    if vlm.localizedIssues:
        for issue in vlm.localizedIssues:
            parts.append(f"  - {issue['panelId']}: {issue['description']}")
    return "\n".join(parts) if parts else "All checks pass."