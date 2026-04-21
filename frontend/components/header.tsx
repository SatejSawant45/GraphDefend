import { Shield, Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  timeRange: string;
  setTimeRange: (range: string) => void;
  autoRefresh: boolean;
  setAutoRefresh: (value: boolean) => void;
  isUnderAttack: boolean;
  onSimulateAttack: () => void;
}

export default function Header({ timeRange, setTimeRange, autoRefresh, setAutoRefresh, isUnderAttack, onSimulateAttack }: HeaderProps) {
  const timeRanges = ['1h', '6h', '24h', '7d'];

  return (
    <header className={`border-b transition-colors ${isUnderAttack ? 'border-red-500/30 bg-red-950/10' : 'border-border bg-card/50'} backdrop-blur-sm`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isUnderAttack ? 'bg-red-500/20' : 'bg-primary'}`}>
            <Shield className={`w-6 h-6 ${isUnderAttack ? 'text-red-500' : 'text-primary-foreground'}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">SENTINEL AI</h1>
            <p className="text-sm text-muted-foreground">SHJ451: Zero-Trust Network Compromise Detection</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-card rounded-lg p-1">
            {timeRanges.map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
              >
                {range}
              </Button>
            ))}
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-primary/20 text-primary border border-primary/50'
                : 'bg-card border border-border text-muted-foreground'
            }`}
          >
            {autoRefresh ? '🔄 Auto' : '⏸ Paused'}
          </button>

          <Button
            onClick={onSimulateAttack}
            className={`gap-2 transition-all ${
              isUnderAttack
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50'
            }`}
          >
            <Zap className="w-4 h-4" />
            {isUnderAttack ? 'SIMULATING ATTACK' : 'SIMULATE ATTACK'}
          </Button>

          <Button variant="ghost" size="icon" className="w-10 h-10">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
