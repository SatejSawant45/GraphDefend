'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, ShieldAlert, Zap } from 'lucide-react'
import GNNMap from '@/components/GNNMap'
import NetworkHeartbeat from '@/components/NetworkHeartbeat'
import AnomalyLog from '@/components/AnomalyLog'
import FeatureRadar from '@/components/FeatureRadar'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001');

export default function Dashboard() {
  // State variables for our data
  const [threatLevel, setThreatLevel] = useState(0.05)
  const [isAttack, setIsAttack] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  
  const [heartbeatData, setHeartbeatData] = useState<{time: string, threat: number}[]>([])

  // Radar Data Shape
  const [radarData, setRadarData] = useState([
    { subject: 'Packets', A: 20 },
    { subject: 'Bytes', A: 15 },
    { subject: 'Duration', A: 30 },
    { subject: 'IAT', A: 10 },
    { subject: 'SYN Flags', A: 5 },
    { subject: 'Entropy', A: 40 },
  ])

  // Mock Graph Data for Layout Mapping
  const [graphData, setGraphData] = useState({
    nodes: [
      { id: '192.168.1.1', group: 1, isAnomaly: false },
      { id: '192.168.1.100 (Host)', group: 2, isAnomaly: false },
      { id: '8.8.8.8', group: 3, isAnomaly: false },
      { id: '104.21.5.14', group: 3, isAnomaly: false }
    ],
    links: [
      { source: '192.168.1.100 (Host)', target: '192.168.1.1', isAnomaly: false },
      { source: '192.168.1.100 (Host)', target: '8.8.8.8', isAnomaly: false },
      { source: '192.168.1.1', target: '104.21.5.14', isAnomaly: false }
    ]
  })

  // Live WebSocket Effect (Heartbeat)
  useEffect(() => {
    // Initialize data on client side to prevent SSR Hydration Mismatch
    setHeartbeatData(Array(20).fill(0).map((_, i) => ({ time: i.toString(), threat: 0.05 })))

    const handleNetworkUpdate = (data: any[]) => {
      if (!data || data.length === 0) return;
      
      const latestFlow = data[0];
      const newThreat = latestFlow.threat_score || 0.05;
      
      setThreatLevel(newThreat);
      
      setHeartbeatData((prev) => {
        const newData = [...prev.slice(1)];
        newData.push({ time: Date.now().toString(), threat: newThreat });
        return newData;
      });

      // Update radar data using live incoming features if available
      // Fallback simulates a jump if threat score is high
      if (newThreat > 0.5) {
        setRadarData([
          { subject: 'Packets', A: 85 + (Math.random() * 10) },
          { subject: 'Bytes', A: 90 + (Math.random() * 5) },
          { subject: 'Duration', A: 10 },
          { subject: 'IAT', A: 95 },
          { subject: 'SYN Flags', A: 100 },
          { subject: 'Entropy', A: 88 },
        ])
      } else {
        setRadarData([
          { subject: 'Packets', A: 20 + (Math.random() * 5) },
          { subject: 'Bytes', A: 15 },
          { subject: 'Duration', A: 30 },
          { subject: 'IAT', A: 10 },
          { subject: 'SYN Flags', A: 5 },
          { subject: 'Entropy', A: 40 },
        ])
      }
    };

    socket.on('network-update', handleNetworkUpdate);

    return () => {
      socket.off('network-update', handleNetworkUpdate);
    };
  }, []);

  const triggerAttackSimulation = useCallback(() => {
    setIsAttack(true)
    
    // Signal the backend to generate attack packets
    socket.emit('simulate_attack');
    
    // Add anomaly log
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      type: 'Critical',
      message: 'CRITICAL: High Reconstruction Error (0.92) detected from 185.14.22.9. Suspect behavior: SYN Flood / Lateral Movement.'
    }])

    // Modify Graph to show the attack path
    setGraphData(prev => ({
      nodes: [...prev.nodes, { id: '185.14.22.9 (Attacker)', group: 4, isAnomaly: true }],
      links: [...prev.links, 
             { source: '185.14.22.9 (Attacker)', target: '192.168.1.100 (Host)', isAnomaly: true },
             { source: '185.14.22.9 (Attacker)', target: '192.168.1.1', isAnomaly: true }]
    }))
    
    setTimeout(() => {
      setIsAttack(false)
      // Reset graph
      setGraphData({
        nodes: [
          { id: '192.168.1.1', group: 1, isAnomaly: false },
          { id: '192.168.1.100 (Host)', group: 2, isAnomaly: false },
          { id: '8.8.8.8', group: 3, isAnomaly: false },
          { id: '104.21.5.14', group: 3, isAnomaly: false }
        ],
        links: [
          { source: '192.168.1.100 (Host)', target: '192.168.1.1', isAnomaly: false },
          { source: '192.168.1.100 (Host)', target: '8.8.8.8', isAnomaly: false },
          { source: '192.168.1.1', target: '104.21.5.14', isAnomaly: false }
        ]
      })
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        type: 'Safe',
        message: 'INFO: Threat mitigated. Flow vectors returned to normal baseline.'
      }])
    }, 8000) // Attack demo lasts 8 seconds
  }, [])

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-6 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          {isAttack ? (
            <div className="relative">
              <ShieldAlert className="w-8 h-8 text-red-500 animate-bounce relative z-10" />
              <div className="absolute inset-0 bg-red-500 blur-xl opacity-50 z-0"></div>
            </div>
          ) : (
            <Shield className="w-8 h-8 text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          )}
          <div>
            <h1 className="text-xl font-bold tracking-widest uppercase text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">Sentinel AI</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">SIH1451: Zero-Trust Network Compromise Detection</p>
          </div>
        </div>
        
        {/* The "Pro-Tip" Hidden Demo Button */}
        <button 
          onClick={triggerAttackSimulation}
          disabled={isAttack}
          className={`flex items-center gap-2 px-4 py-2 rounded border font-mono text-xs uppercase transition-all duration-300 ${
            isAttack 
            ? 'bg-red-950/30 text-red-500 border-red-900 cursor-not-allowed opacity-50' 
            : 'bg-indigo-900/40 hover:bg-indigo-600 text-indigo-200 hover:text-white border-indigo-700 hover:border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)]'
          }`}
        >
          <Zap className="w-4 h-4" />
          {isAttack ? 'Simulating Attack...' : 'Simulate Attack'}
        </button>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
        
        {/* Left Column */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-full">
          <div className="flex-1 min-h-0">
            <NetworkHeartbeat data={heartbeatData} currentThreat={threatLevel} />
          </div>
          <div className="flex-1 min-h-0">
            <FeatureRadar radarData={radarData} isAttack={isAttack} />
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">
          <div className="flex-[2] min-h-0">
             <GNNMap data={graphData} />
          </div>
          <div className="flex-[1] min-h-0">
            <AnomalyLog logs={logs} />
          </div>
        </div>

      </div>
    </main>
  )
}
