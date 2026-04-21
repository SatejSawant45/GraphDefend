import torch
import pandas as pd
from .pipeline import DataPipeline
from .autoencoder import AnomalyAutoencoder, compute_reconstruction_error

class SentinelBrain:
    """
    The Intelligence Core that merges Layer 2 (Processor) with Layer 3 (PyTorch).
    Evaluates real-time anomaly thresholds without relying on IoCs.
    """
    def __init__(self, input_dim=17, threshold=0.05):
        self.pipeline = DataPipeline()
        self.model = AnomalyAutoencoder(input_dim=input_dim)
        self.threshold = threshold
        
        # For Demo/Production: Load the pre-trained weights here
        try:
            import os
            weights_path = os.path.join(os.path.dirname(__file__), 'weights.pth')
            self.model.load_state_dict(torch.load(weights_path))
        except FileNotFoundError:
            print("Warning: weights.pth not found. Using random initialization.")
        self.model.eval()

    def analyze_flows(self, df: pd.DataFrame):
        """
        Takes the Layer 2 Pandas DataFrame, pre-processes it, and outputs Threat Levels.
        """
        if df.empty:
            return []
            
        # Keep original metadata for the UI (Layer 4)
        metadata_cols = ['flow_id', 'src_ip', 'dst_ip', 'src_port', 'dst_port', 'protocol', 'total_bytes', 'total_packets', 'flow_duration_sec', 'iat_mean', 'syn_count', 'entropy']
        # Safely extract existing columns
        available_cols = [col for col in metadata_cols if col in df.columns]
        metadata = df[available_cols].to_dict(orient='records')
        
        # 1. Pipeline: Scale and Encode
        X_scaled = self.pipeline.preprocess(df, is_training=False)
        
        if X_scaled.size == 0:
            return []
            
        # 2. Convert to PyTorch Tensor
        x_tensor = torch.FloatTensor(X_scaled)
        
        # 3. Model Inference: Get Reconstruction Error
        errors = compute_reconstruction_error(self.model, x_tensor)
        
        results = []
        for i, error in enumerate(errors):
            # Dynamic Scoring Logic
            threat_score = min(error / self.threshold, 1.0)
            
            # Anomaly determination
            if threat_score < 0.4:
                status = "Safe"
                color = "Green"
            elif threat_score < 0.8:
                status = "Warning"
                color = "Yellow"
            else:
                status = "Critical (Anomaly Detected)"
                color = "Red"
                
            results.append({
                "flow_id": metadata[i].get('flow_id', 'unknown'),
                "src_ip": metadata[i].get('src_ip', 'unknown'),
                "dst_ip": metadata[i].get('dst_ip', 'unknown'),
                "src_port": metadata[i].get('src_port', 'unknown'),
                "dst_port": metadata[i].get('dst_port', 'unknown'),
                "protocol": metadata[i].get('protocol', 'unknown'),
                "total_bytes": float(metadata[i].get('total_bytes', 0)),
                "total_packets": int(metadata[i].get('total_packets', 0)),
                "duration": float(metadata[i].get('flow_duration_sec', 0)),
                "iat": float(metadata[i].get('iat_mean', 0)),
                "syn_count": int(metadata[i].get('syn_count', 0)),
                "entropy": float(metadata[i].get('entropy', 0.0)),
                "reconstruction_error": float(error),
                "threat_score": float(threat_score),
                "status": status,
                "color": color
            })
            
        return results
