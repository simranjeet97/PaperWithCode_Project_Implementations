import pytest
from app.services.arxiv_retriever import ArxivRetriever
from app.services.llm_provider import LLMProvider


@pytest.mark.asyncio
async def test_expand_query():
    llm = LLMProvider("mock")
    retriever = ArxivRetriever(llm)
    res = await retriever.expand_query("Retrieval Augmented Generation")
    
    assert "expanded_queries" in res
    assert len(res["expanded_queries"]) >= 1
    assert "arxiv_categories" in res


@pytest.mark.asyncio
async def test_enrich_citations_heuristic():
    llm = LLMProvider("mock")
    retriever = ArxivRetriever(llm)
    
    from app.schemas.paper import CandidatePaper
    dummy_paper = CandidatePaper(
        id="2005.11401",
        title="Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
        authors=["Patrick Lewis", "Ethan Perez"],
        abstract="Building models that access external knowledge...",
        published_year=2020,
        published_date="2020-05-22",
        arxiv_url="https://arxiv.org/abs/2005.11401",
        primary_category="cs.CL"
    )
    
    enriched = await retriever._enrich_citations([dummy_paper])
    assert len(enriched) == 1
    assert enriched[0].citation_count >= 0
