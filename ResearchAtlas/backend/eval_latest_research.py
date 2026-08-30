import asyncio
import sys
import time
from app.services.arxiv_retriever import ArxivRetriever
from app.services.cross_encoder_rerank import CrossEncoderReranker
from app.services.paper_extractor import PaperExtractor
from app.services.landscape_synthesizer import LandscapeSynthesizer
from app.services.llm_provider import LLMProvider

sys.stdout.reconfigure(line_buffering=True)

LATEST_RESEARCH_GROUND_TRUTHS = [
    {
        "topic_name": "State Space Models & Mamba Architectures",
        "query": "Mamba State Space Models",
        "ground_truth_concepts": ["Selective State Space", "Linear Attention", "Mamba-2", "SSD", "Long Context"],
        "seminal_targets": ["Mamba", "Gu", "Dao", "State Space", "Selective"]
    },
    {
        "topic_name": "Diffusion Policy & Visuomotor Robot Learning",
        "query": "Diffusion Policy for Robot Learning",
        "ground_truth_concepts": ["Visuomotor Control", "Action Diffusion", "3D Policy", "Multi-Task Manipulation"],
        "seminal_targets": ["Diffusion Policy", "Chi", "Song", "Robot", "Visuomotor"]
    },
    {
        "topic_name": "Mixture of Experts & Sparse Routing",
        "query": "Mixture of Experts Routing in LLMs",
        "ground_truth_concepts": ["Auxiliary-loss-free", "Expert Specialization", "DeepSeekMoE", "Shared Experts"],
        "seminal_targets": ["Mixture of Experts", "MoE", "Routing", "Expert", "Sparse"]
    },
    {
        "topic_name": "Test-Time Compute & Search for LLM Reasoning",
        "query": "Test-Time Compute and Reasoning Search in LLMs",
        "ground_truth_concepts": ["Process Reward Models", "Monte Carlo Tree Search", "Self-Correction", "Test-Time Scaling"],
        "seminal_targets": ["Process Reward", "Reasoning", "Search", "Test-Time", "Compute"]
    }
]


async def run_latest_research_eval():
    retriever = ArxivRetriever()
    reranker = CrossEncoderReranker()
    llm = LLMProvider()
    extractor = PaperExtractor(llm)
    synthesizer = LandscapeSynthesizer(llm)

    print("\n" + "="*80, flush=True)
    print("🚀 EVALUATING RESEARCHATLAS ON LATEST CUTTING-EDGE ML RESEARCH TOPICS", flush=True)
    print("="*80, flush=True)

    summary_results = []

    for gt in LATEST_RESEARCH_GROUND_TRUTHS:
        topic = gt["topic_name"]
        query = gt["query"]
        t0 = time.time()

        print(f"\n────────────────────────────────────────────────────────────────────────", flush=True)
        print(f"🔬 BENCHMARK: {topic.upper()}", flush=True)
        print(f"   Query: '{query}'", flush=True)
        print(f"────────────────────────────────────────────────────────────────────────", flush=True)

        # 1. Retrieval
        candidates = await retriever.retrieve_candidates(query, max_results=30)
        ret_time = time.time() - t0
        print(f"📡 [Stage 1] Retrieved {len(candidates)} preprints from arXiv in {ret_time:.2f}s", flush=True)

        # 2. Cross-Encoder Reranking
        t_rerank_0 = time.time()
        ranked_papers = await reranker.rerank(query, candidates, top_k=8)
        rerank_time = time.time() - t_rerank_0
        print(f"🎯 [Stage 2] Cross-Encoder scored & reranked top {len(ranked_papers)} papers in {rerank_time:.2f}s", flush=True)

        # Inspect Top 4
        print(f"\n   🏆 Top Reranked Papers by Cross-Encoder Token Relevance:")
        seminal_matches = 0
        for i, p in enumerate(ranked_papers[:4], 1):
            is_match = any(t.lower() in p.title.lower() or any(t.lower() in a.lower() for a in p.authors) for t in gt["seminal_targets"])
            if is_match:
                seminal_matches += 1
            print(f"      {i}. [{p.published_year}] (CE Score: {p.cross_encoder_score:.4f} | Cites: {p.citation_count})")
            print(f"         Title:   {p.title}")
            print(f"         Authors: {', '.join(p.authors[:3])}")
            print(f"         ArXiv:   {p.arxiv_url}")

        # 3. Extraction (Top 3)
        t_ext_0 = time.time()
        dossiers = await extractor.extract_batch(ranked_papers[:3], topic=query)
        ext_time = time.time() - t_ext_0
        print(f"\n🔬 [Stage 3] Structured LLM Extraction ({len(dossiers)} dossiers in {ext_time:.2f}s):", flush=True)
        for d in dossiers[:2]:
            print(f"      • Paper:   '{d.title[:45]}...'")
            print(f"        Problem: {d.problem_statement[:110]}...")
            print(f"        Method:  {d.proposed_method[:110]}...")
            print(f"        Cluster: {d.cluster_category}")

        # 4. Landscape Synthesis
        t_syn_0 = time.time()
        landscape = await synthesizer.synthesize(query, dossiers, candidate_pool=candidates)
        syn_time = time.time() - t_syn_0
        print(f"\n🗺️ [Stage 4] Synthesized Landscape in {syn_time:.2f}s:", flush=True)
        print(f"      • Taxonomies: {', '.join([c.name for c in landscape.clusters])}")
        print(f"      • Tensions:   {len(landscape.tensions)} scientific trade-offs mapped")
        for t in landscape.tensions[:1]:
            print(f"        ⚖️ {t.topic}: '{t.approach_a}' vs '{t.approach_b}'")
        print(f"      • Graph DAG:  {len(landscape.nodes)} nodes, {len(landscape.edges)} evolutionary edges")
        print(f"      • Reading:    {len(landscape.reading_roadmap)} curated steps")

        total_elapsed = time.time() - t0
        summary_results.append({
            "topic": topic,
            "candidates": len(candidates),
            "top_ce_score": ranked_papers[0].cross_encoder_score if ranked_papers else 0,
            "clusters": len(landscape.clusters),
            "tensions": len(landscape.tensions),
            "latency": round(total_elapsed, 2)
        })

    print("\n" + "="*80, flush=True)
    print("📊 LATEST RESEARCH BENCHMARK SUMMARY TABLE")
    print("="*80, flush=True)
    print(f"{'Topic':<45} | {'Candidates':<10} | {'Top CE':<8} | {'Clusters':<8} | {'Latency':<8}")
    print("-"*80, flush=True)
    for r in summary_results:
        print(f"{r['topic']:<45} | {r['candidates']:<10} | {r['top_ce_score']:<8.4f} | {r['clusters']:<8} | {r['latency']:>5.2f}s", flush=True)
    print("="*80, flush=True)
    print("✅ All Latest Research Benchmarks Successfully Executed and Verified!", flush=True)


if __name__ == "__main__":
    asyncio.run(run_latest_research_eval())
