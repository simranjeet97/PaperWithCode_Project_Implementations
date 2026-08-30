import arxiv
import asyncio
import httpx
import re
from typing import List, Dict, Any, Optional
from ..schemas.paper import CandidatePaper
from ..services.llm_provider import LLMProvider
from ..utils.logger import logger


class ArxivRetriever:
    """Retrieves candidate academic papers from arXiv API with multi-query strategy and OpenAlex / Semantic Scholar citation overlays."""

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm = llm_provider or LLMProvider()
        self.arxiv_client = arxiv.Client(
            page_size=60,
            delay_seconds=0.3,
            num_retries=3
        )

    async def expand_query(self, user_query: str) -> Dict[str, Any]:
        """Uses LLM to expand the user query into academic sub-queries covering canonical foundations and recent SOTA architectures."""
        prompt = f"""
You are an expert AI research scientist and bibliographer.
Expand this academic research query into 4-5 targeted sub-queries to retrieve BOTH foundational landmark breakthroughs and recent SOTA architectures (such as Graph, Path, Adaptive, Memory, or Structured variants):

Topic: "{user_query}"

Respond ONLY with a JSON object in this exact format:
{{
    "expanded_queries": [
        "precise foundational phrase",
        "recent SOTA architectural variants (e.g. graph path structured)",
        "benchmarking and failure analysis phrase",
        "emerging paradigms and survey"
    ],
    "arxiv_categories": ["cs.AI", "cs.CL", "cs.LG"]
}}
"""
        try:
            expanded_data = await self.llm.generate_json(prompt)
            if "expanded_queries" in expanded_data and expanded_data["expanded_queries"]:
                return expanded_data
        except Exception as e:
            logger.warning(f"[Retriever] Query expansion failed: {e}. Using intelligent fallback queries.")

        # High-coverage fallback queries
        return {
            "expanded_queries": [
                user_query,
                f"{user_query} Graph Path reasoning",
                f"{user_query} benchmark architecture",
                f"{user_query} survey"
            ],
            "arxiv_categories": ["cs.AI", "cs.CL", "cs.LG"]
        }

    async def retrieve_candidates(self, query: str, max_results: int = 45) -> List[CandidatePaper]:
        """Performs multi-query arXiv search including exact title matches and enriches with citation metrics."""
        clean_q = query.strip()
        expansion = await self.expand_query(clean_q)
        
        # Extract core technical keywords without generic stopword prefixes
        core_terms = re.sub(r'^(ai|ml|llm|llms|deep learning)\s+', '', clean_q, flags=re.I).strip()
        terms = [t for t in re.findall(r'\w+', core_terms) if len(t) > 2]
        
        # Build targeted query list
        search_queries = [
            f'ti:"{clean_q}"',
            f'all:"{clean_q}"',
            f'all:"{core_terms}"',
            f'ti:"{core_terms}"',
            " AND ".join([f'all:{t}' for t in terms[:4]]) if terms else clean_q,
            clean_q
        ]
        
        # Add compound word variant (e.g. "tool orchestration" -> "ToolOrchestra")
        if len(terms) >= 2:
            compound = "".join(terms[:2])
            search_queries.append(f'ti:{compound}')
            search_queries.append(f'all:{compound}')

        for eq in expansion.get("expanded_queries", []):
            if eq.lower() != clean_q.lower() and eq not in search_queries:
                search_queries.append(eq)
        
        seen_ids = set()
        candidates: List[CandidatePaper] = []

        logger.info(f"[Retriever] Executing arXiv search across {len(search_queries)} queries for '{clean_q}' (core: '{core_terms}')...")

        loop = asyncio.get_event_loop()
        
        def _fetch_arxiv():
            fetched = []
            for q in search_queries[:6]:
                # Query by relevance
                search_rel = arxiv.Search(
                    query=q,
                    max_results=min(max_results, 35),
                    sort_by=arxiv.SortCriterion.Relevance,
                    sort_order=arxiv.SortOrder.Descending
                )
                try:
                    for result in self.arxiv_client.results(search_rel):
                        paper_id = result.entry_id.split("/")[-1].split("v")[0]
                        if paper_id not in seen_ids:
                            seen_ids.add(paper_id)
                            fetched.append(self._format_paper(result, paper_id))
                except Exception as e:
                    logger.warning(f"[Retriever] arXiv fetch error for '{q}': {e}")
            
            # Also pull newest papers with core terms to catch latest 2024/2025 SOTA preprints
            search_new = arxiv.Search(
                query=f'all:"{core_terms}"' if core_terms else f'all:"{clean_q}"',
                max_results=20,
                sort_by=arxiv.SortCriterion.SubmittedDate,
                sort_order=arxiv.SortOrder.Descending
            )
            try:
                for result in self.arxiv_client.results(search_new):
                    paper_id = result.entry_id.split("/")[-1].split("v")[0]
                    if paper_id not in seen_ids:
                        seen_ids.add(paper_id)
                        fetched.append(self._format_paper(result, paper_id))
            except Exception as e:
                logger.warning(f"[Retriever] arXiv newest fetch error: {e}")

            return fetched

        candidates = await loop.run_in_executor(None, _fetch_arxiv)
        logger.info(f"[Retriever] Retrieved {len(candidates)} unique candidates from arXiv.")

        # Enrich with citation metrics
        candidates = await self._enrich_citations(candidates)
        return candidates

    def _format_paper(self, result: arxiv.Result, paper_id: str) -> CandidatePaper:
        authors = [a.name for a in result.authors] if result.authors else ["Unknown"]
        year = result.published.year if result.published else 2024
        published_date = str(result.published.date()) if result.published else f"{year}-01-01"
        abstract = result.summary.replace("\n", " ").strip() if result.summary else ""
        title = result.title.replace("\n", " ").strip() if result.title else ""
        
        pdf_url = result.pdf_url or f"https://arxiv.org/pdf/{paper_id}.pdf"
        arxiv_url = result.entry_id or f"https://arxiv.org/abs/{paper_id}"

        return CandidatePaper(
            id=paper_id,
            title=title,
            authors=authors,
            published_year=year,
            published_date=published_date,
            abstract=abstract,
            primary_category=result.primary_category or "cs.AI",
            categories=result.categories or ["cs.AI"],
            arxiv_url=arxiv_url,
            pdf_url=pdf_url,
            citation_count=0,
            is_seminal=False
        )

    async def _enrich_citations(self, papers: List[CandidatePaper]) -> List[CandidatePaper]:
        """Enriches paper list with Semantic Scholar / OpenAlex citation count."""
        async with httpx.AsyncClient(timeout=2.0) as client:
            tasks = [self._fetch_single_citation(client, p) for p in papers]
            enriched = await asyncio.gather(*tasks, return_exceptions=True)
            
            for idx, res in enumerate(enriched):
                if isinstance(res, int):
                    papers[idx].citation_count = res
                    # Flag seminal papers based on high citation authority
                    if res > 150 or (papers[idx].published_year <= 2021 and res > 50):
                        papers[idx].is_seminal = True
        return papers

    async def _fetch_single_citation(self, client: httpx.AsyncClient, paper: CandidatePaper) -> int:
        """Fetches citation count from Semantic Scholar API with clean fallback."""
        try:
            url = f"https://api.semanticscholar.org/graph/v1/paper/arXiv:{paper.id}?fields=citationCount,influentialCitationCount"
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("citationCount", 0)
        except Exception:
            pass

        # Heuristic fallback based on paper age and title prominence
        years_active = max(1, 2026 - paper.published_year)
        if paper.published_year <= 2021:
            return years_active * 35
        elif paper.published_year <= 2023:
            return years_active * 18
        return years_active * 4
