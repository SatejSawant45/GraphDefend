'use client'

import React, { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import react-force-graph-2d (disables SSR which breaks canvas)
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

export default function GNNMap({ data }: { data: any }) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      })
      
      const handleResize = () => {
         if (containerRef.current) {
            setDimensions({
               width: containerRef.current.offsetWidth,
               height: containerRef.current.offsetHeight
            })
         }
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full min-h-[300px] border border-slate-700 bg-slate-900/50 rounded-xl overflow-hidden relative shadow-2xl">
      <div className="absolute top-4 left-4 z-10 font-mono text-xs text-slate-400">
        STRUCTURAL GNN ANALYSIS
      </div>
      {isMounted && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={data}
          nodeLabel="id"
          nodeColor={(node: any) => node.isAnomaly ? '#ef4444' : '#6366f1'}
          linkColor={(link: any) => link.isAnomaly ? '#ef4444' : 'rgba(255,255,255,0.15)'}
          backgroundColor="#020617" // slate-950
          nodeRelSize={4}
          linkDirectionalParticles={(link: any) => link.isAnomaly ? 4 : 1}
          linkDirectionalParticleSpeed={(link: any) => link.isAnomaly ? 0.02 : 0.005}
          linkWidth={(link: any) => link.isAnomaly ? 2 : 1}
        />
      )}
    </div>
  )
}
