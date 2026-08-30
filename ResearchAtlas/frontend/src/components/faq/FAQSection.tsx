"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does ResearchAtlas find the most seminal papers in a field?",
      a: "ResearchAtlas combines semantic query expansion across academic taxonomy categories with multi-hop citation graph analysis and local Cross-Encoder scoring. This surfaces foundational high-impact breakthroughs alongside newly uploaded preprints, ensuring both historical context and state-of-the-art developments are captured.",
    },
    {
      q: "Can I export research landscapes directly into Obsidian and Zotero?",
      a: "Yes! ResearchAtlas provides 1-click downloads for Obsidian Markdown vaults formatted with connected [[wikilinks]], as well as standardized .bib BibTeX bibliographies ready for immediate import into Zotero, Mendeley, and LaTeX documents.",
    },
    {
      q: "Is our lab's search history and data kept private?",
      a: "Absolutely. ResearchAtlas is designed with privacy-first standards. We do not use your search queries or research interests to train public AI models. Enterprise tiers also support completely private local deployment and on-premise LLM execution.",
    },
    {
      q: "Can I upload custom proprietary PDF papers to generate internal landscapes?",
      a: "Yes, our Lab & Enterprise tier includes a Private Ingestion Vault where your team can upload proprietary whitepapers, internal technical reports, or paywalled journals to map them alongside the public academic literature.",
    },
    {
      q: "What LLMs and infrastructure power the platform?",
      a: "The platform is multi-provider capable. It runs seamlessly with local models (via Ollama Qwen/Gemma), high-throughput cloud models (Gemini / OpenAI), and hardware-accelerated SentenceTransformers cross-encoders.",
    },
  ];

  return (
    <section id="faq" className="py-12 border-t border-slate-200">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight mb-3">
          Everything You Need to Know
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          Common questions about subscriptions, exports, privacy, and team features.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, i) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={i}
              className="clean-card bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/60 transition"
              >
                <span className="text-sm font-bold text-slate-900 leading-snug">{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 font-normal">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
