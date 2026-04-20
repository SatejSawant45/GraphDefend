'use client'

import { Terminal } from 'lucide-react'
import { useRef, useEffect } from 'react'

export default function AnomalyLog({ logs }: { logs: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="w-full h-full min-h-[200px] border border-slate-700 bg-slate-950 rounded-xl p-4 flex flex-col font-mono shadow-2xl relative">
      <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
        <Terminal className="text-slate-400 w-4 h-4" />
        <h3 className="text-xs text-slate-400 font-bold tracking-wider">REASONING TERMINAL (XAI)</h3>
      </div>
      
      <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {logs.length === 0 ? (
          <p className="text-slate-600 text-sm animate-pulse">Initializing Baseline... Listening for traffic events...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`text-xs p-2 rounded border-l-2 ${log.type === 'Critical' ? 'bg-red-950/30 border-red-500 text-red-200' : log.type === 'Warning' ? 'bg-yellow-950/30 border-yellow-500 text-yellow-200' : 'bg-slate-900 border-emerald-500 text-emerald-300'}`}>
              <span className="text-slate-500 mr-2">[{log.time}]</span> 
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
