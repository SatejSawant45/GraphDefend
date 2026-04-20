'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function NetworkHeartbeat({ data, currentThreat }: { data: any[], currentThreat: number }) {
  // Determine color based on threat level
  const statusColor = currentThreat > 0.8 ? '#ef4444' : currentThreat > 0.4 ? '#eab308' : '#22c55e'

  return (
    <div className="w-full h-full min-h-[250px] border border-slate-700 bg-slate-900/50 rounded-xl p-4 flex flex-col shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-mono text-xs text-slate-400">THREAT HEARTBEAT</h3>
        <div className="flex items-center gap-2">
           <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: statusColor }}></span>
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: statusColor }}></span>
          </span>
          <span className="font-mono text-sm font-bold tracking-wider" style={{ color: statusColor }}>
            {(currentThreat * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 1]} hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontFamily: 'monospace' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <ReferenceLine y={0.8} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
            <ReferenceLine y={0.4} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} />
            <Line 
              type="monotone" 
              dataKey="threat" 
              stroke={statusColor} 
              strokeWidth={3}
              dot={false}
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
