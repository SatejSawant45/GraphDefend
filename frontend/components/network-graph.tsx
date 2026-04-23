'use client';

import { useState } from 'react';
import { Activity, ShieldAlert, Zap } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: 'server' | 'client' | 'suspicious_volume' | 'suspicious_structural';
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
  isVolumeAnomaly: boolean;
  isStructuralAnomaly: boolean;
  threatScore: number;
}

interface NetworkGraphProps {
  threatLevel?: number;
  mlData?: any[];
}

export default function NetworkGraph({ threatLevel = 7.3, mlData = [] }: NetworkGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const isUnderAttack = threatLevel > 50;

  // Initial nodes and edges (base structure)
  let nodes: Node[] = [
    { id: 'server', label: 'DB Server', type: 'server', x: 50, y: 50 },
    { id: 'web1', label: 'Web Server 1', type: 'server', x: 50, y: 80 },
    { id: 'pc1', label: 'PC-001', type: 'client', x: 20, y: 30 },
  ];

  let edges: Edge[] = [
    { from: 'pc1', to: 'web1', isVolumeAnomaly: false, isStructuralAnomaly: false, threatScore: 0.1 },
    { from: 'web1', to: 'server', isVolumeAnomaly: false, isStructuralAnomaly: false, threatScore: 0.1 },
  ];

  // Helper to format long IPs (especially IPv6)
  const formatIP = (ip: string) => {
    if (ip.includes(':') && ip.length > 15) {
      const parts = ip.split(':');
      return `${parts[0]}:${parts[1]}...${parts[parts.length - 1]}`;
    }
    return ip.length > 12 ? ip.substring(0, 12) + "..." : ip;
  };

  // Map real data if available
  if (mlData && mlData.length > 0) {
    const freshNodes: Node[] = [];
    const freshEdges: Edge[] = [];
    const seenNodes = new Set<string>();
    const seenEdges = new Set<string>();

    mlData.forEach((d) => {
      if (d.src_ip && d.dst_ip) {
        // Thresholds based on brain.py: threshold=0.2, gnn_threshold=0.15
        const isVolume = d.flow_error > 0.2;
        const isStructural = d.structural_error > 0.15;
        
        if (!seenNodes.has(d.src_ip)) {
          seenNodes.add(d.src_ip);
          freshNodes.push({ 
            id: d.src_ip, 
            label: d.src_ip, 
            type: isStructural ? 'suspicious_structural' : (isVolume ? 'suspicious_volume' : 'client'), 
            x: Math.random() * 80 + 10, 
            y: Math.random() * 80 + 10 
          });
        }
        if (!seenNodes.has(d.dst_ip)) {
          seenNodes.add(d.dst_ip);
          freshNodes.push({ id: d.dst_ip, label: d.dst_ip, type: 'server', x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
        }
        
        const edgeId = `${d.src_ip}-${d.dst_ip}`;
        if (!seenEdges.has(edgeId)) {
          seenEdges.add(edgeId);
          freshEdges.push({ 
            from: d.src_ip, 
            to: d.dst_ip, 
            isVolumeAnomaly: isVolume,
            isStructuralAnomaly: isStructural,
            threatScore: d.threat_score || 0
          });
        }
      }
    });

    if (freshNodes.length > 0) {
      nodes = freshNodes;
      edges = freshEdges;
    }
  }

  return (
    <div className={`bg-card border rounded-lg p-6 transition-colors ${isUnderAttack ? 'border-red-500/50' : 'border-border'}`}>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className={`w-5 h-5 transition-colors ${isUnderAttack ? 'text-red-500' : 'text-cyan-500'}`} />
            Structural GNN Analysis
          </h3>
          <p className="text-sm text-muted-foreground">Ensemble Detection: Flow Volumes & Graph Topology</p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-md border border-red-500/20">
              <Zap className="w-3 h-3 text-red-500" />
              <span className="text-[10px] text-red-400 font-medium">Volume Anomaly</span>
           </div>
           <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-md border border-amber-500/20">
              <ShieldAlert className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] text-amber-400 font-medium">Lateral Jump</span>
           </div>
        </div>
      </div>

      <div className={`rounded-lg p-4 h-96 flex items-center justify-center border relative overflow-hidden transition-colors ${isUnderAttack ? 'bg-red-950/20 border-red-500/30' : 'bg-black/20 border-border/50'}`}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0">
          {/* Draw edges */}
          {edges.map((edge, idx) => {
            const from = nodes.find(n => n.id === edge.from);
            const to = nodes.find(n => n.id === edge.to);
            if (!from || !to) return null;
            
            let strokeColor = 'rgba(255,255,255,0.1)';
            let strokeWidth = '0.5';
            let className = '';

            if (edge.isStructuralAnomaly) {
              strokeColor = '#f59e0b'; // Amber-500
              strokeWidth = '1.2';
            } else if (edge.isVolumeAnomaly) {
              strokeColor = '#ef4444'; // Red-500
              strokeWidth = '1.5';
              className = 'animate-pulse';
            } else if (edge.threatScore > 0.4) {
              strokeColor = '#fbbf24'; // Yellow-400
              strokeWidth = '0.8';
            }

            return (
              <line
                key={`edge-${idx}`}
                x1={`${from.x}%`}
                y1={`${from.y}%`}
                x2={`${to.x}%`}
                y2={`${to.y}%`}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                className={className}
                strokeDasharray={(edge.isVolumeAnomaly || edge.isStructuralAnomaly) ? '0' : '1,1'}
              />
            );
          })}

          {/* Draw nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNode === node.id;
            const colors = {
              server: '#00bcd4',
              client: '#4caf50',
              suspicious_volume: '#ef4444',
              suspicious_structural: '#f59e0b',
            };
            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={`${node.x}%`}
                  cy={`${node.y}%`}
                  r={isSelected ? "3" : "2"}
                  fill={colors[node.type]}
                  opacity={isSelected ? 1 : 0.8}
                  className="transition-all hover:opacity-100 drop-shadow-md"
                  stroke={isSelected ? "white" : "rgba(0,0,0,0.5)"}
                  strokeWidth="0.5"
                />
                <text
                  x={`${node.x}%`}
                  y={`${node.y + 4}%`}
                  textAnchor="middle"
                  fontSize="2"
                  fill="rgba(255,255,255,0.7)"
                  className="pointer-events-none font-mono tracking-tighter"
                  style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.9)" }}
                >
                  {formatIP(node.label)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 text-[10px] z-10 bg-black/60 p-3 rounded border border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            <span className="text-muted-foreground">Servers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Normal Hosts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-muted-foreground">Volume Spike</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-muted-foreground">Lateral Jump</span>
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-medium text-foreground">
            Identity: <span className="text-primary font-mono">{nodes.find(n => n.id === selectedNode)?.label}</span>
          </p>
        </div>
      )}
    </div>
  );
}
