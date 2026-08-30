import asyncio
import json
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Response, Query as QueryParam
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Optional, Dict

from .config import settings
from .schemas.request import SearchRequest
from .schemas.landscape import ResearchLandscape
from .storage.task_store import task_store
from .services.arxiv_retriever import ArxivRetriever
from .services.cross_encoder_rerank import CrossEncoderReranker
from .services.paper_extractor import PaperExtractor
from .services.landscape_synthesizer import LandscapeSynthesizer
from .services.llm_provider import LLMProvider
from .services.export_service import ExportService
from .utils.sse_manager import sse_manager
from .utils.logger import logger

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous AI Agent Research Field Mapper & Reading Cartographer API"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory registry of running asyncio tasks for cancellation support
active_tasks: Dict[str, asyncio.Task] = {}


async def broadcast_and_log(task_id: str, stage: str, progress: int, message: str, payload: dict = None):
    """Broadcast SSE event AND persist to TinyDB task log."""
    task_store.append_sse_log(task_id, stage, progress, message)
    await sse_manager.broadcast(task_id, stage=stage, progress=progress, message=message, payload=payload)


async def execute_cartography_pipeline(
    task_id: str,
    query: str,
    max_candidates: int,
    top_papers_synthesis: int,
    llm_provider_override: Optional[str] = None
):
    """Executes the full 4-stage research cartography pipeline with real-time SSE telemetry."""
    try:
        task_store.mark_running(task_id)

        llm = LLMProvider(llm_provider_override)
        retriever = ArxivRetriever(llm)
        reranker = CrossEncoderReranker()
        extractor = PaperExtractor(llm)
        synthesizer = LandscapeSynthesizer(llm)

        # ----- STAGE 1: arXiv Retrieval -----
        await broadcast_and_log(task_id, "RETRIEVAL", 10,
            f"🧠 [Agent Planning] Expanding '{query}' into multi-paradigm sub-queries using {settings.OLLAMA_MODEL}...")

        await asyncio.sleep(0)  # cancellation checkpoint

        await broadcast_and_log(task_id, "RETRIEVAL", 20,
            f"📡 [arXiv Ingestion] Crawling export.arxiv.org across 5 taxonomy branches (cs.AI, cs.CL, cs.LG)...")

        candidates = await retriever.retrieve_candidates(query, max_results=max_candidates)

        if not candidates:
            await broadcast_and_log(task_id, "ERROR", 100,
                f"❌ No relevant preprints retrieved from arXiv for '{query}'. Please try a broader term.")
            task_store.mark_failed(task_id, f"No candidates found for '{query}'")
            return

        seminal_count = sum(1 for c in candidates if c.is_seminal)
        task_store.update_task(task_id, papers_retrieved=len(candidates))
        await broadcast_and_log(task_id, "RETRIEVAL", 35,
            f"🎓 [Citation Overlay] Ingested {len(candidates)} candidate preprints ({seminal_count} seminal authorities flagged via Semantic Scholar/OpenAlex).")

        await asyncio.sleep(0)  # cancellation checkpoint

        # ----- STAGE 2: Cross-Encoder Reranking -----
        await broadcast_and_log(task_id, "RERANKING", 45,
            f"⚡ [Cross-Encoder] Tokenizing {len(candidates)} query↔abstract pairs on GPU (Apple Silicon Metal MPS)...")

        task_store.update_task(task_id, current_stage="RERANKING", progress=45)
        top_candidates = await reranker.rerank(query, candidates, top_k=top_papers_synthesis)

        top_sample = top_candidates[0].title if top_candidates else "N/A"
        await broadcast_and_log(task_id, "RERANKING", 55,
            f"🎯 [Cross-Encoder] Scored & selected top {len(top_candidates)} papers (Lead: '{top_sample[:40]}...').")

        await asyncio.sleep(0)  # cancellation checkpoint

        # ----- STAGE 3: Structured Extraction -----
        await broadcast_and_log(task_id, "EXTRACTION", 65,
            f"🔬 [Parallel Extraction] Extracting Core Problem, Method, Benchmarks & Code for {len(top_candidates)} papers via {settings.OLLAMA_MODEL}...")

        task_store.update_task(task_id, current_stage="EXTRACTION", progress=65)
        extracted_dossiers = await extractor.extract_batch(top_candidates, topic=query)

        for d in extracted_dossiers[:3]:
            await broadcast_and_log(task_id, "EXTRACTION", 70,
                f"📑 [Structured Dossier] Analyzed: '{d.title[:35]}...' → School: '{d.cluster_category}'")

        task_store.update_task(task_id, papers_synthesized=len(extracted_dossiers))
        await broadcast_and_log(task_id, "EXTRACTION", 75,
            f"✅ [Extraction Complete] Formatted {len(extracted_dossiers)} comprehensive scientific dossiers.")

        await asyncio.sleep(0)  # cancellation checkpoint

        # ----- STAGE 4: Landscape Synthesis -----
        await broadcast_and_log(task_id, "SYNTHESIS", 85,
            f"⚖️ [Scientific Synthesis] Mapping paradigm trade-off tensions, root-cause frontiers, and evolutionary lineage DAG...")

        task_store.update_task(task_id, current_stage="SYNTHESIS", progress=85)
        landscape = await synthesizer.synthesize(query, extracted_dossiers, candidate_pool=candidates)
        landscape.id = task_id

        # Save landscape to TinyDB
        task_store.save_landscape(landscape)

        task_store.update_task(
            task_id,
            clusters_count=len(landscape.clusters),
            tensions_count=len(landscape.tensions),
            frontiers_count=len(landscape.open_frontiers),
        )

        await broadcast_and_log(task_id, "SYNTHESIS", 95,
            f"🗺️ [Cartography Engine] Built 2D layout: {len(landscape.nodes)} nodes, {len(landscape.edges)} directed edges, {len(landscape.clusters)} taxonomy clusters.")

        # ----- STAGE 5: Complete -----
        task_store.mark_completed(task_id, landscape_id=task_id)
        await broadcast_and_log(task_id, "COMPLETE", 100,
            f"🎉 Research Atlas generation complete! Snapshot saved in TinyDB.",
            payload=landscape.model_dump())

    except asyncio.CancelledError:
        logger.info(f"[Pipeline] Task {task_id} was cancelled by user.")
        task_store.mark_cancelled(task_id)
        await sse_manager.broadcast(task_id, stage="CANCELLED", progress=0,
            message="🛑 Task cancelled by user.")
    except Exception as e:
        logger.error(f"[Pipeline] Fatal error executing task {task_id}: {e}", exc_info=True)
        task_store.mark_failed(task_id, str(e))
        await sse_manager.broadcast(task_id, stage="ERROR", progress=100,
            message=f"Pipeline error: {str(e)}")
    finally:
        active_tasks.pop(task_id, None)
        task_store.flush()


# =====================================================================
# API ENDPOINTS
# =====================================================================

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.OLLAMA_MODEL,
        "cross_encoder": settings.CROSS_ENCODER_MODEL,
        "active_tasks": len(active_tasks),
    }


@app.post("/api/search")
async def create_landscape_search(req: SearchRequest):
    """Initiates a research field search or returns cached landscape."""
    clean_query = req.query.strip()

    # Check cache
    if req.use_cache:
        cached = task_store.get_landscape_by_query(clean_query)
        if cached:
            logger.info(f"[API] Returning cached landscape for query: '{clean_query}' (ID: {cached.id})")
            return {"task_id": cached.id, "status": "cached", "landscape": cached}

    task_id = str(uuid.uuid4())[:8]

    # Create task document in TinyDB
    task_store.create_task(
        task_id=task_id,
        query=clean_query,
        llm_provider=req.llm_provider_override or settings.LLM_PROVIDER,
        llm_model=settings.OLLAMA_MODEL,
        max_candidates=req.max_candidates or settings.MAX_CANDIDATE_PAPERS,
        top_papers=req.top_papers_synthesis or settings.TOP_SYNTHESIS_PAPERS,
    )

    # Launch tracked asyncio task
    task = asyncio.create_task(
        execute_cartography_pipeline(
            task_id=task_id,
            query=clean_query,
            max_candidates=req.max_candidates or settings.MAX_CANDIDATE_PAPERS,
            top_papers_synthesis=req.top_papers_synthesis or settings.TOP_SYNTHESIS_PAPERS,
            llm_provider_override=req.llm_provider_override,
        )
    )
    active_tasks[task_id] = task

    return {
        "task_id": task_id,
        "status": "processing",
        "message": f"Mapping research field for '{clean_query}' in background...",
    }


@app.get("/api/stream/{task_id}")
async def stream_pipeline_events(task_id: str):
    """Server-Sent Events (SSE) streaming endpoint for live stage progress."""
    queue = sse_manager.subscribe(task_id)

    async def event_generator():
        try:
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {data}\n\n"
                    parsed = json.loads(data)
                    if parsed.get("stage") in ["COMPLETE", "ERROR", "CANCELLED"]:
                        break
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            sse_manager.unsubscribe(task_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


# =====================================================================
# TASK MANAGEMENT ENDPOINTS
# =====================================================================

@app.get("/api/tasks")
async def list_tasks(
    status: Optional[str] = QueryParam(default=None, description="Filter by status"),
    limit: int = QueryParam(default=50, ge=1, le=200),
    offset: int = QueryParam(default=0, ge=0),
):
    """List all tasks with optional status filter."""
    tasks = task_store.list_tasks(status=status, limit=limit, offset=offset)
    # Strip large sse_log from list view for performance
    for t in tasks:
        t["sse_log_count"] = len(t.get("sse_log", []))
        t.pop("sse_log", None)
    return {"tasks": tasks, "total": len(tasks), "stats": task_store.get_stats()}


@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    """Get single task details including full SSE log."""
    task = task_store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


@app.post("/api/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Cancel a running task."""
    asyncio_task = active_tasks.get(task_id)
    if not asyncio_task:
        raise HTTPException(status_code=400, detail="Task is not currently running.")
    asyncio_task.cancel()
    return {"task_id": task_id, "status": "cancelling", "message": "Cancellation signal sent."}


@app.post("/api/tasks/{task_id}/retry")
async def retry_task(task_id: str):
    """Re-run a completed, failed, or cancelled task with the same query."""
    old_task = task_store.get_task(task_id)
    if not old_task:
        raise HTTPException(status_code=404, detail="Task not found.")

    new_task_id = str(uuid.uuid4())[:8]
    task_store.create_task(
        task_id=new_task_id,
        query=old_task["query"],
        llm_provider=old_task.get("llm_provider", settings.LLM_PROVIDER),
        llm_model=old_task.get("llm_model", settings.OLLAMA_MODEL),
        max_candidates=old_task.get("max_candidates", settings.MAX_CANDIDATE_PAPERS),
        top_papers=old_task.get("top_papers", settings.TOP_SYNTHESIS_PAPERS),
    )

    task = asyncio.create_task(
        execute_cartography_pipeline(
            task_id=new_task_id,
            query=old_task["query"],
            max_candidates=old_task.get("max_candidates", settings.MAX_CANDIDATE_PAPERS),
            top_papers_synthesis=old_task.get("top_papers", settings.TOP_SYNTHESIS_PAPERS),
        )
    )
    active_tasks[new_task_id] = task

    return {"old_task_id": task_id, "new_task_id": new_task_id, "status": "retrying"}


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task and its associated landscape."""
    removed = task_store.delete_task(task_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Task not found.")
    return {"task_id": task_id, "status": "deleted"}


@app.get("/api/tasks/{task_id}/replay")
async def replay_task_log(task_id: str):
    """Stream the stored SSE log as if it were live for reviewing past runs."""
    task = task_store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    async def replay_generator():
        for entry in task.get("sse_log", []):
            data = json.dumps(entry)
            yield f"data: {data}\n\n"
            await asyncio.sleep(0.15)  # simulate real-time pacing

    return StreamingResponse(
        replay_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.get("/api/tasks/stats/summary")
async def get_task_stats():
    """Get aggregate task statistics."""
    return task_store.get_stats()


# =====================================================================
# LANDSCAPE ENDPOINTS
# =====================================================================

@app.get("/api/landscape/{landscape_id}", response_model=ResearchLandscape)
async def get_landscape(landscape_id: str):
    landscape = task_store.get_landscape_by_id(landscape_id)
    if not landscape:
        raise HTTPException(status_code=404, detail="Research landscape not found.")
    return landscape


@app.get("/api/recent")
async def list_recent_landscapes():
    return task_store.list_recent_landscapes(limit=12)


@app.get("/api/export/{landscape_id}")
async def export_landscape(
    landscape_id: str,
    format: str = QueryParam(default="markdown", enum=["markdown", "bibtex", "obsidian", "json"]),
):
    landscape = task_store.get_landscape_by_id(landscape_id)
    if not landscape:
        raise HTTPException(status_code=404, detail="Research landscape not found.")

    if format == "bibtex":
        content = ExportService.to_bibtex(landscape)
        return Response(content=content, media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=citations_{landscape_id}.bib"})
    elif format == "obsidian":
        content = ExportService.to_obsidian_markdown(landscape)
        return Response(content=content, media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename=atlas_{landscape_id}_obsidian.md"})
    elif format == "json":
        return Response(content=landscape.model_dump_json(indent=2), media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=atlas_{landscape_id}.json"})
    else:
        content = ExportService.to_markdown(landscape)
        return Response(content=content, media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename=atlas_{landscape_id}.md"})
