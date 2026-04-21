'use client';

import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronRight } from 'lucide-react';

interface LiveConnectionsTableProps {
  data: any[];
}

export default function LiveConnectionsTable({ data }: LiveConnectionsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Helper to toggle expanded state
  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Helper to format long IPs (especially IPv6)
  const formatIP = (ip: string) => {
    if (ip && ip.includes(':') && ip.length > 15) {
      const parts = ip.split(':');
      return `${parts[0]}:${parts[1]}...${parts[parts.length - 1]}`;
    }
    return ip || 'Unknown';
  };

  // Aggregate by IP pair
  const aggregatedData = new Map<string, any>();
  
  data.forEach((d) => {
    const src = d.src_ip || 'Unknown';
    const dst = d.dst_ip || 'Unknown';
    // Sort pair to make it bidirectionally oblivious, or keep strict source-dest
    const key = `${src}-${dst}`;
    
    if (!aggregatedData.has(key)) {
      aggregatedData.set(key, {
        idKey: key,
        src_ip: src,
        dst_ip: dst,
        totalBytes: d.total_bytes || 0,
        totalPackets: d.total_packets || 0,
        maxThreatScore: d.threat_score || 0,
        connections: [d]
      });
    } else {
      const existing = aggregatedData.get(key);
      existing.totalBytes += (d.total_bytes || 0);
      existing.totalPackets += (d.total_packets || 0);
      existing.maxThreatScore = Math.max(existing.maxThreatScore, d.threat_score || 0);
      
      // Update by flow_id to prevent duplicates in inner array (though we already decoupled in page.tsx)
      const existingFlowIndex = existing.connections.findIndex((c: any) => c.flow_id === d.flow_id);
      if (existingFlowIndex >= 0) {
          existing.connections[existingFlowIndex] = d;
      } else {
          existing.connections.push(d);
      }
    }
  });

  const displayPairs = Array.from(aggregatedData.values()).slice(0, 15); // Show latest 15 pairs

  const getClassification = (score: number) => {
    if (score > 0.8) return { label: 'Malicious', classes: 'bg-red-500/20 text-red-500 border border-red-500/30' };
    if (score > 0.4) return { label: 'Suspicious', classes: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' };
    return { label: 'Safe', classes: 'bg-green-500/10 text-green-500 border border-green-500/20' };
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-6 border-b border-border flex items-center gap-2">
        <Activity className="text-cyan-500 w-5 h-5" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Live Active Connections</h3>
          <p className="text-sm text-muted-foreground">Aggregated by IP Pairs</p>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[600px]">
        <table className="w-full text-sm">
          <thead className="bg-black/20 border-b border-border sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground w-12"></th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Source & Target IP</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Overall Volume</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Total Packets</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Active Flows</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Classification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayPairs.length > 0 ? displayPairs.map((pair: any) => {
              const isExpanded = expandedRows.has(pair.idKey);
              const config = getClassification(pair.maxThreatScore);
              
              return (
                <React.Fragment key={pair.idKey}>
                <tr 
                  className="hover:bg-black/20 transition-colors border-b border-border cursor-pointer group"
                  onClick={() => toggleRow(pair.idKey)}
                >
                  <td className="px-6 py-4">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-500" /> : <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-cyan-500" />}
                  </td>
                  <td className="px-6 py-4 text-foreground font-mono text-xs">
                    <span className="text-cyan-400">{formatIP(pair.src_ip)}</span>
                    <span className="text-muted-foreground mx-2">⇄</span>
                    <span className="text-amber-400">{formatIP(pair.dst_ip)}</span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {pair.totalBytes !== undefined ? `${(pair.totalBytes / 1024).toFixed(2)} KB` : '0 KB'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{pair.totalPackets || 0}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-md font-medium text-xs">
                       {pair.connections.length} socket{pair.connections.length > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.classes}`}>
                      {config.label}
                    </span>
                  </td>
                </tr>
                {/* Expanded Details Row */}
                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="p-0 border-b border-border bg-black/40">
                      <div className="overflow-x-auto p-4 pl-12">
                        <table className="w-full text-xs">
                          <thead className="text-muted-foreground mb-4">
                            <tr className="border-b border-border/50">
                              <th className="pb-2 text-left w-1/5">Src Port</th>
                              <th className="pb-2 text-left w-1/5">Dst Port</th>
                              <th className="pb-2 text-left w-1/5">Protocol</th>
                              <th className="pb-2 text-left w-1/5">Duration</th>
                              <th className="pb-2 text-left w-1/5">Threat Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pair.connections.map((c: any, i: number) => (
                              <tr key={`${c.flow_id || i}`} className="border-b border-transparent hover:bg-white/5">
                                <td className="py-2 text-cyan-400 font-mono">{c.src_port || 'Any'}</td>
                                <td className="py-2 text-amber-400 font-mono">{c.dst_port || 'Any'}</td>
                                <td className="py-2 text-slate-300">{c.protocol || 'OTHER'}</td>
                                <td className="py-2 text-slate-400">
                                   {c.duration !== undefined ? `${c.duration.toFixed(2)}s` : c.flow_duration_sec !== undefined ? `${c.flow_duration_sec.toFixed(2)}s` : '0.0s'}
                                </td>
                                <td className="py-2 font-mono">
                                  <span className={c.threat_score > 0.8 ? 'text-red-500' : c.threat_score > 0.4 ? 'text-orange-400' : 'text-green-500'}>
                                    {c.threat_score !== undefined ? `${(c.threat_score * 100).toFixed(1)}%` : 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            }) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  Waiting for active network traffic...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
