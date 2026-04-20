'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ThreatHeartbeatProps {
  threatLevel: number;
}

export default function ThreatHeartbeat({ threatLevel }: ThreatHeartbeatProps) {
  // Generate sample data based on threat level
  const generateData = () => {
    const data = [];
    for (let i = 0; i < 30; i++) {
      let value = Math.sin(i / 5) * 5 + 8;
      if (i > 20 && threatLevel > 50) {
        value = 15 + (i - 20) * (threatLevel - 8) / 10;
      }
      data.push({ time: i, threat: Math.max(0, Math.min(100, value)) });
    }
    return data;
  };

  const data = generateData();
  const isHighThreat = threatLevel > 50;
  const lineColor = isHighThreat ? '#ef4444' : '#10b981';

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">THREAT HEARTBEAT</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isHighThreat ? 'bg-red-500' : 'bg-green-500'}`}></div>
          <span className={`text-lg font-bold ${isHighThreat ? 'text-red-500' : 'text-green-500'}`}>
            {threatLevel.toFixed(1)}%
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="time" hide />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
            }}
            formatter={(value) => `${(value as number).toFixed(1)}%`}
          />
          <Line
            type="monotone"
            dataKey="threat"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
