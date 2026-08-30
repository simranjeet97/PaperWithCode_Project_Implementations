"use client";

import React, { useState } from "react";
import { Check, Sparkles, Zap, Shield, Building, ArrowRight } from "lucide-react";

interface PricingSectionProps {
  onSelectPlan?: (planName: string) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectPlan }) => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      name: "Researcher",
      tagline: "Essential literature discovery for individual students and engineers",
      priceMonthly: "$0",
      priceAnnual: "$0",
      period: "forever free",
      badge: null,
      highlight: false,
      cta: "Current Free Plan",
      features: [
        "3 Field Cartography mappings / day",
        "Standard Interactive 2D Graph view",
        "arXiv preprint retrieval & scoring",
        "Basic Markdown export",
        "Public taxonomy cluster analysis",
      ],
    },
    {
      name: "Pro Scientist",
      tagline: "For serious AI researchers, PhD candidates, and staff scientists",
      priceMonthly: "$29",
      priceAnnual: "$24",
      period: "per user / month",
      badge: "Most Popular",
      highlight: true,
      cta: "Upgrade to Pro",
      features: [
        "Unlimited Field Cartography & Deep Synthesis",
        "Full Structured Paper Dossiers (Method, Results, Benchmarks)",
        "Obsidian Vault (`[[wikilinks]]`) & BibTeX export",
        "Scientific Tension & Debate Comparative Matrix",
        "Curated Chronological Reading Roadmaps",
        "Semantic Scholar citation authority overlay",
        "Priority GPU acceleration queue",
      ],
    },
    {
      name: "Lab & Enterprise",
      tagline: "For corporate AI labs, venture tech scouts, and university departments",
      priceMonthly: "$99",
      priceAnnual: "$79",
      period: "per seat / month",
      badge: "Enterprise",
      highlight: false,
      cta: "Contact Lab Sales",
      features: [
        "Everything in Pro Scientist",
        "Private PDF & proprietary paper ingestion vault",
        "Team Shared Workspace & Collaborative Maps",
        "Automated weekly arXiv field monitoring & alerts",
        "Full REST API & Python SDK access",
        "Dedicated account manager & SLA",
        "SOC2 Type II & private cloud hosting option",
      ],
    },
  ];

  const handleSubscribe = (planName: string) => {
    setSelectedPlan(planName);
    if (onSelectPlan) onSelectPlan(planName);
  };

  return (
    <section id="pricing" className="py-12 border-t border-slate-200">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Transparent Commercial Subscriptions</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight mb-3">
          Accelerate Your Scientific Discovery
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          From solo literature reviews to enterprise-wide AI lab intelligence, choose the tier that powers your research.
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center space-x-3 mt-6 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isAnnual
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              isAnnual
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`clean-card p-6 rounded-2xl flex flex-col justify-between relative transition-all ${
              plan.highlight
                ? "border-2 border-blue-600 shadow-xl shadow-blue-500/5 bg-white ring-4 ring-blue-50"
                : "border border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            {plan.badge && (
              <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                plan.highlight
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-900 text-white"
              }`}>
                {plan.badge}
              </span>
            )}

            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[36px]">{plan.tagline}</p>
              </div>

              <div className="mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900">
                    {isAnnual ? plan.priceAnnual : plan.priceMonthly}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/{plan.period}</span>
                </div>
                {isAnnual && plan.priceAnnual !== "$0" && (
                  <span className="text-[11px] text-emerald-600 font-medium block mt-1">
                    Billed annually (${parseInt(plan.priceAnnual.replace("$", "")) * 12}/year)
                  </span>
                )}
              </div>

              {/* Feature List */}
              <div className="space-y-3 mb-6">
                <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block tracking-wider">
                  Included Capabilities:
                </span>
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex items-start space-x-2.5 text-xs text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSubscribe(plan.name)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm ${
                plan.highlight
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-900"
              }`}
            >
              <span>{selectedPlan === plan.name ? "Selected Plan ✓" : plan.cta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Enterprise Banner */}
      <div className="clean-card bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-6 mt-10 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Custom Institutional & Academic University Licenses</h4>
            <p className="text-xs text-slate-600 mt-0.5">Need site-wide campus licensing or integration with Zotero, Mendeley, and internal PDF repos?</p>
          </div>
        </div>
        <button
          onClick={() => handleSubscribe("Institutional Inquiry")}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shrink-0 shadow-sm"
        >
          Contact Institutional Sales
        </button>
      </div>
    </section>
  );
};
