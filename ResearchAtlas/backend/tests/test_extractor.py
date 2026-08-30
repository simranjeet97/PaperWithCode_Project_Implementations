import pytest
from app.services.paper_extractor import PaperExtractor
from app.services.llm_provider import LLMProvider
from app.schemas.paper import CandidatePaper


@pytest.mark.asyncio
async def test_paper_extractor_batch():
    llm = LLMProvider("mock")
    extractor = PaperExtractor(llm)
    
    paper = CandidatePaper(
        id="2312.10997",
        title="Retrieval-Augmented Generation for AI-Generated Content: A Survey",
        authors=["Penghao Zhao", "Haitao Zheng"],
        abstract="Retrieval-Augmented Generation (RAG) merges retrieval mechanisms with generative models.",
        published_year=2023,
        published_date="2023-12-18",
        arxiv_url="https://arxiv.org/abs/2312.10997",
        citation_count=120
    )
    
    dossiers = await extractor.extract_batch([paper], topic="RAG Survey")
    assert len(dossiers) == 1
    dossier = dossiers[0]
    
    assert dossier.id == "2312.10997"
    assert dossier.problem_statement != ""
    assert dossier.proposed_method != ""
    assert dossier.main_contribution != ""
    assert dossier.cluster_category != ""
