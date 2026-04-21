'use client';

import React from 'react';
import { Activity } from 'lucide-react';

interface LiveConnectionsTableProps {
  data: any[];
}

export default function LiveConnectionsTable({ data }: LiveConnectionsTableProps) {
  // Helper to format long IPs (especially IPv6)
  const formatIP = (ip: string) => {
    if (ip && ip.includes(':') && ip.length > 15) {
      const parts = ip.split(':');
      return `${parts[0]}:${parts[1]}...${parts[parts.length - 1]}`;
    }
    return ip || 'Unknown';
  };

  const displayData = data.slice(0, 15); // Show latest 15 connections

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-6 border-b border-border flex items-center gap-2">
        <Activity className="text-cyan-500 w-5 h-5" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Live Active Connections</h3>
          <p className="text-sm text-muted-foreground">Real-time network flow data bridging the GNN</p>
        </div>
      </div>

      <div className="overflow-x-auto h-64">
        <table className="w-full text-sm">
          <thead className="bg-black/20 border-b border-border sticky top-0">
            <tr>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Source IP</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Destination IP</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Protocol</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Packets</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Volume</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayData.length > 0 ? displayData.map((d: any, i: number) => {
              const id = d.flow_id && d.flow_id !== 'unknown' ? d.flow_id : `live-flow-${i}-${Date.now()}`;
              return (
                <tr key={id} className="hover:bg-black/20 transition-colors border-b border-border">
                  <td className="px-6 py-2 text-foreground font-mono text-xs">{formatIP(d.src_ip)}</td>
                  <td className="px-6 py-2 text-foreground font-mono text-xs">{formatIP(d.dst_ip)}</td>
                  <td className="px-6 py-2 text-muted-foreground">{d.protocol || 'OTHER'}</td>
                  <td className="px-6 py-2 text-muted-foreground">{d.total_packets || 0}</td>
                  <td className="px-6 py-2 text-muted-foreground">
                    {d.total_bytes !== undefined ? `${(d.total_bytes / 1024).toFixed(2)} KB` : 'N/A'}
                  </td>
                  <td className="px-6 py-2 font-mono text-muted-foreground">
                    {d.duration !== undefined ? `${d.duration.toFixed(2)}s` : d.flow_duration_sec !== undefined ? `${d.flow_duration_sec.toFixed(2)}s` : 'N/A'}
                  </td>
                </tr>
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
