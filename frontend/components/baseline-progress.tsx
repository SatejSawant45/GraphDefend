'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

export default function BaselineProgress() {
  const [progress, setProgress] = useState(82);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 0.5, 100));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Behavioral Baseline
        </h3>
        <p className="text-sm text-muted-foreground">Autoencoder training</p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Learning Progress</span>
            <span className="text-sm font-bold text-blue-500">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-black/30 rounded-full h-3 border border-border/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Trained on 142K samples
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-black/20 rounded p-3 border border-border/30">
            <p className="text-muted-foreground text-xs mb-1">Reconstruction Error</p>
            <p className="text-lg font-semibold text-foreground">0.024</p>
          </div>
          <div className="bg-black/20 rounded p-3 border border-border/30">
            <p className="text-muted-foreground text-xs mb-1">Threshold</p>
            <p className="text-lg font-semibold text-foreground">0.085</p>
          </div>
        </div>

        <div className="pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground mb-3">Status Indicators</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-muted-foreground">Model converging</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="text-xs text-muted-foreground">Fine-tuning weights</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
              <span className="text-xs text-muted-foreground">Anomaly detection active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
