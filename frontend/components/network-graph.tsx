'use client';

import { useState } from 'react';
import { Activity } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: 'server' | 'client' | 'suspicious';
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
  suspicious: boolean;
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
    { from: 'pc1', to: 'web1', suspicious: false },
    { from: 'web1', to: 'server', suspicious: false },
  ];

  // Map real data if available
  if (mlData && mlData.length > 0) {
    const freshNodes: Node[] = [];
    const freshEdges: Edge[] = [];
    const seenNodes = new Set<string>();
    const seenEdges = new Set<string>();

    mlData.forEach((d, idx) => {
      if (d.src_ip && d.dst_ip) {
        if (!seenNodes.has(d.src_ip)) {
          seenNodes.add(d.src_ip);
          freshNodes.push({ id: d.src_ip, label: d.src_ip, type: d.threat_score > 0.8 ? 'suspicious' : 'client', x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
        }
        if (!seenNodes.has(d.dst_ip)) {
          seenNodes.add(d.dst_ip);
          freshNodes.push({ id: d.dst_ip, label: d.dst_ip, type: 'server', x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
        }
        
        const edgeId = `${d.src_ip}-${d.dst_ip}`;
        if (!seenEdges.has(edgeId)) {
          seenEdges.add(edgeId);
          freshEdges.push({ from: d.src_ip, to: d.dst_ip, suspicious: d.threat_score > 0.8 });
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
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className={`w-5 h-5 transition-colors ${isUnderAttack ? 'text-red-500' : 'text-cyan-500'}`} />
          Structural GNN Analysis
        </h3>
        <p className="text-sm text-muted-foreground">Network topology & anomalous connections</p>
      </div>

      <div className={`rounded-lg p-4 h-96 flex items-center justify-center border relative overflow-hidden transition-colors ${isUnderAttack ? 'bg-red-950/20 border-red-500/30' : 'bg-black/20 border-border/50'}`}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0">
          {/* Draw edges */}
          {edges.map((edge, idx) => {
            const from = nodes.find(n => n.id === edge.from);
            const to = nodes.find(n => n.id === edge.to);
            if (!from || !to) return null;
            const shouldHighlight = isUnderAttack && edge.suspicious;
            return (
              <line
                key={`edge-${idx}`}
                x1={`${from.x}%`}
                y1={`${from.y}%`}
                x2={`${to.x}%`}
                y2={`${to.y}%`}
                stroke={shouldHighlight ? '#ef4444' : edge.suspicious ? '#ff6b6b' : 'rgba(255,255,255,0.1)'}
                strokeWidth={shouldHighlight ? '1.5' : (edge.suspicious ? '1' : '0.5')}
                strokeDasharray={edge.suspicious ? '0' : '1,1'}
              />
            );
          })}

          {/* Draw nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNode === node.id;
            const colors = {
              server: '#00bcd4',
              client: '#4caf50',
              suspicious: '#ff6b6b',
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
                  r="2"
                  fill={colors[node.type]}
                  opacity={isSelected ? 1 : 0.7}
                  className="transition-opacity hover:opacity-100 drop-shadow-md"
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="0.5"
                />
                <text
                  x={`${node.x}%`}
                  y={`${node.y + 4}%`}
                  textAnchor="middle"
                  fontSize="1.5"
                  fill="rgba(255,255,255,0.7)"
                  className="pointer-events-none font-mono tracking-tighter"
                  style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.9)" }}
                >
                  {node.label.length > 12 ? node.label.substring(0,12) + "..." : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 text-xs z-10 bg-black/60 p-3 rounded border border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            <span className="text-muted-foreground">Servers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Clients</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-muted-foreground">Suspicious</span>
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-sm font-medium text-foreground">
            Selected: <span className="text-primary">{nodes.find(n => n.id === selectedNode)?.label}</span>
          </p>
        </div>
      )}
    </div>
  );
}
