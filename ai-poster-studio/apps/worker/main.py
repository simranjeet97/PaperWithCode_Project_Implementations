"""AI Poster Studio — Worker entry point.

Routes:
  POST /ingest   — extract text, figures, tables, claims from PDF
  POST /plan     — generate poster plan (panels, palette, typography)
  POST /design   — generate or revise poster HTML
  POST /critic   — rule + VLM critique
  POST /finalize — inline assets, export PNG/PDF
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader

from routes.ingest import router as ingest_router
from routes.plan import router as plan_router
from routes.design import router as design_router
from routes.critic import router as critic_router
from routes.finalize import router as finalize_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

api_key_header = APIKeyHeader(name="Authorization", auto_error=False)


async def verify_api_key(key: str | None = Security(api_key_header)) -> None:
    expected = os.environ.get("WORKER_API_KEY")
    if not expected:
        return
    if not key or key != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Invalid API key")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Worker starting up")
    yield
    logger.info("Worker shutting down")


app = FastAPI(
    title="AI Poster Studio Worker",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENV") != "production" else None,
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(ingest_router, dependencies=[Security(verify_api_key)])
app.include_router(plan_router, dependencies=[Security(verify_api_key)])
app.include_router(design_router, dependencies=[Security(verify_api_key)])
app.include_router(critic_router, dependencies=[Security(verify_api_key)])
app.include_router(finalize_router, dependencies=[Security(verify_api_key)])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)