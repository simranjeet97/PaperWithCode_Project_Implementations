from pydantic import BaseModel, Field
from typing import List, Optional


class CandidatePaper(BaseModel):
    id: str = Field(..., description="Unique paper ID (e.g. arXiv ID or slug)")
    title: str
    authors: List[str] = Field(default_factory=list)
    abstract: str
    published_year: int
    published_date: str
    arxiv_url: str
    pdf_url: Optional[str] = None
    primary_category: str = "cs.AI"
    citation_count: int = 0
    influential_citation_count: int = 0
    cross_encoder_score: Optional[float] = None
    rank: Optional[int] = None
    is_seminal: bool = False


class ExtractedPaperDossier(BaseModel):
    id: str
    title: str
    authors: List[str]
    published_year: int
    published_date: str
    arxiv_url: str
    pdf_url: Optional[str] = None
    primary_category: str
    citation_count: int = 0
    cross_encoder_score: float = 0.0
    
    # Deep LLM-extracted structured fields
    problem_statement: str = Field(..., description="Core problem or bottleneck addressed")
    proposed_method: str = Field(..., description="Core algorithm, mechanism, or architectural contribution")
    key_results: str = Field(..., description="Key benchmark metrics and performance gains")
    main_contribution: str = Field(..., description="Why this paper matters in the broader landscape")
    limitations: Optional[str] = Field(None, description="Known limitations or trade-offs")
    code_url: Optional[str] = Field(None, description="GitHub repository or implementation link")
    cluster_category: str = Field(..., description="Assigned research cluster or sub-school of thought")
    influences: List[str] = Field(default_factory=list, description="Precursor techniques or foundation papers")
