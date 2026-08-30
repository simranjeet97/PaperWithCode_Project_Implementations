"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { GraphNode, GraphEdge, ClusterTaxonomy } from "@/types/landscape";
import { ZoomIn, ZoomOut, RotateCcw, Move, Sparkles, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LandscapeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: ClusterTaxonomy[];
  onNodeClick: (nodeId: string) => void;
  activeCluster?: string | null;
}

const LIGHT_PALETTE = [
  "#2563EB", // Cobalt Blue
  "#059669", // Emerald Green
  "#7C3AED", // Violet
  "#D97706", // Amber
  "#DC2626", // Rose
  "#0891B2", // Cyan
  "#4F46E5", // Indigo
];

export const LandscapeGraph: React.FC<LandscapeGraphProps> = ({
  nodes,
  edges,
  clusters,
  onNodeClick,
  activeCluster,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic node coordinates state allowing free-form dragging
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Canvas Viewport Pan & Zoom
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hasMovedDuringClick, setHasMovedDuringClick] = useState(false);

  // Initialize node positions from props
  useEffect(() => {
    const initialCoords: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      initialCoords[n.id] = { x: n.x, y: n.y };
    });
    setNodePositions(initialCoords);
  }, [nodes]);

  // Map clusters to color scheme
  const clusterColorMap: Record<string, string> = {};
  clusters.forEach((c, idx) => {
    clusterColorMap[c.name] = c.color || LIGHT_PALETTE[idx % LIGHT_PALETTE.length];
  });

  const getNodeColor = useCallback(
    (node: GraphNode): string => {
      return clusterColorMap[node.cluster] || "#2563EB";
    },
    [clusterColorMap]
  );

  // Reset to original generated layout
  const handleResetLayout = () => {
    const initialCoords: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      initialCoords[n.id] = { x: n.x, y: n.y };
    });
    setNodePositions(initialCoords);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Convert screen/mouse coordinates to canvas world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = (screenX - rect.left - offset.x) / scale;
      const y = (screenY - rect.top - offset.y) / scale;
      return { x, y };
    },
    [offset, scale]
  );

  // Find node under mouse cursor
  const findNodeAtPosition = useCallback(
    (worldX: number, worldY: number): GraphNode | null => {
      // Search in reverse order so top-drawn nodes are hit first
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const pos = nodePositions[node.id] || { x: node.x, y: node.y };
        const radius = node.is_seminal ? 20 : 16;
        const dx = worldX - pos.x;
        const dy = worldY - pos.y;
        if (dx * dx + dy * dy <= radius * radius) {
          return node;
        }
      }
      return null;
    },
    [nodes, nodePositions]
  );

  // Draw Canvas Routine
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw subtle grid dots
    ctx.fillStyle = "#E2E8F0";
    const dotSpacing = 28 * scale;
    const startX = (offset.x * scale) % dotSpacing;
    const startY = (offset.y * scale) % dotSpacing;
    for (let x = startX; x < rect.width; x += dotSpacing) {
      for (let y = startY; y < rect.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // 1. Draw Evolutionary Edges with dynamic curved paths
    edges.forEach((edge) => {
      const srcNode = nodes.find((n) => n.id === edge.source);
      const tgtNode = nodes.find((n) => n.id === edge.target);
      if (!srcNode || !tgtNode) return;

      const srcPos = nodePositions[edge.source] || { x: srcNode.x, y: srcNode.y };
      const tgtPos = nodePositions[edge.target] || { x: tgtNode.x, y: tgtNode.y };

      const isConnectedToHovered =
        hoveredNode === edge.source || hoveredNode === edge.target;
      const isConnectedToDragged =
        draggedNodeId === edge.source || draggedNodeId === edge.target;

      ctx.beginPath();
      ctx.moveTo(srcPos.x, srcPos.y);

      // Quadratic bezier curve arc
      const cx = (srcPos.x + tgtPos.x) / 2;
      const cy = (srcPos.y + tgtPos.y) / 2 - 24;
      ctx.quadraticCurveTo(cx, cy, tgtPos.x, tgtPos.y);

      if (isConnectedToHovered || isConnectedToDragged) {
        ctx.strokeStyle = "rgba(37, 99, 235, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
      } else if (edge.relation_type === "extends") {
        ctx.strokeStyle = "rgba(5, 150, 105, 0.45)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = "rgba(37, 99, 235, 0.35)";
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4, 4]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Small arrowhead at midpoint
      const midX = 0.25 * srcPos.x + 0.5 * cx + 0.25 * tgtPos.x;
      const midY = 0.25 * srcPos.y + 0.5 * cy + 0.25 * tgtPos.y;
      ctx.fillStyle = isConnectedToHovered ? "#2563EB" : "rgba(100, 116, 139, 0.5)";
      ctx.beginPath();
      ctx.arc(midX, midY, isConnectedToHovered ? 2.5 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Draw Nodes
    nodes.forEach((node) => {
      const pos = nodePositions[node.id] || { x: node.x, y: node.y };
      const isHovered = hoveredNode === node.id;
      const isDragged = draggedNodeId === node.id;
      const isClusterDimmed = activeCluster && node.cluster !== activeCluster;
      const radius = node.is_seminal ? 16 : 12;
      const color = getNodeColor(node);

      ctx.save();
      if (isClusterDimmed) {
        ctx.globalAlpha = 0.25;
      }

      // Outer aura ring for seminal papers or hovered nodes
      if (node.is_seminal || isHovered || isDragged) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + (isDragged ? 8 : isHovered ? 6 : 4), 0, Math.PI * 2);
        ctx.fillStyle = isDragged
          ? "rgba(37, 99, 235, 0.25)"
          : isHovered
          ? "rgba(37, 99, 235, 0.18)"
          : "rgba(37, 99, 235, 0.1)";
        ctx.fill();
        ctx.strokeStyle = isDragged || isHovered ? "rgba(37, 99, 235, 0.6)" : "rgba(37, 99, 235, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Node core body
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isDragged ? "#1D4ED8" : color;
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Published Year text inside node
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${node.is_seminal ? "9px" : "8px"} JetBrains Mono, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.year.toString(), pos.x, pos.y);

      // Node Label below
      ctx.font = `${isHovered || isDragged ? "bold 11px" : "500 10px"} Outfit, Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // Background pill for label
      const labelText = node.label;
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillStyle = isHovered || isDragged ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(pos.x - textWidth / 2 - 4, pos.y + radius + 4, textWidth + 8, 14);

      ctx.fillStyle = isHovered || isDragged ? "#1E293B" : "#475569";
      ctx.fillText(labelText, pos.x, pos.y + radius + 5);

      ctx.restore();
    });

    ctx.restore();
  }, [nodes, edges, nodePositions, hoveredNode, draggedNodeId, activeCluster, scale, offset, getNodeColor]);

  // Re-draw on state change
  useEffect(() => {
    draw();
  }, [draw]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  // Mouse Handlers for Dragging Nodes vs Panning Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const hitNode = findNodeAtPosition(world.x, world.y);

    if (hitNode) {
      // Start dragging individual node
      setDraggedNodeId(hitNode.id);
      setHasMovedDuringClick(false);
    } else {
      // Start panning canvas
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);

    // 1. If currently dragging a node, update its position freely
    if (draggedNodeId) {
      setHasMovedDuringClick(true);
      setNodePositions((prev) => ({
        ...prev,
        [draggedNodeId]: { x: Math.round(world.x), y: Math.round(world.y) },
      }));
      return;
    }

    // 2. If panning canvas
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // 3. Hover detection
    const hitNode = findNodeAtPosition(world.x, world.y);
    setHoveredNode(hitNode ? hitNode.id : null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeId) {
      // If user clicked without dragging, trigger open paper dossier
      if (!hasMovedDuringClick) {
        onNodeClick(draggedNodeId);
      }
      setDraggedNodeId(null);
    }
    setIsPanning(false);
  };

  // Zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale((prev) => Math.min(Math.max(prev * zoomFactor, 0.35), 2.8));
  };

  // Cursor style
  const getCursor = () => {
    if (draggedNodeId) return "grabbing";
    if (hoveredNode) return "grab";
    if (isPanning) return "grabbing";
    return "default";
  };

  return (
    <div
      ref={containerRef}
      className="clean-card p-5 border border-slate-200 shadow-sm relative overflow-hidden bg-white rounded-2xl"
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-sm font-display font-bold text-slate-900 flex items-center space-x-2">
              <span>Interactive Research Cartography Graph</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              • {nodes.length} papers • {edges.length} connections
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Move className="w-3 h-3 text-blue-600" />
            <span>Click & drag any node to reposition freely. Scroll to zoom.</span>
          </p>
        </div>

        {/* Cluster Legend Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {clusters.map((c, idx) => {
            const color = c.color || LIGHT_PALETTE[idx % LIGHT_PALETTE.length];
            const isDimmed = activeCluster && activeCluster !== c.name;
            return (
              <div
                key={c.id}
                className={cn(
                  "flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
                  isDimmed ? "opacity-30 bg-slate-50 border-slate-200" : "bg-white border-slate-200 shadow-2xs text-slate-700"
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{c.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full h-[480px] bg-slate-50/70 rounded-xl border border-slate-200/80 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: getCursor() }}
          className="w-full h-full block touch-none select-none"
        />

        {/* Floating Tool Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md">
          <button
            onClick={() => setScale((s) => Math.min(s * 1.15, 2.8))}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s * 0.85, 0.35))}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetLayout}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition border-t border-slate-100"
            title="Reset Positions & View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Drag Hint */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-500 flex items-center space-x-1 shadow-2xs">
          <Move className="w-3 h-3 text-blue-600" />
          <span>Draggable Nodes Active</span>
        </div>
      </div>
    </div>
  );
};
