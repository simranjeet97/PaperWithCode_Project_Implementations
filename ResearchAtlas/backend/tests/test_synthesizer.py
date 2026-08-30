import pytest
from app.services.landscape_synthesizer import LandscapeSynthesizer
from app.services.llm_provider import LLMProvider
from app.schemas.paper import ExtractedPaperDossier


@pytest.mark.asyncio
async def test_landscape_synthesizer():
    llm = LLMProvider("mock")
    synthesizer = LandscapeSynthesizer(llm)
    
    p1 = ExtractedPaperDossier(
        id="p1",
        title="Foundational RAG",
        authors=["Author 1"],
        published_year=2020,
        published_date="2020-01-01",
        arxiv_url="http://arxiv.org/abs/p1",
        primary_category="cs.CL",
        citation_count=500,
        cross_encoder_score=0.95,
        problem_statement="Hallucination in static language models.",
        proposed_method="Retrieval-augmented parametric generation.",
        key_results="+15% BLEU/EM gains.",
        main_contribution="Established RAG paradigm.",
        cluster_category="Foundational RAG",
        influences=[]
    )
    
    p2 = ExtractedPaperDossier(
        id="p2",
        title="Graph RAG: Unifying Knowledge Graphs with LLM Retrieval",
        authors=["Author 2"],
        published_year=2024,
        published_date="2024-02-01",
        arxiv_url="http://arxiv.org/abs/p2",
        primary_category="cs.AI",
        citation_count=180,
        cross_encoder_score=0.91,
        problem_statement="Multi-hop entity relations are lost in vector chunks.",
        proposed_method="Hierarchical knowledge graph community summaries.",
        key_results="+24% comprehensive multi-hop query answering.",
        main_contribution="Graph-native RAG.",
        cluster_category="Graph & Structural Indexing",
        influences=["Foundational RAG"]
    )
    
    landscape = await synthesizer.synthesize("Retrieval Augmented Generation", [p1, p2])
    
    assert landscape.id is not None
    assert landscape.query == "Retrieval Augmented Generation"
    assert len(landscape.clusters) >= 1
    assert len(landscape.nodes) == 2
    assert len(landscape.reading_roadmap) >= 1
    assert landscape.field_summary != ""
    assert landscape.synthesized_papers_count == 2


@pytest.mark.asyncio
async def test_landscape_synthesizer_empty():
    llm = LLMProvider("mock")
    synthesizer = LandscapeSynthesizer(llm)
    landscape = await synthesizer.synthesize("empty query", [])
    
    assert landscape.synthesized_papers_count == 0
    assert "No high-confidence papers" in landscape.field_summary
