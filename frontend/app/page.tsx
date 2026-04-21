'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';
import MetricsCards from '@/components/metrics-cards';
import AnomalyChart from '@/components/anomaly-chart';
import NetworkGraph from '@/components/network-graph';
import HistoricalThreatsTable from '@/components/historical-threats-table';
import LiveConnectionsTable from '@/components/live-connections-table';
import BaselineProgress from '@/components/baseline-progress';
import AlertsPanel from '@/components/alerts-panel';
import ThreatHeartbeat from '@/components/threat-heartbeat';
import FeatureVectors from '@/components/feature-vectors';
import ReasoningTerminal from '@/components/reasoning-terminal';
import { io } from 'socket.io-client';

// Connect to the Node.js Primary Server
const socket = io('http://localhost:3001');

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isUnderAttack, setIsUnderAttack] = useState(false);
  const [threatLevel, setThreatLevel] = useState(7.3);
  
  // Store raw ML Data if components need to utilize it
  const [mlData, setMlData] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch Historical Anomaly log on Mount
    fetch('http://localhost:3001/api/history')
      .then(res => res.json())
      .then(data => {
         if (data && data.length > 0) {
            // Map MongoDB schema slightly to match local expectations if needed, or simply inject
            setMlData(data);
         }
      })
      .catch(err => console.error("Failed to load historical anomalies:", err));

    // 2. Listen for live data from the Python ML -> Node Pipeline
    socket.on('network-update', (data: any[]) => {
      if (data && data.length > 0) {
         setMlData(prevData => {
           // Create a new array blending the latest update with previous history
           // Deduplicate using flow_id
           const newItemsDict = new Map();
           data.forEach(item => newItemsDict.set(item.flow_id, item));
           const filteredPrev = prevData.filter(item => !newItemsDict.has(item.flow_id));
           
           const merged = [...data, ...filteredPrev].slice(0, 100);
           return merged;
         });
         
         // Get the threat score from the first flow (scale from 0-1 to 0-100)
         const newThreatScore = data[0].threat_score * 100;
         setThreatLevel(newThreatScore);
      }
    });

    return () => {
      socket.off('network-update');
    };
  }, []);

  const handleSimulateAttack = () => {
    const newStatus = !isUnderAttack;
    setIsUnderAttack(newStatus);
    
    // Tell the Node backend to toggle its mockup Syn flood streams
    if (newStatus) {
      socket.emit('simulate_attack');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header 
        timeRange={timeRange} 
        setTimeRange={setTimeRange} 
        autoRefresh={autoRefresh} 
        setAutoRefresh={setAutoRefresh}
        isUnderAttack={isUnderAttack}
        onSimulateAttack={handleSimulateAttack}
      />
      
      <main className="p-6 max-w-7xl mx-auto">
        {/* Metrics Overview */}
        <section className="mb-6">
          <MetricsCards mlData={mlData} />
        </section>

        {/* Structural GNN (Full Width Row) */}
        <div className="mb-6">
          <NetworkGraph threatLevel={threatLevel} mlData={mlData} />
        </div>

        {/* Live Nodes Table directly below the Graph */}
        <section className="mb-6">
          <LiveConnectionsTable data={mlData} />
          <HistoricalThreatsTable historyData={mlData} />
        </section>

        {/* Second Row - Threat Heartbeat & Feature Vectors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <ThreatHeartbeat threatLevel={threatLevel} />
          </div>
          <div>
            <FeatureVectors threatLevel={threatLevel} />
          </div>
        </div>

        {/* Second Row - Reasoning Terminal & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <ReasoningTerminal threatLevel={threatLevel} />
          </div>
          <div>
            <AlertsPanel threatLevel={threatLevel} />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <AnomalyChart timeRange={timeRange} threatLevel={threatLevel} />
          </div>
          <div>
            <BaselineProgress />
          </div>
        </div>
      </main>
    </div>
  );
}
