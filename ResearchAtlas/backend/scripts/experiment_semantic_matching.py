"""Comprehensive Semantic Matching & Reranking Experiment Suite for ResearchAtlas.

Compares 5 Semantic Matching & Reranking Paradigms:
1. Pure Lexical BM25 (Okapi BM25)
2. Bi-Encoder Dense Semantic Embedding (all-MiniLM-L6-v2)
3. Cross-Encoder Deep Interaction (ms-marco-MiniLM-L-6-v2)
4. Scientific Domain Bi-Encoder (SPECTER / BGE-small)
5. Hybrid Multi-Signal Reciprocal Rank Fusion (RRF) + Authority Prior
"""

import time
import math
import re
import numpy as np
from typing import List, Dict, Any, Tuple
from collections import Counter


class BenchmarkPaper:
    def __init__(self, id: str, title: str, abstract: str, year: int, citations: int, is_ground_truth: bool = False):
        self.id = id
        self.title = title
        self.abstract = abstract
        self.year = year
        self.citations = citations
        self.is_ground_truth = is_ground_truth


# Test Datasets representing realistic arXiv candidate pools
DATASETS = {
    "Retrieval-Augmented Generation": {
        "query": "Retrieval-Augmented Generation multi-hop graph reasoning and path retrieval",
        "candidates": [
            BenchmarkPaper("p1", "PathRAG: Pruning Graph-based Retrieval Augmented Generation with Relational Paths", "Graph-based RAG methods struggle with dense distractors. PathRAG introduces path-constrained relational indexing to filter multi-hop reasoning graphs.", 2025, 42, is_ground_truth=True),
            BenchmarkPaper("p2", "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", "We build RAG models where the parametric memory is a pre-trained seq2seq transformer and non-parametric memory is a dense vector index of Wikipedia.", 2020, 4800, is_ground_truth=True),
            BenchmarkPaper("p3", "From Local to Global: A Graph RAG Approach to Query-Focused Summarization", "We introduce Graph RAG which combines knowledge graph extraction with community summarization for holistic dataset sensemaking.", 2024, 380, is_ground_truth=True),
            BenchmarkPaper("p4", "Dense Passage Retrieval for Open-Domain Question Answering", "Open-domain question answering relies on efficient passage retrieval. We show that retrieval can be implemented using dense representations learned from questions.", 2020, 3200, is_ground_truth=True),
            BenchmarkPaper("p5", "Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection", "Self-RAG trains a single arbitrary language model to adaptively retrieve passages on-demand and critique its own generations.", 2023, 720, is_ground_truth=True),
            BenchmarkPaper("p6", "A Survey on Graph Neural Networks for Chemical Molecule Property Prediction", "Graph neural networks have become a de facto standard for molecular property prediction in computational chemistry.", 2022, 110, is_ground_truth=False),
            BenchmarkPaper("p7", "High-Resolution Image Synthesis with Latent Diffusion Models", "Diffusion models achieve state of the art results by decomposing image formation into sequential denoising autoencoders.", 2022, 8500, is_ground_truth=False),
            BenchmarkPaper("p8", "Corrective Retrieval Augmented Generation (CRAG)", "CRAG designs a lightweight retrieval evaluator to assess the quality of retrieved documents for query refinement.", 2024, 210, is_ground_truth=True),
            BenchmarkPaper("p9", "Reinforcement Learning with Human Feedback for Autonomous Driving Agents", "We explore policy gradient methods to align vehicle trajectory planning with human safety preferences.", 2023, 45, is_ground_truth=False),
            BenchmarkPaper("p10", "Adaptive Chunking for Long-Context Document Retrieval in RAG", "Fixed chunking boundaries create semantic fragmentation. We present dynamic semantic boundary chunking for RAG pipelines.", 2024, 85, is_ground_truth=True),
        ]
    },
    "Speculative Decoding": {
        "query": "Speculative Decoding tree drafting verification for fast LLM inference",
        "candidates": [
            BenchmarkPaper("s1", "Fast Inference from Large Language Models in Speculative Decoding", "We introduce speculative decoding, a paradigm to accelerate LLM inference by drafting multiple candidate tokens in parallel with a smaller model.", 2023, 620, is_ground_truth=True),
            BenchmarkPaper("s2", "EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty", "EAGLE accelerates LLMs by autoregressively generating draft tokens at the hidden feature layer rather than discrete LM heads.", 2024, 240, is_ground_truth=True),
            BenchmarkPaper("s3", "Medusa: Simple LLM Inference Acceleration with Multiple Decoding Heads", "Medusa introduces multiple non-autoregressive decoding heads on top of the original LLM to generate draft tokens without a separate draft model.", 2024, 310, is_ground_truth=True),
            BenchmarkPaper("s4", "REST: Retrieval-Based Speculative Decoding", "REST uses datastore retrieval of n-grams to generate candidate draft tokens for speculative decoding without needing a draft model.", 2023, 130, is_ground_truth=True),
            BenchmarkPaper("s5", "LoRA: Low-Rank Adaptation of Large Language Models", "We introduce LoRA which freezes pre-trained model weights and injects trainable rank decomposition matrices into Transformer layers.", 2021, 6200, is_ground_truth=False),
            BenchmarkPaper("s6", "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning", "We optimize attention computation by minimizing memory reads/writes between GPU HBM and SRAM.", 2023, 1800, is_ground_truth=False),
            BenchmarkPaper("s7", "SpecInfer: Accelerating Generative LLM Serving with Tree-based Speculative Inference", "SpecInfer proposes a tree-based speculative verification algorithm to verify multiple speculative candidate tokens in a single execution step.", 2023, 190, is_ground_truth=True),
            BenchmarkPaper("s8", "Direct Preference Optimization: Your Language Model is Secretly a Reward Model", "DPO derives a closed-form solution to RLHF without training an explicit reward model or sampling during fine-tuning.", 2023, 2400, is_ground_truth=False),
        ]
    }
}


# =====================================================================
# 1. METHOD 1: Lexical BM25 (Okapi BM25)
# =====================================================================
class BM25Matcher:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b[a-zA-Z0-9_\-]{2,}\b', text.lower())

    def score_candidates(self, query: str, candidates: List[BenchmarkPaper]) -> List[Tuple[BenchmarkPaper, float]]:
        docs = [self._tokenize(f"{p.title} {p.title} {p.abstract}") for p in candidates]
        query_tokens = self._tokenize(query)
        N = len(docs)
        avgdl = sum(len(d) for d in docs) / max(1, N)

        # Compute document frequencies
        df = Counter()
        for d in docs:
            df.update(set(d))

        scores = []
        for p, d in zip(candidates, docs):
            doc_len = len(d)
            tf = Counter(d)
            score = 0.0
            for t in query_tokens:
                if t in tf:
                    n_t = df.get(t, 0)
                    idf = math.log((N - n_t + 0.5) / (n_t + 0.5) + 1.0)
                    term_tf = tf[t]
                    num = term_tf * (self.k1 + 1)
                    denom = term_tf + self.k1 * (1 - self.b + self.b * (doc_len / avgdl))
                    score += idf * (num / denom)
            scores.append((p, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores


# =====================================================================
# 2. METHOD 2: Bi-Encoder Dense Embedding (Cosine Similarity)
# =====================================================================
class DenseBiEncoderMatcher:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(model_name)

    def score_candidates(self, query: str, candidates: List[BenchmarkPaper]) -> List[Tuple[BenchmarkPaper, float]]:
        texts = [f"{p.title}: {p.abstract}" for p in candidates]
        query_emb = self.model.encode(query, normalize_embeddings=True)
        doc_embs = self.model.encode(texts, normalize_embeddings=True)

        # Cosine similarity is dot product when normalized
        sims = np.dot(doc_embs, query_emb)
        results = [(p, float(s)) for p, s in zip(candidates, sims)]
        results.sort(key=lambda x: x[1], reverse=True)
        return results


# =====================================================================
# 3. METHOD 3: Cross-Encoder Token Interaction (ms-marco-MiniLM-L-6-v2)
# =====================================================================
class CrossEncoderMatcher:
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        from sentence_transformers import CrossEncoder
        self.model = CrossEncoder(model_name, max_length=512)

    def score_candidates(self, query: str, candidates: List[BenchmarkPaper]) -> List[Tuple[BenchmarkPaper, float]]:
        pairs = [[query, f"{p.title}. {p.abstract}"] for p in candidates]
        scores = self.model.predict(pairs)
        results = []
        for p, s in zip(candidates, scores):
            val = float(s.item() if hasattr(s, 'item') else s)
            prob = 1.0 / (1.0 + math.exp(-val))
            results.append((p, prob))
        results.sort(key=lambda x: x[1], reverse=True)
        return results


# =====================================================================
# 4. METHOD 4: Hybrid Reciprocal Rank Fusion (RRF) + Authority Prior
# =====================================================================
class HybridRRFMatcher:
    def __init__(self, bi_encoder: DenseBiEncoderMatcher, cross_encoder: CrossEncoderMatcher, bm25: BM25Matcher):
        self.bi_encoder = bi_encoder
        self.cross_encoder = cross_encoder
        self.bm25 = bm25

    def score_candidates(self, query: str, candidates: List[BenchmarkPaper], k: int = 60) -> List[Tuple[BenchmarkPaper, float]]:
        # 1. Lexical BM25 ranking
        bm25_ranked = self.bm25.score_candidates(query, candidates)
        bm25_ranks = {p.id: rank for rank, (p, _) in enumerate(bm25_ranked)}

        # 2. Dense Bi-Encoder ranking
        dense_ranked = self.bi_encoder.score_candidates(query, candidates)
        dense_ranks = {p.id: rank for rank, (p, _) in enumerate(dense_ranked)}

        # 3. Cross-Encoder ranking
        ce_ranked = self.cross_encoder.score_candidates(query, candidates)
        ce_ranks = {p.id: rank for rank, (p, _) in enumerate(ce_ranked)}
        ce_scores = {p.id: score for p, score in ce_ranked}

        # 4. Compute Multi-Signal Hybrid RRF Score
        fused_results = []
        for p in candidates:
            r_bm25 = bm25_ranks[p.id]
            r_dense = dense_ranks[p.id]
            r_ce = ce_ranks[p.id]

            # RRF formula with weighting
            rrf_score = (
                (0.35 / (k + r_bm25)) +
                (0.30 / (k + r_dense)) +
                (0.45 / (k + r_ce))
            )

            # Scientific Authority prior (log-scaled citation velocity)
            citation_boost = min(0.008, 0.0015 * math.log1p(p.citations))
            final_score = rrf_score + citation_boost

            fused_results.append((p, final_score))

        fused_results.sort(key=lambda x: x[1], reverse=True)
        return fused_results


# =====================================================================
# EVALUATION METRICS
# =====================================================================
def compute_metrics(ranked_candidates: List[Tuple[BenchmarkPaper, float]], top_k: int = 5) -> Dict[str, float]:
    """Calculates MRR, Precision@K, Recall@K, and NDCG@K."""
    top_items = ranked_candidates[:top_k]
    
    # Precision@K
    relevant_in_top = sum(1 for p, _ in top_items if p.is_ground_truth)
    p_at_k = relevant_in_top / top_k

    # Total ground truth in dataset
    total_gt = sum(1 for p, _ in ranked_candidates if p.is_ground_truth)
    r_at_k = relevant_in_top / max(1, total_gt)

    # MRR (Mean Reciprocal Rank)
    mrr = 0.0
    for rank, (p, _) in enumerate(ranked_candidates, 1):
        if p.is_ground_truth:
            mrr = 1.0 / rank
            break

    # NDCG@K
    dcg = 0.0
    for i, (p, _) in enumerate(top_items):
        if p.is_ground_truth:
            dcg += 1.0 / math.log2(i + 2)

    idcg = sum(1.0 / math.log2(i + 2) for i in range(min(top_k, total_gt)))
    ndcg = (dcg / idcg) if idcg > 0 else 0.0

    return {
        "p_at_k": round(p_at_k, 3),
        "r_at_k": round(r_at_k, 3),
        "mrr": round(mrr, 3),
        "ndcg_at_k": round(ndcg, 3)
    }


def run_experiment():
    print("=" * 80)
    print("🔬 RUNNING RESEARCHATLAS SEMANTIC MATCHING EXPERIMENT BENCHMARK")
    print("=" * 80)

    print("\n⏳ Initializing semantic matcher models...")
    t0 = time.time()
    bm25 = BM25Matcher()
    dense = DenseBiEncoderMatcher("all-MiniLM-L6-v2")
    cross_enc = CrossEncoderMatcher("cross-encoder/ms-marco-MiniLM-L-6-v2")
    hybrid = HybridRRFMatcher(dense, cross_enc, bm25)
    print(f"✅ Models loaded in {time.time() - t0:.2f}s\n")

    methods = [
        ("1. Pure Lexical BM25", bm25),
        ("2. Bi-Encoder Dense (all-MiniLM)", dense),
        ("3. Cross-Encoder (MS-MARCO MiniLM)", cross_enc),
        ("4. Hybrid RRF + Authority Prior", hybrid),
    ]

    all_results = {name: {"p_at_k": [], "r_at_k": [], "mrr": [], "ndcg_at_k": [], "latency_ms": []} for name, _ in methods}

    for topic, data in DATASETS.items():
        query = data["query"]
        candidates = data["candidates"]
        print(f"\n📁 Dataset: '{topic}' (Query: '{query[:50]}...', Candidates: {len(candidates)})")
        print("-" * 80)

        for name, matcher in methods:
            start_t = time.perf_counter()
            ranked = matcher.score_candidates(query, candidates)
            latency = (time.perf_counter() - start_t) * 1000.0

            metrics = compute_metrics(ranked, top_k=5)
            all_results[name]["p_at_k"].append(metrics["p_at_k"])
            all_results[name]["r_at_k"].append(metrics["r_at_k"])
            all_results[name]["mrr"].append(metrics["mrr"])
            all_results[name]["ndcg_at_k"].append(metrics["ndcg_at_k"])
            all_results[name]["latency_ms"].append(latency)

            top_titles = [f"'{p.title[:28]}...' ({'✅' if p.is_ground_truth else '❌'})" for p, _ in ranked[:3]]
            print(f"  [{name:<32}] P@5: {metrics['p_at_k']:.2f} | R@5: {metrics['r_at_k']:.2f} | NDCG@5: {metrics['ndcg_at_k']:.2f} | Latency: {latency:5.1f}ms")
            print(f"    ↳ Top 3: {', '.join(top_titles)}")

    # Summary Table
    print("\n" + "=" * 80)
    print("📊 AGGREGATE BENCHMARK RESULTS ACROSS TEST SET")
    print("=" * 80)
    print(f"{'Method / Architecture':<36} | {'P@5':<8} | {'Recall@5':<10} | {'MRR':<8} | {'NDCG@5':<8} | {'Latency':<10}")
    print("-" * 88)

    for name, _ in methods:
        avg_p = np.mean(all_results[name]["p_at_k"])
        avg_r = np.mean(all_results[name]["r_at_k"])
        avg_mrr = np.mean(all_results[name]["mrr"])
        avg_ndcg = np.mean(all_results[name]["ndcg_at_k"])
        avg_lat = np.mean(all_results[name]["latency_ms"])
        print(f"{name:<36} | {avg_p:<8.3f} | {avg_r:<10.3f} | {avg_mrr:<8.3f} | {avg_ndcg:<8.3f} | {avg_lat:<8.1f}ms")

    print("=" * 80)


if __name__ == "__main__":
    run_experiment()
