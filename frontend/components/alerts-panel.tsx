'use client';

import { Bell } from 'lucide-react';

interface Alert {
  id: number;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  timestamp: string;
}

interface AlertsPanelProps {
  threatLevel?: number;
}

const baseAlerts: Alert[] = [
  {
    id: 1,
    severity: 'critical',
    title: 'Suspicious Port Scan',
    description: 'Guest-Laptop scanning ports 3306-3310',
    timestamp: '2 min ago',
  },
  {
    id: 2,
    severity: 'high',
    title: 'Data Exfiltration',
    description: 'Unusual data transfer volume detected',
    timestamp: '15 min ago',
  },
  {
    id: 3,
    severity: 'high',
    title: 'Failed Auth Attempts',
    description: '47 failed SSH logins from PC-001',
    timestamp: '1 hour ago',
  },
  {
    id: 4,
    severity: 'medium',
    title: 'Protocol Anomaly',
    description: 'Unexpected encrypted traffic pattern',
    timestamp: '3 hours ago',
  },
];

const severityColors = {
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    text: 'text-red-400',
  },
  high: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
    text: 'text-orange-400',
  },
  medium: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    dot: 'bg-yellow-500',
    text: 'text-yellow-400',
  },
};

export default function AlertsPanel({ threatLevel = 7.3 }: AlertsPanelProps) {
  const isUnderAttack = threatLevel > 50;
  const alerts = isUnderAttack ? baseAlerts : baseAlerts.slice(0, 2);
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-500" />
          Recent Alerts
        </h3>
        <p className="text-sm text-muted-foreground">{alerts.length} active alerts</p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.map((alert) => {
          const colors = severityColors[alert.severity];
          return (
            <div
              key={alert.id}
              className={`${colors.bg} border ${colors.border} rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer`}
            >
              <div className="flex gap-3">
                <div className={`w-2 h-2 rounded-full ${colors.dot} mt-1 flex-shrink-0`}></div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${colors.text}`}>{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {alert.description}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">{alert.timestamp}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="w-full mt-4 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 rounded-lg text-sm font-medium text-primary transition-colors">
        View All Alerts
      </button>
    </div>
  );
}
