from pydantic import BaseModel, Field
from typing import Optional


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=300, description="ML / AI research topic in plain English")
    max_candidates: Optional[int] = Field(default=25, ge=5, le=50, description="Max candidate papers to retrieve from arXiv")
    top_papers_synthesis: Optional[int] = Field(default=10, ge=3, le=15, description="Top ranked papers to deeply extract and synthesize")
    use_cache: Optional[bool] = Field(default=True, description="Whether to load from cached landscape if available")
    llm_provider_override: Optional[str] = Field(default=None, description="Optional override for LLM provider (ollama, gemini, openai, mock)")
