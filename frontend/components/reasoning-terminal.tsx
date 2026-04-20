'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface ReasoningTerminalProps {
  threatLevel: number;
}

export default function ReasoningTerminal({ threatLevel }: ReasoningTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHighThreat = threatLevel > 50;

  // Generate terminal messages based on threat level
  const getMessages = () => {
    const baseMessages = [
      '[23:05:12] Initializing Baseline...',
      '[23:05:13] Listening for traffic events...',
      '[23:05:14] Loading GNN weights...',
    ];

    if (isHighThreat) {
      return [
        ...baseMessages,
        '[23:09:03] CRITICAL: High Reconstruction Error (0.92) detected from 185.14.22.9',
        '[23:09:04] Analyzing: SYN Flood / Lateral Movement pattern detected',
        '[23:09:05] GNN Classification: MALICIOUS (confidence: 0.94)',
        '[23:09:06] Feature deviation: Entropy +0.68 | Packets +1.2K | Duration +45s',
        '[23:09:07] Blocking source IP and alerting security team...',
      ];
    }

    return baseMessages;
  };

  const messages = getMessages();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threatLevel]);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">REASONING TERMINAL (XAI)</h3>
      </div>

      <div
        ref={scrollRef}
        className="bg-black/30 rounded border border-border p-4 h-48 overflow-y-auto font-mono text-xs text-muted-foreground space-y-1"
      >
        {messages.map((msg, idx) => {
          const isCritical = msg.includes('CRITICAL');
          const isBlocking = msg.includes('Blocking');

          return (
            <div
              key={idx}
              className={`font-mono text-xs ${
                isCritical ? 'text-red-500' : isBlocking ? 'text-yellow-500' : 'text-cyan-600'
              }`}
            >
              {msg}
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
        System monitoring active
      </div>
    </div>
  );
}
