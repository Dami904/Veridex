import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Contradiction, StudyExtraction, Paper } from '../api/client';
import { Network, ZoomIn, ZoomOut, Maximize, AlertCircle } from 'lucide-react';

interface ContradictionGraphProps {
  contradictions: Contradiction[];
  extractions: StudyExtraction[];
  papers: Paper[];
}

interface NodeData {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  title: string;
  direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED' | 'UNKNOWN';
  sampleSize?: number | null;
  pValue?: number | null;
}

interface LinkData {
  id: string;
  source: NodeData;
  target: NodeData;
  status: 'RESOLVED' | 'IRRECONCILABLE' | string;
  confounder: string;
}

export const ContradictionGraph: React.FC<ContradictionGraphProps> = ({
  contradictions,
  extractions,
  papers,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [simulationActive, setSimulationActive] = useState(true);

  // Initialize nodes and links only once when data changes
  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, NodeData>();
    
    // First, populate all extraction nodes
    extractions.forEach((ex, i) => {
      const paper = papers.find(p => p.id === ex.paper_id);
      if (!nodeMap.has(ex.paper_id)) {
        nodeMap.set(ex.paper_id, {
          id: ex.paper_id,
          x: Math.random() * 400 - 200,
          y: Math.random() * 400 - 200,
          vx: 0,
          vy: 0,
          title: paper?.title || ex.paper_title || `Study ${i + 1}`,
          direction: ex.effect_direction || 'UNKNOWN',
          sampleSize: ex.sample_size,
          pValue: ex.p_value
        });
      }
    });

    // Also make sure papers in contradictions exist as nodes
    contradictions.forEach(c => {
      [c.paper_a_id, c.paper_b_id].forEach((pid, _i) => {
        if (!nodeMap.has(pid)) {
          const paper = papers.find(p => p.id === pid);
          nodeMap.set(pid, {
            id: pid,
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
            vx: 0,
            vy: 0,
            title: paper?.title || `Unknown Study ${pid}`,
            direction: 'UNKNOWN',
          });
        }
      });
    });

    const nodesArr = Array.from(nodeMap.values());
    const linksArr: LinkData[] = contradictions.map(c => {
      return {
        id: c.id,
        source: nodeMap.get(c.paper_a_id)!,
        target: nodeMap.get(c.paper_b_id)!,
        status: c.status,
        confounder: c.isolated_confounder || c.conflict_summary || 'Unknown confounder',
      };
    }).filter(l => l.source && l.target);

    return { nodes: nodesArr, links: linksArr };
  }, [contradictions, extractions, papers]);

  const [, setTick] = useState(0);

  // Force Simulation
  useEffect(() => {
    if (!simulationActive || nodes.length === 0) return;
    let animationFrameId: number;

    const K_REPULSE = 30000;
    const K_SPRING = 0.05;
    const DAMPING = 0.85;
    const SPRING_LENGTH = 150;
    const GRAVITY = 0.02;

    const simulate = () => {
      let maxVelocity = 0;

      // 1. Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) || 1;
          const force = K_REPULSE / (distSq + 100); 
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx += fx; nodes[i].vy += fy;
          nodes[j].vx -= fx; nodes[j].vy -= fy;
        }
      }

      // 2. Attraction
      for (const link of links) {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - SPRING_LENGTH) * K_SPRING;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        link.source.vx += fx; link.source.vy += fy;
        link.target.vx -= fx; link.target.vy -= fy;
      }

      // 3. Gravity and Damping
      for (const n of nodes) {
        n.vx += (0 - n.x) * GRAVITY;
        n.vy += (0 - n.y) * GRAVITY;
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        const v = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (v > maxVelocity) maxVelocity = v;
      }

      setTick(t => t + 1);

      if (maxVelocity > 0.1) {
        animationFrameId = requestAnimationFrame(simulate);
      } else {
        setSimulationActive(false);
      }
    };

    animationFrameId = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, links, simulationActive]);

  // Restart simulation when data changes
  useEffect(() => {
    setSimulationActive(true);
  }, [contradictions, extractions]);

  // Controls
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.5, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.5, 0.2));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (contradictions.length === 0 && nodes.length === 0) {
    return (
      <section className="surface-panel rounded-xl p-8 text-center flex flex-col items-center justify-center border border-white/5 h-[500px]">
        <AlertCircle className="w-8 h-8 text-slate-500 mb-3" />
        <h3 className="text-base font-bold text-slate-100">No Contradictions Found</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          There are no contradictions or study extractions available to visualize in this corpus.
        </p>
      </section>
    );
  }

  // Visual Helpers
  const getNodeColor = (dir: string) => {
    if (dir === 'POSITIVE') return 'fill-emerald-500';
    if (dir === 'NEGATIVE') return 'fill-rose-500';
    if (dir === 'MIXED') return 'fill-amber-500';
    return 'fill-slate-500';
  };
  
  const getNodeStroke = (dir: string) => {
    if (dir === 'POSITIVE') return 'stroke-emerald-300';
    if (dir === 'NEGATIVE') return 'stroke-rose-300';
    if (dir === 'MIXED') return 'stroke-amber-300';
    return 'stroke-slate-300';
  };

  const isDimmedNode = (node: NodeData) => {
    if (hoveredNodeId === null) return false;
    if (hoveredNodeId === node.id) return false;
    return !links.some(l => 
      (l.source.id === node.id && l.target.id === hoveredNodeId) ||
      (l.target.id === node.id && l.source.id === hoveredNodeId)
    );
  };
  
  const isDimmedLink = (link: LinkData) => {
    if (hoveredNodeId === null) return false;
    return link.source.id !== hoveredNodeId && link.target.id !== hoveredNodeId;
  };

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  const hoveredLinkData = hoveredLinkId ? links.find(l => l.id === hoveredLinkId) : null;

  return (
    <section className="surface-panel rounded-xl flex flex-col overflow-hidden transition-all border border-white/5 relative" style={{ height: '600px' }}>
      
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-surface-base/80 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Network className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">Interactive Contradiction Graph</h3>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Force-Directed Network</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto bg-surface-elevated rounded-md p-1 border border-white/10">
          <button onClick={handleZoomOut} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-100 transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-100 transition-colors" title="Reset View">
            <Maximize className="w-4 h-4" />
          </button>
          <button onClick={handleZoomIn} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-100 transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main SVG Area */}
      <div 
        ref={containerRef}
        className="flex-1 w-full h-full bg-canvas cursor-move relative overflow-hidden"
        onMouseDown={(e) => {
          if (e.target === svgRef.current) setSelectedNodeId(null);
        }}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="-400 -300 800 600"
          preserveAspectRatio="xMidYMid slice"
        >
          <g transform={`scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
            {/* Links */}
            {links.map(link => {
              const isResolved = link.status === 'RESOLVED';
              const dimmed = isDimmedLink(link);
              const highlighted = hoveredLinkId === link.id || hoveredNodeId === link.source.id || hoveredNodeId === link.target.id;
              
              return (
                <line
                  key={link.id}
                  x1={link.source.x}
                  y1={link.source.y}
                  x2={link.target.x}
                  y2={link.target.y}
                  className={`transition-colors duration-200 cursor-pointer ${
                    isResolved ? 'stroke-slate-500' : 'stroke-amber-500'
                  }`}
                  strokeWidth={highlighted ? 3 : 1.5}
                  strokeDasharray={!isResolved ? "5,5" : "none"}
                  opacity={dimmed ? 0.15 : (highlighted ? 1 : 0.6)}
                  onMouseEnter={() => setHoveredLinkId(link.id)}
                  onMouseLeave={() => setHoveredLinkId(null)}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const dimmed = isDimmedNode(node);
              const selected = selectedNodeId === node.id;
              
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                  opacity={dimmed ? 0.3 : 1}
                >
                  <circle
                    r={selected ? 14 : 10}
                    className={`transition-all duration-200 ${getNodeColor(node.direction)} ${getNodeStroke(node.direction)}`}
                    strokeWidth={selected ? 3 : 1.5}
                  />
                  <text
                    y={22}
                    textAnchor="middle"
                    className="text-[10px] font-mono fill-slate-300 pointer-events-none select-none drop-shadow-md"
                  >
                    {node.title.length > 25 ? node.title.substring(0, 25) + '...' : node.title}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Tooltip for Links */}
        {hoveredLinkData && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface-elevated border border-white/10 rounded-lg p-3 shadow-xl max-w-sm pointer-events-none z-20">
            <div className="text-[10px] font-mono uppercase text-slate-400 mb-1 flex items-center justify-between">
              <span>Contradiction Link</span>
              <span className={hoveredLinkData.status === 'RESOLVED' ? 'text-emerald-400' : 'text-amber-400'}>
                {hoveredLinkData.status}
              </span>
            </div>
            <p className="text-xs text-slate-200">{hoveredLinkData.confounder}</p>
          </div>
        )}

        {/* Selected Node Details Panel */}
        {selectedNode && (
          <div className="absolute top-20 right-4 w-72 bg-surface-elevated/95 backdrop-blur border border-white/10 rounded-xl p-4 shadow-2xl z-20">
            <div className="text-[10px] font-mono uppercase tracking-wide text-slate-400 mb-2">Study Details</div>
            <h4 className="text-sm font-semibold text-slate-100 mb-3">{selectedNode.title}</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Direction</span>
                <span className={`font-mono font-bold ${
                  selectedNode.direction === 'POSITIVE' ? 'text-emerald-400' : 
                  selectedNode.direction === 'NEGATIVE' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {selectedNode.direction}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Sample Size</span>
                <span className="text-slate-200">{selectedNode.sampleSize || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">P-Value</span>
                <span className="text-slate-200">{selectedNode.pValue !== undefined ? selectedNode.pValue : 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
