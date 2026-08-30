import asyncio
import re
import math
from typing import List, Optional, Tuple
from collections import Counter
from ..schemas.paper import CandidatePaper
from ..config import settings
from ..utils.logger import logger


class CrossEncoderReranker:
    """Two-Stage Multi-Signal Reranker combining Okapi BM25, Cross-Encoder deep token attention, and Citation Authority Prior."""

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.CROSS_ENCODER_MODEL
        self._model = None
        self._load_attempted = False

    def _get_model(self):
        if not self._load_attempted:
            self._load_attempted = True
            try:
                from sentence_transformers import CrossEncoder
                logger.info(f"[CrossEncoder] Loading model '{self.model_name}'...")
                self._model = CrossEncoder(self.model_name, max_length=512)
                logger.info(f"[CrossEncoder] Model '{self.model_name}' loaded successfully.")
            except Exception as e:
                logger.warning(f"[CrossEncoder] Could not load SentenceTransformers ({e}). Using fast heuristic semantic reranker.")
                self._model = None
        return self._model

    async def rerank(self, query: str, candidates: List[CandidatePaper], top_k: int = 10) -> List[CandidatePaper]:
        """Reranks candidate papers using Two-Stage Multi-Signal Reciprocal Rank Fusion (RRF)."""
        if not candidates:
            return []

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_rerank, query, candidates, top_k)

    def _sync_rerank(self, query: str, candidates: List[CandidatePaper], top_k: int) -> List[CandidatePaper]:
        # -------------------------------------------------------------
        # STAGE 1: Lexical Okapi BM25 Ranking
        # -------------------------------------------------------------
        bm25_ranks = self._compute_bm25_ranks(query, candidates)

        # -------------------------------------------------------------
        # STAGE 2: Deep Cross-Encoder Token Attention
        # -------------------------------------------------------------
        model = self._get_model()
        ce_scores = {}

        if model is not None:
            try:
                # Prepare query-document pairs with FULL abstract and metadata
                pairs = [[query, f"{p.title} ({p.published_year}, {p.primary_category}). {p.abstract}"] for p in candidates]
                raw_scores = model.predict(pairs)

                for paper, score in zip(candidates, raw_scores):
                    val = float(score.item() if hasattr(score, 'item') else score)
                    norm_score = 1.0 / (1.0 + math.exp(-val))
                    paper.cross_encoder_score = round(norm_score, 4)
                    ce_scores[paper.id] = norm_score

            except Exception as e:
                logger.warning(f"[CrossEncoder] Neural scoring failed ({e}). Falling back to heuristic.")
                self._apply_heuristic_ranking(query, candidates)
                ce_scores = {p.id: p.cross_encoder_score or 0.5 for p in candidates}
        else:
            self._apply_heuristic_ranking(query, candidates)
            ce_scores = {p.id: p.cross_encoder_score or 0.5 for p in candidates}

        # Rank by Cross-Encoder
        ce_sorted_ids = sorted(ce_scores.keys(), key=lambda pid: ce_scores[pid], reverse=True)
        ce_ranks = {pid: rank for rank, pid in enumerate(ce_sorted_ids)}

        # -------------------------------------------------------------
        # STAGE 3: Multi-Signal Reciprocal Rank Fusion (RRF) + Authority
        # -------------------------------------------------------------
        k_rrf = 60
        query_terms = set(re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", query.lower()))

        def _calculate_fused_score(p: CandidatePaper) -> float:
            r_bm25 = bm25_ranks.get(p.id, 0)
            r_ce = ce_ranks.get(p.id, 0)

            # Reciprocal rank fusion score (55% Cross-Encoder, 35% BM25 lexical precision)
            rrf = (0.55 / (k_rrf + r_ce)) + (0.35 / (k_rrf + r_bm25))

            # Citation Authority Prior (logarithmic scaling)
            citation_boost = min(0.008, 0.0015 * math.log1p(p.citation_count))

            # Exact method title boost (e.g. "PathRAG" or exact phrase in title)
            title_lower = p.title.lower()
            exact_match_boost = 0.0
            if any(term in title_lower for term in query_terms if len(term) > 3):
                exact_match_boost = 0.003

            return rrf + citation_boost + exact_match_boost

        sorted_candidates = sorted(candidates, key=_calculate_fused_score, reverse=True)

        for rank, p in enumerate(sorted_candidates[:top_k], start=1):
            p.rank = rank

        return sorted_candidates[:top_k]

    def _compute_bm25_ranks(self, query: str, candidates: List[CandidatePaper], k1: float = 1.5, b: float = 0.75) -> dict:
        """Computes Okapi BM25 ranks across candidate papers."""
        def tokenize(text: str):
            return re.findall(r'\b[a-zA-Z0-9_\-]{2,}\b', text.lower())

        docs = [tokenize(f"{p.title} {p.title} {p.abstract}") for p in candidates]
        query_tokens = tokenize(query)
        N = len(docs)
        avgdl = sum(len(d) for d in docs) / max(1, N)

        df = Counter()
        for d in docs:
            df.update(set(d))

        scores = {}
        for p, d in zip(candidates, docs):
            doc_len = len(d)
            tf = Counter(d)
            score = 0.0
            for t in query_tokens:
                if t in tf:
                    n_t = df.get(t, 0)
                    idf = math.log((N - n_t + 0.5) / (n_t + 0.5) + 1.0)
                    term_tf = tf[t]
                    num = term_tf * (k1 + 1)
                    denom = term_tf + k1 * (1 - b + b * (doc_len / avgdl))
                    score += idf * (num / denom)
            scores[p.id] = score

        sorted_by_bm25 = sorted(scores.keys(), key=lambda pid: scores[pid], reverse=True)
        return {pid: rank for rank, pid in enumerate(sorted_by_bm25)}

    def _apply_heuristic_ranking(self, query: str, candidates: List[CandidatePaper]):
        """Fast BM25 token overlap fallback."""
        query_tokens = set(re.findall(r"\w+", query.lower()))
        for paper in candidates:
            title_tokens = set(re.findall(r"\w+", paper.title.lower()))
            abstract_tokens = set(re.findall(r"\w+", paper.abstract.lower()))

            title_overlap = len(query_tokens & title_tokens) / max(len(query_tokens), 1)
            abstract_overlap = len(query_tokens & abstract_tokens) / max(len(query_tokens), 1)

            raw_score = (title_overlap * 0.7) + (abstract_overlap * 0.3)
            paper.cross_encoder_score = round(min(0.98, max(0.35, 0.4 + raw_score * 0.55)), 4)
