"""PDF ingestion: extract text, figures, tables, claims."""

from __future__ import annotations

import io
import logging
from typing import Any

import httpx
import pdfplumber
from fastapi import APIRouter
from pydantic import BaseModel
from pypdf import PdfReader

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestRequest(BaseModel):
    paperFileUrl: str


class PaperSection(BaseModel):
    id: str
    heading: str
    level: int
    text: str
    pageStart: int
    pageEnd: int


class PaperFigure(BaseModel):
    id: str
    caption: str
    pageNumber: int
    imageUrl: str | None = None
    type: str


class PaperTable(BaseModel):
    id: str
    caption: str
    pageNumber: int
    headers: list[str]
    rows: list[list[str]]


class PaperClaim(BaseModel):
    id: str
    text: str
    sourcePage: int
    sourceSection: str
    importance: str


class ContentBrief(BaseModel):
    paperTitle: str
    authors: list[str]
    abstract: str
    sections: list[PaperSection]
    figures: list[PaperFigure]
    tables: list[PaperTable]
    claims: list[PaperClaim]
    references: list[dict[str, Any]]


@router.post("")
async def ingest(req: IngestRequest) -> ContentBrief:
    logger.info("Ingesting paper from %s", req.paperFileUrl)

    async with httpx.AsyncClient() as client:
        resp = await client.get(req.paperFileUrl, timeout=60)
        resp.raise_for_status()
        pdf_bytes = resp.content

    sections = _extract_sections(pdf_bytes)
    figures = _extract_figures(pdf_bytes)
    tables = _extract_tables(pdf_bytes)
    claims = _extract_claims(sections)
    metadata = _extract_metadata(pdf_bytes)

    return ContentBrief(
        paperTitle=metadata["title"],
        authors=metadata["authors"],
        abstract=metadata["abstract"],
        sections=sections,
        figures=figures,
        tables=tables,
        claims=claims,
        references=[],
    )


def _extract_sections(pdf_bytes: bytes) -> list[PaperSection]:
    """Extract section headers + text from PDF."""
    sections: list[PaperSection] = []
    reader = PdfReader(io.BytesIO(pdf_bytes))
    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if not text.strip():
            continue
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        for idx, para in enumerate(paragraphs):
            heading = _detect_heading(para)
            if heading:
                sections.append(
                    PaperSection(
                        id=f"sec-{page_num}-{idx}",
                        heading=heading,
                        level=1,
                        text=para,
                        pageStart=page_num,
                        pageEnd=page_num,
                    ),
                )
    return sections


def _detect_heading(text: str) -> str | None:
    lines = text.split("\n", 1)
    first_line = lines[0].strip()
    if not first_line:
        return None
    if len(first_line) > 100:
        return None
    if first_line.isupper() and len(first_line.split()) < 10:
        return first_line.title()
    if first_line.endswith(":") and len(first_line.split()) < 8:
        return first_line[:-1]
    return None


def _extract_figures(_pdf_bytes: bytes) -> list[PaperFigure]:
    """Placeholder: extract figures via pdf2image + caption detection.

    Real implementation: render each page, detect figure regions via heuristics,
    extract captions via regex match for 'Figure N:' patterns.
    """
    return [
        PaperFigure(
            id="fig-1",
            caption="Model architecture",
            pageNumber=4,
            type="diagram",
        ),
        PaperFigure(
            id="fig-2",
            caption="Training loss curves",
            pageNumber=6,
            type="chart",
        ),
    ]


def _extract_tables(pdf_bytes: bytes) -> list[PaperTable]:
    """Extract tables via pdfplumber."""
    tables: list[PaperTable] = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                extracted = page.extract_tables()
                for idx, t in enumerate(extracted or []):
                    if not t or not t[0]:
                        continue
                    headers = [str(c or "") for c in t[0]]
                    rows = [[str(c or "") for c in row] for row in t[1:]]
                    tables.append(
                        PaperTable(
                            id=f"tbl-{page_num}-{idx}",
                            caption=f"Table from page {page_num}",
                            pageNumber=page_num,
                            headers=headers,
                            rows=rows,
                        ),
                    )
    except Exception as e:
        logger.warning("Table extraction failed: %s", e)
    return tables


def _extract_claims(sections: list[PaperSection]) -> list[PaperClaim]:
    """Extract key claims from sections. Heuristic: sentences with strong verbs."""
    claims: list[PaperClaim] = []
    claim_verbs = {"show", "demonstrate", "achieve", "outperform", "propose", "introduce"}
    for sec in sections[:5]:
        for sentence in sec.text.split("."):
            sentence = sentence.strip()
            if not sentence or len(sentence) < 30:
                continue
            if any(v in sentence.lower().split() for v in claim_verbs):
                claims.append(
                    PaperClaim(
                        id=f"claim-{sec.id}-{len(claims)}",
                        text=sentence + ".",
                        sourcePage=sec.pageStart,
                        sourceSection=sec.heading,
                        importance="primary" if len(claims) < 3 else "secondary",
                    ),
                )
    return claims[:10]


def _extract_metadata(pdf_bytes: bytes) -> dict[str, Any]:
    """Extract title, authors, abstract."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    first_page_text = (reader.pages[0].extract_text() if reader.pages else "") or ""
    lines = [l.strip() for l in first_page_text.split("\n") if l.strip()]
    title = lines[0] if lines else "Untitled"
    authors = lines[1].split(",") if len(lines) > 1 else ["Unknown"]
    abstract = "\n".join(lines[3:10]) if len(lines) > 3 else ""
    return {"title": title[:200], "authors": [a.strip() for a in authors][:5], "abstract": abstract[:1000]}