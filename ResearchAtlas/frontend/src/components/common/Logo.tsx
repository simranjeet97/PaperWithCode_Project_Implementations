"use client";

import React from "react";

export type LogoVariant = "astrolabe" | "prism" | "compass" | "topography" | "monogram";

interface LogoProps {
  size?: number;
  variant?: LogoVariant;
  className?: string;
  showText?: boolean;
  textSize?: "sm" | "md" | "lg" | "xl";
}

export const Logo: React.FC<LogoProps> = ({
  size = 36,
  variant = "prism",
  className = "",
  showText = true,
  textSize = "lg",
}) => {
  const textClasses = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const renderIcon = () => {
    switch (variant) {
      case "prism":
        // Concept 2: The Hexagonal Knowledge Prism & Neural Lattice
        return (
          <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="prismGrad1" x1="24" y1="4" x2="44" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
              <linearGradient id="prismGrad2" x1="24" y1="4" x2="4" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
              <linearGradient id="prismGrad3" x1="4" y1="38" x2="44" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            {/* 3 Facets of Isometric Hexagonal Prism */}
            <path d="M24 4L43 15V37L24 48L5 37V15L24 4Z" stroke="#2563EB" strokeWidth="2" fill="#F8FAFC" />
            <path d="M24 4L43 15L24 26L5 15L24 4Z" fill="url(#prismGrad2)" fillOpacity="0.85" />
            <path d="M24 26V48L43 37V15L24 26Z" fill="url(#prismGrad1)" fillOpacity="0.9" />
            <path d="M24 26V48L5 37V15L24 26Z" fill="url(#prismGrad3)" fillOpacity="0.85" />
            {/* Internal Neural Nodes */}
            <circle cx="24" cy="26" r="3" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
            <circle cx="24" cy="12" r="2.2" fill="#FFFFFF" />
            <circle cx="34" cy="32" r="2.2" fill="#FFFFFF" />
            <circle cx="14" cy="32" r="2.2" fill="#FFFFFF" />
            <line x1="24" y1="12" x2="24" y2="26" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" />
            <line x1="24" y1="26" x2="34" y2="32" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" />
            <line x1="24" y1="26" x2="14" y2="32" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" />
          </svg>
        );

      case "compass":
        // Concept 3: The Evolutionary Research Compass Rose & Radar
        return (
          <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="compGrad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="50%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            {/* Concentric Radar Rings */}
            <circle cx="24" cy="24" r="21" stroke="#E2E8F0" strokeWidth="2" />
            <circle cx="24" cy="24" r="15" stroke="url(#compGrad)" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="24" cy="24" r="8" stroke="#94A3B8" strokeWidth="1" opacity="0.6" />
            {/* 4-Point Sharp Compass Star */}
            <path d="M24 3L27.5 20.5L45 24L27.5 27.5L24 45L20.5 27.5L3 24L20.5 20.5Z" fill="url(#compGrad)" />
            {/* Light Facet Accents */}
            <path d="M24 3L27.5 20.5L24 24V3Z" fill="#FFFFFF" fillOpacity="0.4" />
            <path d="M45 24L27.5 27.5L24 24H45Z" fill="#FFFFFF" fillOpacity="0.3" />
            <path d="M24 45L20.5 27.5L24 24V45Z" fill="#FFFFFF" fillOpacity="0.4" />
            <path d="M3 24L20.5 20.5L24 24H3Z" fill="#FFFFFF" fillOpacity="0.3" />
            <circle cx="24" cy="24" r="2.5" fill="#FFFFFF" />
          </svg>
        );

      case "topography":
        // Concept 4: The Dynamic Topographic Atlas & Synapse Ribbon
        return (
          <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="topoGrad" x1="4" y1="10" x2="44" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0284C7" />
                <stop offset="50%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <rect width="48" height="48" rx="12" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
            {/* Topographic Contour Elevation Waves */}
            <path d="M6 36C14 30 20 40 28 34C34 29 40 33 44 28" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4 28C12 20 22 30 30 22C36 16 42 20 44 18" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6 18C14 10 24 22 32 12C38 6 42 12 44 8" stroke="url(#topoGrad)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Prominent Peak Discovery Node */}
            <circle cx="32" cy="12" r="4" fill="#2563EB" />
            <circle cx="32" cy="12" r="2" fill="#FFFFFF" />
            <circle cx="20" cy="26" r="3" fill="#059669" />
            <circle cx="20" cy="26" r="1.5" fill="#FFFFFF" />
            {/* Connecting Ridge Vector */}
            <line x1="20" y1="26" x2="32" y2="12" stroke="#2563EB" strokeWidth="1.8" strokeDasharray="3 2" />
          </svg>
        );

      case "monogram":
        // Concept 5: The Geometric 'R' + Vector DAG Network
        return (
          <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="monoGrad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            {/* Background pill */}
            <rect width="48" height="48" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
            {/* Geometric Letter R Spine */}
            <path d="M14 10V38" stroke="url(#monoGrad)" strokeWidth="4" strokeLinecap="round" />
            {/* R Upper Loop */}
            <path d="M14 12H27C33 12 37 16 37 22C37 28 33 32 27 32H14" stroke="url(#monoGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* R Dynamic Graph Kick Leg */}
            <path d="M25 30L36 40" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
            {/* Graph DAG Nodes */}
            <circle cx="14" cy="10" r="3" fill="#2563EB" />
            <circle cx="37" cy="22" r="3" fill="#6366F1" />
            <circle cx="36" cy="40" r="3" fill="#059669" />
            <circle cx="14" cy="38" r="3" fill="#2563EB" />
          </svg>
        );

      case "astrolabe":
      default:
        // Concept 1: The Quantum Astrolabe & Constellation
        return (
          <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="atlasGrad1" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="50%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="coreGrad1" x1="18" y1="18" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="21" stroke="url(#atlasGrad1)" strokeWidth="2.5" strokeDasharray="4 2" opacity="0.85" />
            <circle cx="24" cy="24" r="16" stroke="#94A3B8" strokeWidth="1.2" opacity="0.4" />
            <ellipse cx="24" cy="24" rx="18" ry="7.5" transform="rotate(30 24 24)" stroke="url(#atlasGrad1)" strokeWidth="1.5" opacity="0.75" />
            <ellipse cx="24" cy="24" rx="18" ry="7.5" transform="rotate(-30 24 24)" stroke="url(#atlasGrad1)" strokeWidth="1.5" opacity="0.75" />
            <circle cx="8" cy="15" r="2.2" fill="#2563EB" />
            <circle cx="40" cy="33" r="2.2" fill="#059669" />
            <circle cx="39" cy="14" r="2" fill="#7C3AED" />
            <circle cx="9" cy="34" r="2" fill="#38BDF8" />
            <path d="M24 4V9" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
            <path d="M24 39V44" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 24H9" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
            <path d="M39 24H44" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
            <path d="M24 15L27 21L33 24L27 27L24 33L21 27L15 24L21 21Z" fill="url(#coreGrad1)" />
            <circle cx="24" cy="24" r="2.5" fill="#FFFFFF" />
          </svg>
        );
    }
  };

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      <div className="shrink-0 transition-transform duration-300 hover:scale-105">
        {renderIcon()}
      </div>

      {showText && (
        <div className="flex items-baseline space-x-1.5">
          <span className={`font-display font-black tracking-tight text-slate-900 ${textClasses[textSize]}`}>
            Research<span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">Atlas</span>
          </span>
        </div>
      )}
    </div>
  );
};
