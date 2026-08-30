import pytest
import os
import tempfile
from app.storage.task_store import TaskStore
from app.schemas.landscape import ResearchLandscape, ClusterTaxonomy, ScientificTension, OpenFrontier, ReadingRoadmapItem


@pytest.fixture
def temp_store():
    fd, path = tempfile.mkstemp(suffix=".json")
    os.close(fd)
    store = TaskStore(store_path=path)
    yield store
    if os.path.exists(path):
        os.remove(path)


def test_task_create_and_lifecycle(temp_store: TaskStore):
    # 1. Create task
    task = temp_store.create_task(
        task_id="t1",
        query="Test Query",
        llm_provider="ollama",
        llm_model="qwen2.5:7b"
    )
    assert task["task_id"] == "t1"
    assert task["status"] == "queued"
    assert task["query"] == "Test Query"

    # 2. Mark running
    temp_store.mark_running("t1")
    t = temp_store.get_task("t1")
    assert t["status"] == "running"
    assert t["started_at"] is not None

    # 3. Append SSE log
    temp_store.append_sse_log("t1", "RETRIEVAL", 25, "Crawling preprints...")
    t = temp_store.get_task("t1")
    assert len(t["sse_log"]) == 1
    assert t["sse_log"][0]["msg"] == "Crawling preprints..."

    # 4. Mark completed
    temp_store.mark_completed("t1", landscape_id="l1")
    t = temp_store.get_task("t1")
    assert t["status"] == "completed"
    assert t["progress"] == 100
    assert t["landscape_id"] == "l1"

    # 5. Stats
    stats = temp_store.get_stats()
    assert stats["total_tasks"] == 1
    assert stats["completed"] == 1
    assert stats["success_rate_pct"] == 100.0


def test_task_cancel_and_retry(temp_store: TaskStore):
    temp_store.create_task("t2", "Cancel Test")
    temp_store.mark_running("t2")
    temp_store.mark_cancelled("t2")
    
    t = temp_store.get_task("t2")
    assert t["status"] == "cancelled"

    # Delete
    deleted = temp_store.delete_task("t2")
    assert deleted is True
    assert temp_store.get_task("t2") is None


def test_landscape_persistence_in_tinydb(temp_store: TaskStore):
    ls = ResearchLandscape(
        id="ls1",
        query="Speculative Decoding",
        generated_at="2026-08-30 22:00:00 UTC",
        field_summary="Test summary for speculative decoding.",
        total_candidates_analyzed=10,
        synthesized_papers_count=5,
        clusters=[
            ClusterTaxonomy(id="c1", name="Tree Drafting", description="Tree draft desc", color="#2563EB")
        ],
        tensions=[
            ScientificTension(
                id="t1",
                topic="Draft Overhead vs Acceptance Rate",
                approach_a="Small Model",
                approach_b="Retrieval Head",
                trade_off_summary="Trade-off details",
                open_question="How to balance?"
            )
        ],
        open_frontiers=[
            OpenFrontier(
                id="f1",
                title="Verification Bottleneck",
                description="Why it fails",
                severity_or_importance="Critical",
                why_problem_exists="Softmax latency",
                why_existing_methods_fail="Sequential check",
                concrete_failure_example="Code generation"
            )
        ],
        reading_roadmap=[
            ReadingRoadmapItem(
                step=1,
                paper_id="p1",
                title="EAGLE",
                category_label="Milestone",
                difficulty="Intermediate",
                recommended_focus="Tree routing"
            )
        ]
    )

    temp_store.save_landscape(ls)

    # Fetch by ID
    fetched = temp_store.get_landscape_by_id("ls1")
    assert fetched is not None
    assert fetched.query == "Speculative Decoding"
    assert len(fetched.clusters) == 1
    assert len(fetched.open_frontiers) == 1
    assert fetched.open_frontiers[0].severity_or_importance == "Critical"

    # Fetch by query (case-insensitive normalized)
    fetched_q = temp_store.get_landscape_by_query("speculative  decoding")
    assert fetched_q is not None
    assert fetched_q.id == "ls1"

    # Recent list
    recent = temp_store.list_recent_landscapes()
    assert len(recent) == 1
    assert recent[0]["query"] == "Speculative Decoding"
