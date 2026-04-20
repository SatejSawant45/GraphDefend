'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

export default function FeatureRadar({ radarData, isAttack }: { radarData: any[], isAttack: boolean }) {
  const color = isAttack ? "#ef4444" : "#6366f1"
  return (
    <div className="w-full h-full min-h-[250px] border border-slate-700 bg-slate-900/50 rounded-xl p-4 flex flex-col shadow-2xl">
      <h3 className="font-mono text-xs text-slate-400 mb-2 font-bold tracking-wider">FEATURE VECTORS (AUTOENCODER)</h3>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Feature" dataKey="A" stroke={color} fill={color} fillOpacity={0.4} isAnimationActive={true} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
