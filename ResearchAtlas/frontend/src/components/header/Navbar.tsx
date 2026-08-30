"use client";

import React, { useState, useEffect } from "react";
import { Logo } from "@/components/common/Logo";
import { Github, ArrowRight, ListChecks, Activity } from "lucide-react";

interface NavbarProps {
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isLoading }) => {
  const [runningCount, setRunningCount] = useState(0);

  useEffect(() => {
    const fetchRunning = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/tasks?status=running&limit=1");
        const data = await res.json();
        setRunningCount(data.stats?.running || 0);
      } catch { /* silent */ }
    };
    fetchRunning();
    const interval = setInterval(fetchRunning, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <a href="/" className="flex items-center space-x-3 group">
          <Logo size={36} textSize="lg" />
          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            Pro SaaS
          </span>
        </a>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-5 text-xs font-semibold text-slate-600">
          <a href="/#features" className="hover:text-blue-600 transition">Capabilities</a>
          <a href="/#pricing" className="hover:text-blue-600 transition">Pricing & Plans</a>
          <a href="/#faq" className="hover:text-blue-600 transition">FAQ</a>
          <a href="/tasks" className="flex items-center space-x-1.5 hover:text-blue-600 transition relative">
            <ListChecks className="w-3.5 h-3.5" />
            <span>Tasks</span>
            {runningCount > 0 && (
              <span className="absolute -top-1.5 -right-3.5 bg-blue-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {runningCount}
              </span>
            )}
          </a>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 hover:text-blue-600 transition"
          >
            <span>API Docs</span>
          </a>
        </nav>

        {/* Right CTA Buttons */}
        <div className="flex items-center space-x-3 text-xs">
          <a
            href="/tasks"
            className="md:hidden flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition relative"
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Tasks</span>
            {runningCount > 0 && (
              <span className="bg-blue-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {runningCount}
              </span>
            )}
          </a>

          <a
            href="#pricing"
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm flex items-center space-x-1"
          >
            <span>Upgrade to Pro</span>
            <ArrowRight className="w-3 h-3" />
          </a>

          <a
            href="https://github.com/simranjeet97"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>

      </div>
    </header>
  );
};
