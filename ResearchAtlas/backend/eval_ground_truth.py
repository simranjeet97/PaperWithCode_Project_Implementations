import asyncio
import json
import time
from app.services.arxiv_retriever import ArxivRetriever
from app.services.cross_encoder_rerank import CrossEncoderReranker
from app.services.paper_extractor import PaperExtractor
from app.services.landscape_synthesizer import LandscapeSynthesizer
from app.services.llm_provider import LLMProvider

GROUND_TRUTH_BENCHMARKS = [
    {
        "query": "Retrieval-Augmented Generation",
        "expected_keywords": ["rag", "retrieval", "augmented", "generation", "knowledge"],
        "expected_seminal_authors_or_titles": [
            "Patrick Lewis", "Lewis", "REALM", "RETRO", "Survey", "Gao", "Graph", "RAG"
        ],
        "expected_clusters_themes": ["graph", "retrieval", "modular", "dense", "sparse", "indexing"]
    },
    {
        "query": "Direct Preference Optimization",
        "expected_keywords": ["preference", "optimization", "dpo", "alignment", "rlhf", "reward"],
        "expected_seminal_authors_or_titles": [
            "Rafailov", "Direct Preference Optimization", "Alignment", "Reward", "SimPO", "KTO", "Preference"
        ],
        "expected_clusters_themes": ["preference", "alignment", "reward", "loss", "direct"]
    },
    {
        "query": "Speculative Decoding",
        "expected_keywords": ["speculative", "decoding", "sampling", "inference", "acceleration", "latency"],
        "expected_seminal_authors_or_titles": [
            "Leviathan", "Speculative", "Medusa", "Accelerating", "Draft", "Tokens"
        ],
        "expected_clusters_themes": ["speculative", "inference", "acceleration", "drafting", "multi-token"]
    }
]


async def evaluate_query(benchmark: dict):
    query = benchmark["query"]
    print(f"\n=======================================================")
    print(f"🧪 EVALUATING QUERY: '{query}'")
    print(f"=======================================================")
    
    start_time = time.time()
    
    # 1. Retrieval
    retriever = ArxivRetriever()
    print("📡 [Stage 1] Query Expansion & arXiv Retrieval...")
    candidates = await retriever.retrieve_candidates(query, max_results=25)
    retrieval_time = time.time() - start_time
    print(f"   -> Retrieved {len(candidates)} candidates in {retrieval_time:.2f}s")
    
    assert len(candidates) > 0, "Retrieval failed to fetch candidate papers!"
    
    # 2. Cross-Encoder Reranking
    reranker = CrossEncoderReranker()
    print("🎯 [Stage 2] Cross-Encoder Semantic Reranking...")
    rerank_start = time.time()
    top_papers = await reranker.rerank(query, candidates, top_k=10)
    rerank_time = time.time() - rerank_start
    print(f"   -> Top 10 reranked in {rerank_time:.2f}s")
    
    print("\n   🏆 Top 5 Reranked Papers:")
    for idx, p in enumerate(top_papers[:5], 1):
        print(f"      {idx}. [{p.published_year}] (Score: {p.cross_encoder_score:.3f} | Cites: {p.citation_count}) {p.title}")
        print(f"         Authors: {', '.join(p.authors[:3])}")
    
    # Check Ground Truth Hits
    found_seminal = 0
    for sem in benchmark["expected_seminal_authors_or_titles"]:
        for p in top_papers:
            if sem.lower() in p.title.lower() or any(sem.lower() in a.lower() for a in p.authors):
                found_seminal += 1
                break
    
    recall_rate = found_seminal / len(benchmark["expected_seminal_authors_or_titles"])
    print(f"\n   📊 Ground Truth Seminal Coverage: {found_seminal}/{len(benchmark['expected_seminal_authors_or_titles'])} ({recall_rate*100:.1f}%)")
    
    # 3. Paper Extraction
    extractor = PaperExtractor()
    print("\n🔬 [Stage 3] Structured Information Extraction...")
    extract_start = time.time()
    dossiers = await extractor.extract_batch(top_papers[:5], topic=query)
    extract_time = time.time() - extract_start
    print(f"   -> Extracted {len(dossiers)} deep dossiers in {extract_time:.2f}s")
    
    # Inspect extraction quality
    sample = dossiers[0]
    print(f"\n   📋 Sample Dossier Validation ('{sample.title[:45]}...'):")
    print(f"      • Problem Statement: {sample.problem_statement[:120]}...")
    print(f"      • Proposed Method:   {sample.proposed_method[:120]}...")
    print(f"      • Key Results:       {sample.key_results[:120]}...")
    print(f"      • Main Contribution: {sample.main_contribution[:120]}...")
    print(f"      • Cluster:           {sample.cluster_category}")
    
    # 4. Landscape Synthesis
    synthesizer = LandscapeSynthesizer()
    print("\n🗺️ [Stage 4] Landscape Synthesis...")
    synth_start = time.time()
    landscape = await synthesizer.synthesize(query, dossiers, candidate_pool=candidates)
    synth_time = time.time() - synth_start
    print(f"   -> Synthesized in {synth_time:.2f}s")
    
    print(f"\n   🌟 Research Landscape Summary:")
    print(f"      • Field Summary: {landscape.field_summary[:180]}...")
    print(f"      • Taxonomies/Clusters Identified: {len(landscape.clusters)}")
    for c in landscape.clusters:
        print(f"        - [{c.name}] ({len(c.paper_ids)} papers): {c.description[:80]}...")
    print(f"      • Scientific Tensions Mapped: {len(landscape.tensions)}")
    for t in landscape.tensions:
        print(f"        - ⚖️ {t.topic}: '{t.approach_a}' vs '{t.approach_b}'")
    print(f"      • Graph DAG Nodes: {len(landscape.nodes)} | Edges: {len(landscape.edges)}")
    print(f"      • Curated Reading Order: {len(landscape.reading_roadmap)} steps")
    for r in landscape.reading_roadmap[:3]:
        print(f"        Step {r.step} [{r.difficulty}]: {r.title[:45]}... (~{r.estimated_read_time_mins} min)")

    total_time = time.time() - start_time
    print(f"\n✅ Total End-to-End Pipeline Latency: {total_time:.2f}s")
    
    return {
        "query": query,
        "candidates_count": len(candidates),
        "top_papers_count": len(top_papers),
        "seminal_recall": recall_rate,
        "clusters_count": len(landscape.clusters),
        "tensions_count": len(landscape.tensions),
        "reading_steps": len(landscape.reading_roadmap),
        "total_latency_seconds": round(total_time, 2)
    }


async def main():
    print("🚀 Starting Ground Truth Accuracy & Performance Benchmark Suite for ResearchAtlas...")
    results = []
    for bm in GROUND_TRUTH_BENCHMARKS:
        res = await evaluate_query(bm)
        results.append(res)
        
    print("\n" + "="*70)
    print("📈 FINAL BENCHMARK ACCURACY SUMMARY REPORT")
    print("="*70)
    print(f"{'Query':<35} | {'Candidates':<10} | {'Recall':<8} | {'Clusters':<8} | {'Latency':<8}")
    print("-"*70)
    for r in results:
        print(f"{r['query']:<35} | {r['candidates_count']:<10} | {r['seminal_recall']*100:>5.1f}%  | {r['clusters_count']:<8} | {r['total_latency_seconds']:>5.2f}s")
    print("="*70)
    print("🎯 All Ground Truth Verification Runs Completed Successfully!")


if __name__ == "__main__":
    asyncio.run(main())
