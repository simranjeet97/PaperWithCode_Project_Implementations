"""Shared Pydantic schemas for worker routes."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ContentBrief(BaseModel):
    paperTitle: str
    authors: list[str]
    abstract: str
    sections: list[dict[str, Any]]
    figures: list[dict[str, Any]]
    tables: list[dict[str, Any]]
    claims: list[dict[str, Any]]
    references: list[dict[str, Any]]


class PosterPlan(BaseModel):
    template: str
    panels: list[dict[str, Any]]
    palette: dict[str, str]
    typography: dict[str, str]
    generatedAt: str


class DesignRequest(BaseModel):
    contentBrief: ContentBrief
    posterPlan: PosterPlan
    previousDraftId: str | None = None
    previousFeedback: str | None = None
    turnNumber: int = 1


class DraftResponse(BaseModel):
    id: str
    projectId: str = ""
    turnNumber: int
    htmlContent: str
    previewPngUrl: str | None = None
    pdfUrl: str | None = None
    durationMs: int = 0
    createdAt: str = Field(default_factory=lambda: _now())


class RuleCheck(BaseModel):
    name: str
    blocking: bool
    passed: bool
    message: str


class VLMCritique(BaseModel):
    layoutScore: float
    densityScore: float
    readabilityScore: float
    aestheticsScore: float
    feedback: str
    localizedIssues: list[dict[str, Any]] = []


class CriticFeedback(BaseModel):
    ruleChecks: list[RuleCheck]
    vlmCritique: VLMCritique | None
    consolidated: str
    blockingFailures: int
    score: float | None = None


class FinalizeRequest(BaseModel):
    projectId: str
    draftId: str


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()