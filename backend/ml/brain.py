import torch
import pandas as pd
import numpy as np
import os
from collections import deque
from .pipeline import DataPipeline
from .autoencoder import AnomalyAutoencoder, compute_reconstruction_error
from .gnn import GraphAnomalyAE, compute_gnn_reconstruction_error
from processor.processor import GraphProcessor

class SentinelBrain:
    """
    Stabilized Sentinel Brain for Production Dashboards.
    Uses Ratio-based detection and Structural Delta Boosts.
    """
    def __init__(self, input_dim=17, window_size=500):
        self.pipeline = DataPipeline()
        self.pipeline.load_scaler() 
        self.graph_proc = GraphProcessor()
        self.flow_history = deque(maxlen=window_size)
        self.seen_ips = set()
        
        # Calibration Baselines (Realistic floors for CID-IDS2017)
        self.baseline = {
            "flow": 0.20,
            "struct": 0.50
        }
        self.alpha = 0.05 
        
        self.model = AnomalyAutoencoder(input_dim=input_dim)
        self.gnn_model = GraphAnomalyAE(node_in_dim=6, edge_in_dim=14)
        
        self._load_weights()
        self.model.eval()
        self.gnn_model.eval()

    def _load_weights(self):
        ml_dir = os.path.dirname(__file__)
        ae_weights = os.path.join(ml_dir, 'weights.pth')
        gnn_weights = os.path.join(ml_dir, 'gnn_weights.pth')
        try:
            if os.path.exists(ae_weights):
                self.model.load_state_dict(torch.load(ae_weights, map_location=torch.device('cpu')))
            if os.path.exists(gnn_weights):
                self.gnn_model.load_state_dict(torch.load(gnn_weights, map_location=torch.device('cpu')))
        except Exception: pass

    def analyze_flows(self, df: pd.DataFrame):
        if df.empty: return []
            
        # 1. Flow Inference
        X_scaled = self.pipeline.preprocess(df, is_training=False)
        if X_scaled.size == 0: return []
        f_errors = compute_reconstruction_error(self.model, torch.FloatTensor(X_scaled))
        
        # 2. Structural Inference
        # Update history
        for flow in df.to_dict(orient='records'): self.flow_history.append(flow)
        
        # Build context graph
        df_context = pd.DataFrame(list(self.flow_history))
        X_hist = self.pipeline.preprocess(df_context, is_training=False)
        df_gnn = df_context.copy()
        df_gnn[self.pipeline.numeric_cols] = X_hist[:, :len(self.pipeline.numeric_cols)]
        
        graph_data = self.graph_proc.build_graph(df_gnn)
        s_errors = np.zeros(len(df))
        if graph_data:
            _, edge_err = compute_gnn_reconstruction_error(self.gnn_model, graph_data)
            s_errors = edge_err[-len(df):]
            
        results = []
        for i, (f_err, s_err) in enumerate(zip(f_errors, s_errors)):
            # STABILIZED RATIO SCORING
            # If current error is 2.5x the baseline, it's 100% anomaly
            f_ratio = float(f_err) / max(self.baseline["flow"], 0.01)
            f_score = min(max((f_ratio - 1.1) / 1.5, 0.0), 1.0)
            
            s_ratio = float(s_err) / max(self.baseline["struct"], 0.01)
            s_score = min(max((s_ratio - 1.1) / 1.5, 0.0), 1.0)
            
            # --- NEW IP ALERT ---
            dst_ip = df.iloc[i].get('dst_ip', '')
            if dst_ip not in self.seen_ips and len(self.seen_ips) > 0:
                s_score = max(s_score, 0.8) # Instant high structural anomaly
            self.seen_ips.add(dst_ip)
            self.seen_ips.add(df.iloc[i].get('src_ip', ''))

            # Ensemble
            threat_score = (f_score * 0.4) + (s_score * 0.6)
            
            # Calibration: Only adapt if traffic is safe
            if threat_score < 0.2:
                self.baseline["flow"] = (1-self.alpha) * self.baseline["flow"] + self.alpha * float(f_err)
                self.baseline["struct"] = (1-self.alpha) * self.baseline["struct"] + self.alpha * float(s_err)

            # Labels
            if threat_score < 0.35: status, color = "Safe", "Green"
            elif threat_score < 0.75: status, color = "Suspicious", "Yellow"
            else:
                status = "Critical (Lateral Movement)" if s_score > 0.6 else "Critical (Volume Spike)"
                color = "Red"
                
            results.append({
                "flow_id": df.iloc[i].get('flow_id', 'unknown'),
                "src_ip": df.iloc[i].get('src_ip', 'unknown'),
                "dst_ip": df.iloc[i].get('dst_ip', 'unknown'),
                "threat_score": float(threat_score),
                "flow_error": float(f_err),
                "structural_error": float(s_err),
                "status": status,
                "color": color
            })
            
        return results
