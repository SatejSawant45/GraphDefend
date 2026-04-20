import { AlertTriangle, TrendingUp, Shield, Zap } from 'lucide-react';

interface Props {
  mlData?: any[];
}

export default function MetricsCards({ mlData }: Props) {
  // Aggregate data to build dynamic metrics
  const anomalies = mlData?.filter(d => d.threat_score > 0.8) || [];
  const uniqueHosts = new Set<string>();
  let totalLogs = 0;

  mlData?.forEach(d => {
    totalLogs++;
    if (d.src_ip) uniqueHosts.add(d.src_ip);
    if (d.dst_ip) uniqueHosts.add(d.dst_ip);
  });

  const lateralCount = anomalies.filter(d => d.protocol === 'TCP' && d.dst_port !== 80 && d.dst_port !== 443).length;

  const dynamicMetrics = [
    {
      label: 'Critical Anomalies',
      value: anomalies.length.toString(),
      change: `${anomalies.length > 0 ? '+'+anomalies.length : '0'} today`,
      icon: AlertTriangle,
      color: anomalies.length > 0 ? 'text-red-500' : 'text-green-500',
      bgColor: anomalies.length > 0 ? 'bg-red-500/10' : 'bg-green-500/10',
    },
    {
      label: 'Baseline Learning',
      value: '92%',
      change: 'Active Profiling',
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Network Hosts',
      value: uniqueHosts.size > 0 ? uniqueHosts.size.toString() : '324',
      change: `${uniqueHosts.size > 0 ? uniqueHosts.size : '12'} monitored`,
      icon: Shield,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Lateral Movements',
      value: lateralCount.toString(),
      change: `${lateralCount} suspicious`,
      icon: Zap,
      color: lateralCount > 0 ? 'text-orange-500' : 'text-slate-500',
      bgColor: lateralCount > 0 ? 'bg-orange-500/10' : 'bg-slate-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {dynamicMetrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div
            key={index}
            className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{metric.label}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{metric.value}</p>
                <p className="text-muted-foreground text-xs mt-2">{metric.change}</p>
              </div>
              <div className={`${metric.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
