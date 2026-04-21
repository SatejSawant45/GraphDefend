'use client';

import React, { useState } from 'react';
import { ChevronDown, ShieldAlert } from 'lucide-react';

interface HistoricalThreatsTableProps {
  historyData: any[];
}

const classificationColors = {
  'Benign Anomaly': {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400',
  },
  'Suspicious': {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-400',
  },
  'Malicious': {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400',
  },
};

export default function HistoricalThreatsTable({ historyData }: HistoricalThreatsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Helper to format long IPs (especially IPv6)
  const formatIP = (ip: string) => {
    if (ip && ip.includes(':') && ip.length > 15) {
      const parts = ip.split(':');
      return `${parts[0]}:${parts[1]}...${parts[parts.length - 1]}`;
    }
    return ip || 'Unknown';
  };

  const displayData = historyData.map((d, i) => {
    let classification = 'Benign Anomaly';
    let conf = 50;
    if (d.threat_score > 0.8) {
        classification = 'Malicious';
        conf = Math.floor(d.threat_score * 100);
    } else if (d.threat_score > 0.4) {
        classification = 'Suspicious';
        conf = Math.floor(d.threat_score * 100);
    } else {
        classification = 'Benign Anomaly';
        conf = 100 - Math.floor(d.threat_score * 100); // 90% confident it's safe
    }

    return {
      _id: d._id || `fallback-${i}-${Date.now()}`,
      source: formatIP(d.src_ip),
      destination: formatIP(d.dst_ip),
      protocol: d.protocol || 'Unknown',
      dataVolume: d.total_bytes !== undefined ? `${(d.total_bytes / 1024).toFixed(2)} KB` : 'N/A',
      duration: d.flow_duration_sec !== undefined ? `${d.flow_duration_sec.toFixed(2)}s` : d.duration !== undefined ? `${d.duration.toFixed(2)}s` : 'N/A',
      reconstructionError: d.reconstruction_error || 0,
      classification: classification as any,
      confidence: conf,
      timestamp: d.timestamp ? new Date(d.timestamp).toLocaleString() : 'Just now'
    };
  });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden mt-6">
      <div className="p-6 border-b border-border flex items-center gap-2">
        <ShieldAlert className="text-red-500 w-5 h-5" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Historical Anomaly Database</h3>
          <p className="text-sm text-muted-foreground">Persisted records fetched via MongoDB (varies by timeframe)</p>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[600px]">
        <table className="w-full text-sm">
          <thead className="bg-black/20 border-b border-border sticky top-0">
            <tr>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground"></th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Source</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Destination</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Protocol</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Recon Error</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Classification</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayData.length > 0 ? displayData.map((threat: any) => {
              const colors = classificationColors[threat.classification as keyof typeof classificationColors] || classificationColors['Benign Anomaly'];
              const isExpanded = expandedRow === threat._id;
              return (
                <React.Fragment key={threat._id}>
                  <tr
                    className="hover:bg-black/20 transition-colors cursor-pointer border-b border-border"
                    onClick={() => setExpandedRow(isExpanded ? null : threat._id)}
                  >
                    <td className="px-6 py-4">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </td>
                    <td className="px-6 py-4 text-foreground font-mono text-xs">{threat.source}</td>
                    <td className="px-6 py-4 text-foreground font-mono text-xs">{threat.destination}</td>
                    <td className="px-6 py-4 text-muted-foreground">{threat.protocol}</td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{threat.reconstructionError.toFixed(3)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                        {threat.classification}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-black/30 rounded-full border border-border/50 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              threat.confidence > 90
                                ? 'bg-red-500'
                                : threat.confidence > 75
                                ? 'bg-orange-500'
                                : 'bg-yellow-500'
                            }`}
                            style={{ width: `${threat.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-muted-foreground text-xs">{threat.confidence}%</span>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className={`${colors.bg} border-t-2 ${colors.border}`}>
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Duration</p>
                            <p className="font-semibold text-foreground">{threat.duration}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Timestamp</p>
                            <p className="font-semibold text-foreground">{threat.timestamp}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Baseline Deviation</p>
                            <p className={`font-semibold ${colors.text}`}>
                              {(threat.reconstructionError * 100).toFixed(1)}% above threshold
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Recommendation</p>
                            <p className={`font-semibold ${colors.text}`}>
                              {threat.classification === 'Malicious' ? 'Isolate Host' : 'Investigate'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            }) : (
              <tr>
                 <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No historical anomalies found for this time range.
                 </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
