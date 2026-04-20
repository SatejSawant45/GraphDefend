'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Threat {
  id: number;
  source: string;
  destination: string;
  protocol: string;
  dataVolume: string;
  duration: string;
  reconstructionError: number;
  classification: 'Benign Anomaly' | 'Malicious' | 'Suspicious';
  confidence: number;
  timestamp: string;
}

const threats: Threat[] = [
  {
    id: 1,
    source: 'Guest-Laptop (192.168.1.45)',
    destination: 'DB Server (192.168.1.10)',
    protocol: 'SSH',
    dataVolume: '2.3 GB',
    duration: '47 min',
    reconstructionError: 0.156,
    classification: 'Malicious',
    confidence: 98,
    timestamp: '10:23 AM',
  },
  {
    id: 2,
    source: 'PC-002 (192.168.1.52)',
    destination: 'External Cloud (142.251.*.*)  ',
    protocol: 'TLS',
    dataVolume: '1.8 GB',
    duration: '2:15 AM',
    reconstructionError: 0.124,
    classification: 'Suspicious',
    confidence: 85,
    timestamp: '02:15 AM',
  },
  {
    id: 3,
    source: 'Printer-Net (192.168.1.88)',
    destination: 'Web Server (192.168.1.50)',
    protocol: 'HTTP',
    dataVolume: '145 MB',
    duration: '23 sec',
    reconstructionError: 0.045,
    classification: 'Benign Anomaly',
    confidence: 72,
    timestamp: '09:42 AM',
  },
  {
    id: 4,
    source: 'PC-001 (192.168.1.30)',
    destination: 'DB Server (192.168.1.10)',
    protocol: 'TCP',
    dataVolume: '512 MB',
    duration: '8:30 PM',
    reconstructionError: 0.089,
    classification: 'Suspicious',
    confidence: 76,
    timestamp: '20:30 PM',
  },
  {
    id: 5,
    source: 'Web Server (192.168.1.50)',
    destination: 'DNS Server (8.8.8.8)',
    protocol: 'UDP',
    dataVolume: '2.1 GB',
    duration: '1:45 PM',
    reconstructionError: 0.198,
    classification: 'Malicious',
    confidence: 94,
    timestamp: '13:45 PM',
  },
];

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

interface ThreatsTableProps {
  mlData: any[];
}

export default function ThreatsTable({ mlData }: ThreatsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Map API live data over the hardcoded threats. Fallback to hardcoded array if empty.
  const displayThreats = mlData && mlData.length > 0 ? mlData.map((d, i) => {
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
      id: d.flow_id,
      source: d.src_ip || 'Unknown',
      destination: d.dst_ip || 'Unknown',
      protocol: d.protocol || 'Unknown',
      dataVolume: d.total_bytes !== undefined ? `${(d.total_bytes / 1024).toFixed(2)} KB` : 'N/A',
      duration: d.duration !== undefined ? `${d.duration.toFixed(2)}s` : 'N/A',
      reconstructionError: d.reconstruction_error || 0,
      classification: classification as any,
      confidence: conf,
      timestamp: new Date().toLocaleTimeString()
    };
  }) : threats;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Detected Anomalies</h3>
        <p className="text-sm text-muted-foreground">Last 24 hours - Behavioral analysis results</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/20 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground"></th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Source</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Destination</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Protocol</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Volume</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Recon Error</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Classification</th>
              <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayThreats.map((threat: any) => {
              const colors = classificationColors[threat.classification as 'Benign Anomaly' | 'Malicious' | 'Suspicious'] || classificationColors['Benign Anomaly'];
              const isExpanded = expandedRow === threat.id;
              return (
                <React.Fragment key={threat.id}>
                  <tr
                    className="hover:bg-black/20 transition-colors cursor-pointer border-b border-border"
                    onClick={() => setExpandedRow(isExpanded ? null : threat.id)}
                  >
                    <td className="px-6 py-4">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </td>
                    <td className="px-6 py-4 text-foreground">{threat.source}</td>
                    <td className="px-6 py-4 text-foreground">{threat.destination}</td>
                    <td className="px-6 py-4 text-muted-foreground">{threat.protocol}</td>
                    <td className="px-6 py-4 text-muted-foreground">{threat.dataVolume}</td>
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
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border text-center">
        <button className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">
          Load More Results
        </button>
      </div>
    </div>
  );
}
