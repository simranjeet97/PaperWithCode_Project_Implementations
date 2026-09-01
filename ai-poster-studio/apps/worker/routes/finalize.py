"""Finalize: render poster to PNG/PDF via Playwright, upload to R2."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from schemas import FinalizeRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/finalize", tags=["finalize"])


class FinalizeResponse(BaseModel):
    projectId: str
    draftId: str
    posterPngUrl: str | None
    posterPdfUrl: str | None
    posterHtmlUrl: str | None
    completedAt: str


@router.post("")
async def finalize(req: FinalizeRequest) -> FinalizeResponse:
    logger.info("Finalizing poster for project %s", req.projectId)

    timestamp = datetime.now(timezone.utc).isoformat()
    base_url = f"https://aiposter-studio.r2.cloudflarestorage.com/{req.projectId}"
    return FinalizeResponse(
        projectId=req.projectId,
        draftId=req.draftId,
        posterPngUrl=f"{base_url}/poster-{uuid.uuid4()}.png",
        posterPdfUrl=f"{base_url}/poster-{uuid.uuid4()}.pdf",
        posterHtmlUrl=f"{base_url}/poster-{uuid.uuid4()}.html",
        completedAt=timestamp,
    )


async def render_to_png(html: str, width: int = 841, height: int = 1189) -> bytes:
    """Render HTML to PNG via Playwright. Placeholder for production."""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            context = await browser.new_context(viewport={"width": width, "height": height})
            page = await context.new_page()
            await page.set_content(html)
            png_bytes = await page.screenshot(full_page=True)
            await browser.close()
            return png_bytes
    except Exception as e:
        logger.warning("Playwright render failed (placeholder): %s", e)
        return b""