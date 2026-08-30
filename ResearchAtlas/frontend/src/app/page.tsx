"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/header/Navbar";
import { PipelineTracker } from "@/components/pipeline/PipelineTracker";
import { LandscapeGraph } from "@/components/graph/LandscapeGraph";
import { PaperDrawer } from "@/components/dossier/PaperDrawer";
import { TaxonomyClusters } from "@/components/landscape/TaxonomyClusters";
import { TensionsMatrix } from "@/components/landscape/TensionsMatrix";
import { ReadingRoadmap } from "@/components/landscape/ReadingRoadmap";
import { OpenProblems } from "@/components/landscape/OpenProblems";
import { FieldMaturityCard } from "@/components/landscape/FieldMaturityCard";
import { ExportPanel } from "@/components/export/ExportPanel";
import { FeaturesSection } from "@/components/features/FeaturesSection";
import { PricingSection } from "@/components/subscription/PricingSection";
import { FAQSection } from "@/components/faq/FAQSection";
import { Logo } from "@/components/common/Logo";
import { useLandscapeStream } from "@/hooks/useLandscapeStream";
import { searchField, getLandscape } from "@/lib/api";
import { ResearchLandscape, ExtractedPaperDossier } from "@/types/landscape";
import Link from "next/link";
import {
  Compass,
  BookOpen,
  Layers,
  Zap,
  Sparkles,
  ArrowRight,
  Search,
  Flame,
  ShieldCheck,
  CheckCircle,
  Users,
  ListChecks,
  History,
  RotateCcw,
} from "lucide-react";

const FEATURED_RESEARCH_DOMAINS = [
  {
    topic: "Retrieval-Augmented Generation",
    badge: "Information Retrieval",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "GraphRAG, dense passage retrieval, dynamic chunking, and multi-hop entity synthesis.",
    icon: "📡",
    papersCount: "25+ Papers",
  },
  {
    topic: "Diffusion Policy for Robot Learning",
    badge: "Robotics & Visuomotor",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Multimodal trajectory generation, residual skill policies, and 3D action diffusion.",
    icon: "🤖",
    papersCount: "20+ Papers",
  },
  {
    topic: "Speculative Decoding",
    badge: "LLM Acceleration",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Tree drafting, retrieval-assisted speculative sampling (REST), and EAGLE-2.",
    icon: "⚡",
    papersCount: "18+ Papers",
  },
  {
    topic: "Mixture of Experts Routing",
    badge: "Sparse Architectures",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Auxiliary-loss-free routing, expert pruning, and DeepSeekMoE shared expert scaling.",
    icon: "🧠",
    papersCount: "22+ Papers",
  },
];

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [currentQuery, setCurrentQuery] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [landscape, setLandscape] = useState<ResearchLandscape | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<ExtractedPaperDossier | null>(null);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [recentTasks, setRecentTasks] = useState<Array<{ id: string; query: string; generated_at: string; papers_count: number }>>([]);

  // Load from URL query parameter if present
  useEffect(() => {
    const landscapeParam = searchParams.get("landscape");
    if (landscapeParam) {
      setIsLoading(true);
      getLandscape(landscapeParam)
        .then((ls) => {
          setLandscape(ls);
          setTaskId(landscapeParam);
          setCurrentQuery(ls.query);
          setSearchInput(ls.query);
        })
        .catch((e) => console.error("Failed to load landscape param:", e))
        .finally(() => setIsLoading(false));
    }
  }, [searchParams]);

  // Load recent tasks for quick navigation
  useEffect(() => {
    fetch("http://localhost:8000/api/recent")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRecentTasks(data.slice(0, 5));
      })
      .catch(() => {});
  }, [landscape]);

  const handleComplete = useCallback((ls: ResearchLandscape) => {
    setLandscape(ls);
    setIsLoading(false);
  }, []);

  const handleError = useCallback((msg: string) => {
    setIsLoading(false);
    console.error("Pipeline error:", msg);
  }, []);

  const { stage, progress, message, logs, isStreaming } = useLandscapeStream(taskId, {
    onComplete: handleComplete,
    onError: handleError,
  });

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);

    try {
      // Trigger background research task
      await searchField(query, false);
      // Navigate directly to Tasks tab as requested
      router.push("/tasks");
    } catch (err) {
      console.error("Search failed:", err);
      router.push("/tasks");
    }
  };

  const handleCancelTask = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/api/tasks/${id}/cancel`, { method: "POST" });
      setNotification("Task cancellation signal sent.");
      setTimeout(() => setNotification(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlanSelect = (planName: string) => {
    setNotification(`Selected ${planName} — Subscription checkout portal enabled!`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleNodeClick = (nodeId: string) => {
    if (!landscape) return;
    const paper = landscape.papers.find((p) => p.id === nodeId);
    if (paper) setSelectedPaper(paper);
  };

  const handlePaperClick = (paperId: string) => {
    if (!landscape) return;
    const paper = landscape.papers.find((p) => p.id === paperId);
    if (paper) setSelectedPaper(paper);
  };

  return (
    <div className="min-h-screen bg-slate-50 dot-grid-bg flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar isLoading={isLoading} />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* HOMEPAGE VIEW (When no landscape is active) */}
        {!landscape && (
          <div className="space-y-12 animate-in fade-in duration-300">
            
            {/* Command Center Hero */}
            <div className="text-center max-w-4xl mx-auto pt-6 pb-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Generation AI Scientific Cartography</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-5">
                Navigate the Frontier of <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Artificial Intelligence Research
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
                Transform thousands of arXiv preprints into interactive evolutionary DAGs, scientific trade-off matrices, and structured researcher dossiers in seconds.
              </p>

              {/* Central Search Command Box */}
              <div className="max-w-2xl mx-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch(searchInput);
                  }}
                  className="relative flex items-center mb-4"
                >
                  <div className="relative w-full flex items-center">
                    <Search className="absolute left-5 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search an ML topic (e.g. Graph RAG, Diffusion Policy, Speculative Decoding)..."
                      className="w-full pl-14 pr-36 py-4 text-base rounded-2xl bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!searchInput.trim() || isLoading}
                      className="absolute right-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all flex items-center space-x-1.5 shadow-md shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Map Field</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Quick Light Topic Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium flex items-center space-x-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Popular Landscapes:</span>
                  </span>
                  {[
                    "Retrieval-Augmented Generation",
                    "Diffusion Policy for Robot Learning",
                    "Speculative Decoding",
                    "Mixture of Experts Routing",
                  ].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => handleSearch(topic)}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-all shadow-2xs"
                    >
                      {topic}
                    </button>
                  ))}
                </div>

                {/* Recent Task Explorations Banner */}
                {recentTasks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium flex items-center space-x-1">
                      <History className="w-3.5 h-3.5 text-blue-500" />
                      <span>Recent Atlases:</span>
                    </span>
                    {recentTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setIsLoading(true);
                          getLandscape(t.id).then((ls) => {
                            setLandscape(ls);
                            setTaskId(t.id);
                            setCurrentQuery(ls.query);
                            setSearchInput(ls.query);
                            setIsLoading(false);
                          });
                        }}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition text-[11px] font-medium"
                      >
                        {t.query} ({t.papers_count}p)
                      </button>
                    ))}
                    <Link
                      href="/tasks"
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center space-x-0.5 ml-1"
                    >
                      <span>Task Center →</span>
                    </Link>
                  </div>
                )}

              </div>
            </div>

            {/* Social Proof / Trust Banner */}
            <div className="py-4 border-y border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
              <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                Trusted by AI Researchers & Engineers from:
              </span>
              <div className="flex flex-wrap items-center gap-6 font-display font-bold text-slate-400 text-sm">
                <span>Stanford AI</span>
                <span>MIT CSAIL</span>
                <span>UC Berkeley</span>
                <span>Tsinghua</span>
                <span>CMU LTI</span>
              </div>
            </div>

            {/* Featured Research Domains Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-display font-bold text-slate-900">
                    Curated Scientific Domains
                  </h2>
                  <p className="text-xs text-slate-500">
                    High-impact machine learning fields synthesized with deep paper extractions
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  Pre-Mapped & Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURED_RESEARCH_DOMAINS.map((domain) => (
                  <button
                    key={domain.topic}
                    onClick={() => handleSearch(domain.topic)}
                    className="group clean-card bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all text-left flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{domain.icon}</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${domain.badgeColor}`}>
                          {domain.badge}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition mb-1.5 leading-snug">
                        {domain.topic}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal mb-4">
                        {domain.desc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-all">
                      <span className="text-[11px] text-slate-400 font-mono font-normal">{domain.papersCount}</span>
                      <span className="flex items-center space-x-1">
                        <span>Explore Atlas</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Core Capabilities Section */}
            <FeaturesSection />

            {/* Commercial Subscription Pricing Section */}
            <PricingSection onSelectPlan={handlePlanSelect} />

            {/* FAQ Section */}
            <FAQSection />

          </div>
        )}

        {/* STREAMING PROGRESS RADAR */}
        {(isStreaming || isLoading) && !landscape && (
          <div className="mb-6 animate-in fade-in duration-300">
            <PipelineTracker
              stage={stage}
              progress={progress}
              message={message}
              logs={logs}
              isStreaming={isStreaming}
              taskId={taskId}
              onCancel={handleCancelTask}
            />
          </div>
        )}

        {/* SYNTHESIZED RESEARCH LANDSCAPE DISPLAY */}
        {landscape && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Header Search Banner */}
            <div className="clean-card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Synthesized Atlas
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {landscape.generated_at}
                  </span>
                </div>
                <h1 className="text-2xl font-display font-extrabold text-slate-900">
                  {landscape.query}
                </h1>
              </div>

              {/* Quick Search Another Topic */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch(searchInput);
                }}
                className="flex items-center space-x-2.5 w-full md:w-auto"
              >
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search another field..."
                    className="w-full pl-11 pr-4 py-2.5 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="submit"
                    disabled={!searchInput.trim() || isLoading}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shrink-0 shadow-sm disabled:opacity-40"
                  >
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSearch(landscape.query)}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition shrink-0 flex items-center space-x-1 border border-slate-200"
                    title="Force fresh search and re-synthesize"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-run Atlas</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Executive Field Summary */}
            <div className="clean-card p-6 border border-slate-200 shadow-sm bg-white rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  Executive Field Summary & Paradigm Evolution
                </span>
                <Link
                  href="/tasks"
                  className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center space-x-1"
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>View in Task Manager</span>
                </Link>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                {landscape.field_summary}
              </p>
            </div>

            {/* Metric KPI Chips */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="clean-card p-4 border border-slate-200 shadow-xs flex items-center space-x-3 bg-white rounded-2xl">
                <Layers className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-lg font-display font-bold text-slate-900">{landscape.clusters.length}</div>
                  <div className="text-xs text-slate-500">Taxonomy Clusters</div>
                </div>
              </div>

              <div className="clean-card p-4 border border-slate-200 shadow-xs flex items-center space-x-3 bg-white rounded-2xl">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-lg font-display font-bold text-slate-900">{landscape.papers.length}</div>
                  <div className="text-xs text-slate-500">Seminal Papers</div>
                </div>
              </div>

              <div className="clean-card p-4 border border-slate-200 shadow-xs flex items-center space-x-3 bg-white rounded-2xl">
                <Zap className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="text-lg font-display font-bold text-slate-900">{landscape.tensions.length}</div>
                  <div className="text-xs text-slate-500">Scientific Tensions</div>
                </div>
              </div>

              <div className="clean-card p-4 border border-slate-200 shadow-xs flex items-center space-x-3 bg-white rounded-2xl">
                <Compass className="w-5 h-5 text-rose-600" />
                <div>
                  <div className="text-lg font-display font-bold text-slate-900">{landscape.open_frontiers.length}</div>
                  <div className="text-xs text-slate-500">Open Frontiers</div>
                </div>
              </div>
            </div>

            {/* Field Maturity, Research Momentum & Horizon Potential Card */}
            <FieldMaturityCard metrics={landscape.maturity_metrics} query={landscape.query} />

            {/* Interactive Research Cartography Graph */}
            <LandscapeGraph
              nodes={landscape.nodes}
              edges={landscape.edges}
              clusters={landscape.clusters}
              onNodeClick={handleNodeClick}
              activeCluster={activeCluster}
            />

            {/* Structured Synthesis Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Taxonomies & Tensions */}
              <div className="space-y-6">
                <TaxonomyClusters
                  clusters={landscape.clusters}
                  papers={landscape.papers}
                  activeCluster={activeCluster}
                  onClusterClick={(cid) => setActiveCluster(activeCluster === cid ? null : cid)}
                  onPaperClick={handlePaperClick}
                />

                <TensionsMatrix
                  tensions={landscape.tensions}
                />
              </div>

              {/* Right Column: Reading Roadmap & Open Frontiers */}
              <div className="space-y-6">
                <ReadingRoadmap
                  items={landscape.reading_roadmap}
                  onPaperClick={handlePaperClick}
                />

                <OpenProblems frontiers={landscape.open_frontiers} />
              </div>

            </div>

            {/* Export & Sharing Hub */}
            <ExportPanel landscapeId={landscape.id} query={landscape.query} />

          </div>
        )}

      </main>

      {/* Slide-out Paper Dossier Drawer */}
      <PaperDrawer
        paper={selectedPaper}
        onClose={() => setSelectedPaper(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center space-x-3">
              <Logo size={28} textSize="sm" />
              <span>•</span>
              <span>Autonomous AI Scientific Intelligence Platform</span>
            </div>

            <div className="flex items-center space-x-6 text-slate-600 font-medium">
              <Link href="/tasks" className="hover:text-blue-600 transition">Task Center</Link>
              <a href="#features" className="hover:text-blue-600 transition">Capabilities</a>
              <a href="#pricing" className="hover:text-blue-600 transition">Pricing</a>
              <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition">API Docs</a>
              <a href="https://github.com/simranjeet97" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500 font-mono">Loading ResearchAtlas...</div>}>
      <HomeContent />
    </Suspense>
  );
}
