'use client';

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnomalyChartProps {
  timeRange: string;
  threatLevel?: number;
}

const baseData = [
  { time: '00:00', anomalies: 2, threshold: 5, malicious: 0 },
  { time: '04:00', anomalies: 8, threshold: 5, malicious: 1 },
  { time: '08:00', anomalies: 5, threshold: 5, malicious: 0 },
  { time: '12:00', anomalies: 12, threshold: 5, malicious: 3 },
  { time: '16:00', anomalies: 18, threshold: 5, malicious: 5 },
  { time: '20:00', anomalies: 14, threshold: 5, malicious: 2 },
  { time: '24:00', anomalies: 9, threshold: 5, malicious: 1 },
];

export default function AnomalyChart({ timeRange, threatLevel = 7.3 }: AnomalyChartProps) {
  const isUnderAttack = threatLevel > 50;
  
  // Modify data based on threat level
  const data = baseData.map((d, idx) => ({
    ...d,
    anomalies: isUnderAttack && idx > 5 ? d.anomalies * (1 + (threatLevel - 50) / 50) : d.anomalies,
    malicious: isUnderAttack && idx > 5 ? d.malicious * (1 + (threatLevel - 50) / 50) : d.malicious,
  }));
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Anomaly Detection Timeline</h3>
        <p className="text-sm text-muted-foreground">Reconstruction errors vs behavioral baseline</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorMalicious" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff9500" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ff9500" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" />
          <YAxis stroke="rgba(255,255,255,0.5)" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(18, 18, 18, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px'
            }}
          />
          <Area type="monotone" dataKey="malicious" stroke="#ff9500" fillOpacity={1} fill="url(#colorMalicious)" />
          <Area type="monotone" dataKey="anomalies" stroke="#ff6b6b" fillOpacity={1} fill="url(#colorAnomalies)" />
          <Line type="monotone" dataKey="threshold" stroke="#888" strokeDasharray="5 5" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex gap-6 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-muted-foreground">Total Anomalies</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-muted-foreground">Malicious Classification</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{background: 'repeating-linear-gradient(90deg, #888, #888 5px, transparent 5px, transparent 10px)'}}></div>
          <span className="text-muted-foreground">Decision Threshold</span>
        </div>
      </div>
    </div>
  );
}
