import torch
import pandas as pd
import numpy as np
import os
import re
from collections import deque
from .pipeline import DataPipeline
from .autoencoder import AnomalyAutoencoder, compute_reconstruction_error
from .gnn import GraphAnomalyAE, compute_gnn_reconstruction_error
from processor.processor import GraphProcessor

class SentinelBrain:
    """
    Sentinel Brain - High Sensitivity Calibration.
    """
    def __init__(self, input_dim=17, window_size=1000):
        self.pipeline = DataPipeline()
        self.pipeline.load_scaler() 
        self.graph_proc = GraphProcessor()
        self.flow_history = deque(maxlen=window_size)
        self.seen_ips = set()
        
        # Aggressively lowered baselines based on logs
        # f_err in logs was ~0.06-0.12, so we set baseline to 0.04
        self.baseline = {"flow": 0.04, "struct": 0.15}
        
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

    def is_internal(self, ip):
        if not ip: return False
        ip = str(ip).lower()
        if re.match(r'^(127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)', ip):
            return True
        if ip.startswith('::1') or ip.startswith('fe80') or ip.startswith('fd') or ip.startswith('fc'):
            return True
        return False

    def analyze_flows(self, df: pd.DataFrame):
        if df.empty: return []
        
        if 'total_packets' in df.columns:
            df = df[df['total_packets'] > 0].copy()
        if df.empty: return []

        # 1. Flow Inference
        X_scaled = self.pipeline.preprocess(df, is_training=False)
        if X_scaled.size == 0: return []
        f_errors = compute_reconstruction_error(self.model, torch.FloatTensor(X_scaled))
        
        # 2. Structural Inference
        for flow in df.to_dict(orient='records'): self.flow_history.append(flow)
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
        avg_f = np.mean(f_errors)
        avg_s = np.mean(s_errors)
        print(f"[*] Brain Check: f_err_avg={avg_f:.4f}, s_err_avg={avg_s:.4f}")

        for i, (f_err, s_err) in enumerate(zip(f_errors, s_errors)):
            row = df.iloc[i]
            src_ip, dst_ip = row.get('src_ip', ''), row.get('dst_ip', '')
            src_port = int(row.get('src_port', 0))
            dst_port = int(row.get('dst_port', 0))
            
            # --- AGGRESSIVE SCORING ---
            f_ratio = float(f_err) / max(self.baseline["flow"], 0.001)
            f_score = min(max((f_ratio - 1.0) / 1.0, 0.0), 1.0) 
            
            s_ratio = float(s_err) / max(self.baseline["struct"], 0.001)
            s_score = min(max((s_ratio - 1.0) / 1.0, 0.0), 1.0)
            
            is_internal_pair = self.is_internal(src_ip) and self.is_internal(dst_ip)
            
            # Whitelisted Ports
            well_known_ports = [443, 80, 53, 123, 27017, 3000, 3001, 8000, 5228]
            is_well_known = dst_port in well_known_ports or src_port in well_known_ports
            
            # --- BURST TRIGGER ---
            # If a single flow has a lot of packets, it's inherently suspicious
            if row.get('total_packets', 0) > 50:
                f_score = max(f_score, 0.75)
            
            if not is_internal_pair:
                f_score = min(max((f_ratio - 1.5) / 1.5, 0.0), 1.0)
                if is_well_known:
                    f_score *= 0.1
                    s_score *= 0.1
                threat_score = f_score 
                status_label = "External"
            else:
                if is_well_known:
                    f_score *= 0.3
                    s_score *= 0.3
                threat_score = (f_score * 0.6) + (s_score * 0.4)
                status_label = "Internal"
                
            # Final Status Logic
            if threat_score < 0.25: status, color = "Safe", "Green"
            elif threat_score < 0.65: status, color = "Suspicious", "Yellow"
            else:
                status = f"Critical ({status_label})"
                color = "Red"
                
            results.append({
                "flow_id": row.get('flow_id', 'unknown'),
                "src_ip": src_ip, "dst_ip": dst_ip,
                "src_port": src_port, "dst_port": dst_port,
                "protocol": row.get('protocol', 'OTHER'),
                "total_bytes": int(row.get('total_bytes', 0)),
                "total_packets": int(row.get('total_packets', 0)),
                "duration": float(row.get('flow_duration_sec', 0)),
                "threat_score": float(threat_score),
                "flow_error": float(f_err),
                "structural_error": float(s_err),
                "status": status, "color": color
            })
            
        return results
