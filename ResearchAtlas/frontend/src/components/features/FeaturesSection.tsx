"use client";

import React from "react";
import {
  Compass,
  Layers,
  Scale,
  BookOpen,
  Download,
  Bell,
  ShieldCheck,
  Cpu,
  FileCheck,
  GitBranch,
} from "lucide-react";

export const FeaturesSection: React.FC = () => {
  const capabilities = [
    {
      icon: <GitBranch className="w-5 h-5 text-blue-600" />,
      badge: "Cartography",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      title: "Evolutionary Citation DAGs",
      desc: "Automatically tracks how seminal architectures fork, combine, and inspire downstream derivatives across decades of literature.",
    },
    {
      icon: <Scale className="w-5 h-5 text-amber-600" />,
      badge: "Scientific Intelligence",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      title: "Paradigm & Debate Tensions",
      desc: "Identifies conflicting empirical baselines, trade-offs between competing methods, and open research questions blocking adoption.",
    },
    {
      icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
      badge: "Curated Learning",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      title: "Step-by-Step Reading Roadmaps",
      desc: "Generates optimal chronological reading sequences for ML engineers and PhDs, complete with difficulty ratings and time estimates.",
    },
    {
      icon: <Download className="w-5 h-5 text-purple-600" />,
      badge: "Workflow Export",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      title: "1-Click Obsidian & BibTeX Vaults",
      desc: "Seamlessly export entire research fields into Obsidian notes with linked `[[wikilinks]]`, formatted BibTeX bibliographies, and Markdown.",
    },
    {
      icon: <FileCheck className="w-5 h-5 text-rose-600" />,
      badge: "Deep Dossiers",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      title: "Structured Paper Extractions",
      desc: "Extracts precise Core Problem, Mathematical Formulation, Key Results, Code URLs, and Limitations from preprints automatically.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-cyan-600" />,
      badge: "Enterprise Security",
      badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
      title: "Private & Local-First Privacy",
      desc: "Run on-premise or cloud with zero data retention on proprietary queries. Compatible with local LLMs (Ollama) and private API keys.",
    },
  ];

  return (
    <section id="features" className="py-12 border-t border-slate-200">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Next-Generation Research Capabilities</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight mb-3">
          Built for the Modern AI Scientist & Lab
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          Transform unstructured preprint archives into actionable, interconnected scientific intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {capabilities.map((cap) => (
          <div
            key={cap.title}
            className="clean-card clean-card-hover p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs">
                  {cap.icon}
                </div>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${cap.badgeColor}`}>
                  {cap.badge}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">{cap.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">{cap.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
