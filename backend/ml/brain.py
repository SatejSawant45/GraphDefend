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
        # self.model.load_state_dict(torch.load('weights.pth'))
        self.model.eval()

    def analyze_flows(self, df: pd.DataFrame):
        """
        Takes the Layer 2 Pandas DataFrame, pre-processes it, and outputs Threat Levels.
        """
        if df.empty:
            return []
            
        # Keep original metadata for the UI (Layer 4)
        metadata = df[['flow_id', 'src_ip', 'dst_ip']].to_dict(orient='records')
        
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
                "flow_id": metadata[i]['flow_id'],
                "src_ip": metadata[i]['src_ip'],
                "dst_ip": metadata[i]['dst_ip'],
                "reconstruction_error": float(error),
                "threat_score": float(threat_score),
                "status": status,
                "color": color
            })
            
        return results
