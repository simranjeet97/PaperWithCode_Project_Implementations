import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.storage.db import db
from app.schemas.landscape import ResearchLandscape
from app.schemas.paper import ExtractedPaperDossier
from app.schemas.landscape import GraphNode, GraphEdge, ClusterTaxonomy, ScientificTension, OpenFrontier, ReadingRoadmapItem


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ResearchAtlas" in data["service"]


def test_create_and_get_landscape(client):
    # Seed a landscape in db
    mock_landscape = ResearchLandscape(
        id="test-123",
        query="Diffusion Models",
        generated_at="2026-08-30 12:00:00 UTC",
        field_summary="Diffusion models generate data via iterative denoising.",
        total_candidates_analyzed=15,
        synthesized_papers_count=1,
        clusters=[
            ClusterTaxonomy(
                id="c1",
                name="Score-based Generative Models",
                description="Langevin dynamics and SDEs",
                color="#10B981",
                paper_ids=["p1"],
                key_characteristics=["SDE formulations"]
            )
        ],
        papers=[
            ExtractedPaperDossier(
                id="p1",
                title="Denoising Diffusion Probabilistic Models",
                authors=["Jonathan Ho"],
                published_year=2020,
                published_date="2020-06-19",
                arxiv_url="https://arxiv.org/abs/2006.11239",
                primary_category="cs.LG",
                citation_count=4500,
                cross_encoder_score=0.98,
                problem_statement="High quality image synthesis without GAN instabilities.",
                proposed_method="Variational bound on Markov chain denoising.",
                key_results="FID 3.17 on CIFAR-10.",
                main_contribution="Proved diffusion rivals GAN quality.",
                cluster_category="Score-based Generative Models",
                influences=[]
            )
        ],
        nodes=[
            GraphNode(
                id="p1",
                label="DDPM (Ho et al.)",
                title="Denoising Diffusion Probabilistic Models",
                cluster="Score-based Generative Models",
                year=2020,
                score=0.98,
                citation_count=4500,
                is_seminal=True,
                x=150.0,
                y=250.0,
                summary_snippet="Proved diffusion rivals GAN quality.",
                arxiv_url="https://arxiv.org/abs/2006.11239"
            )
        ],
        edges=[],
        tensions=[
            ScientificTension(
                id="t1",
                topic="Sampling Steps vs Sample Quality",
                approach_a="Standard 1000-step DDPM",
                approach_b="Accelerated DDIM / Flow Matching",
                trade_off_summary="Fidelity vs speed trade-off in reverse diffusion trajectory.",
                key_papers_a=["p1"],
                key_papers_b=[],
                open_question="One-step diffusion without quality degradation?"
            )
        ],
        open_frontiers=[
            OpenFrontier(
                id="f1",
                title="Real-Time 60 FPS Video Diffusion",
                description="High resolution 3D spatiotemporal latency bottlenecks.",
                severity_or_importance="Critical",
                relevant_papers=["p1"]
            )
        ],
        reading_roadmap=[
            ReadingRoadmapItem(
                step=1,
                paper_id="p1",
                title="Denoising Diffusion Probabilistic Models",
                category_label="Score-based Generative Models",
                recommended_focus="Focus on the variational lower bound derivation.",
                difficulty="Foundational",
                estimated_read_time_mins=30
            )
        ]
    )
    
    db.save_landscape(mock_landscape)
    
    # 1. Fetch by ID
    res = client.get("/api/landscape/test-123")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "test-123"
    assert data["query"] == "Diffusion Models"
    assert len(data["papers"]) == 1
    
    # 2. Test Markdown Export
    export_md = client.get("/api/export/test-123?format=markdown")
    assert export_md.status_code == 200
    assert "Research Field Atlas: Diffusion Models" in export_md.text

    # 3. Test BibTeX Export
    export_bib = client.get("/api/export/test-123?format=bibtex")
    assert export_bib.status_code == 200
    assert "@article" in export_bib.text

    # 4. Test Search endpoint cached return
    search_res = client.post("/api/search", json={"query": "diffusion models", "use_cache": True})
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["status"] == "cached"
