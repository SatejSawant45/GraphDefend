'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface FeatureVectorsProps {
  threatLevel: number;
}

export default function FeatureVectors({ threatLevel }: FeatureVectorsProps) {
  const isHighThreat = threatLevel > 50;

  // Feature vectors with values that increase with threat level
  const data = [
    { name: 'Packets', value: 40 + threatLevel * 0.3, fullMark: 100 },
    { name: 'Entropy', value: 35 + threatLevel * 0.4, fullMark: 100 },
    { name: 'Bytes', value: 50 + threatLevel * 0.2, fullMark: 100 },
    { name: 'Duration', value: 30 + threatLevel * 0.35, fullMark: 100 },
    { name: 'IAT', value: 45 + threatLevel * 0.25, fullMark: 100 },
    { name: 'SYN Flags', value: 25 + threatLevel * 0.5, fullMark: 100 },
  ];

  const radarColor = isHighThreat ? '#ef4444' : '#6366f1';
  const fillColor = isHighThreat ? 'rgba(239, 68, 68, 0.25)' : 'rgba(99, 102, 241, 0.25)';

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        FEATURE VECTORS (AUTOENCODER)
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
          />
          <Radar
            name="Feature Value"
            dataKey="value"
            stroke={radarColor}
            fill={fillColor}
            strokeWidth={2}
            isAnimationActive={true}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
