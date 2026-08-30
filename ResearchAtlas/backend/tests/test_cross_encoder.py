import pytest
from app.services.cross_encoder_rerank import CrossEncoderReranker
from app.schemas.paper import CandidatePaper


@pytest.mark.asyncio
async def test_cross_encoder_ranking_returns_results():
    reranker = CrossEncoderReranker()
    
    p1 = CandidatePaper(
        id="p1",
        title="Retrieval-Augmented Generation for NLP",
        authors=["Alice"],
        abstract="We present retrieval augmented generation for large language models.",
        published_year=2021,
        published_date="2021-01-01",
        arxiv_url="http://arxiv.org/abs/p1",
        citation_count=500
    )
    
    p2 = CandidatePaper(
        id="p2",
        title="Unrelated Recipe Optimization for Pasta",
        authors=["Bob"],
        abstract="Cooking techniques for authentic Italian pasta sauces.",
        published_year=2022,
        published_date="2022-01-01",
        arxiv_url="http://arxiv.org/abs/p2",
        citation_count=10
    )
    
    results = await reranker.rerank("Retrieval-Augmented Generation", [p2, p1], top_k=2)
    
    assert len(results) == 2
    # Every paper should have a score and rank assigned
    assert results[0].rank == 1
    assert results[1].rank == 2
    assert results[0].cross_encoder_score is not None
    assert results[1].cross_encoder_score is not None
    assert results[0].cross_encoder_score >= results[1].cross_encoder_score


@pytest.mark.asyncio
async def test_cross_encoder_empty_input():
    reranker = CrossEncoderReranker()
    results = await reranker.rerank("test query", [], top_k=5)
    assert len(results) == 0
