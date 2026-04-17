import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import pickle
import os

class DataPipeline:
    def __init__(self, scaler_path="scaler.pkl"):
        self.scaler = MinMaxScaler()
        self.scaler_path = scaler_path
        self.fitted = False
        
        # Categorical choices (Protocol)
        self.known_protocols = ['TCP', 'UDP', 'ICMP', 'OTHER']
        self.numeric_cols = [
            "total_packets", "total_bytes", "flow_duration_sec",
            "pkt_len_mean", "pkt_len_max", "pkt_len_min", "pkt_len_std",
            "iat_mean", "iat_max", "syn_count", "ack_count", "psh_count", "fin_count"
        ]

    def _one_hot_encode(self, df):
        """Manually one-hot encode to ensure consistent column ordering in real-time."""
        encoded = df.copy()
        
        # Give default 'OTHER' if protocol is missing
        if 'protocol' not in encoded.columns:
            encoded['protocol'] = 'OTHER'
            
        for p in self.known_protocols:
            encoded[f'proto_{p}'] = (encoded['protocol'] == p).astype(float)
            
        return encoded.drop(columns=['protocol'])

    def preprocess(self, df, is_training=False):
        """Processes the pandas DataFrame from Layer 2 into a normalized Numpy array."""
        if df.empty:
            return np.array([])
            
        # Log Transformations for highly skewed features (bytes)
        # We use log1p to avoid log(0) issues when bytes=0
        df['total_bytes'] = np.log1p(df['total_bytes'])
        
        # One-hot encode protocols
        df = self._one_hot_encode(df)
        
        # Extract purely the numerical feature columns we want
        feature_cols = self.numeric_cols + [f'proto_{p}' for p in self.known_protocols]
        
        # Filter
        X = df[feature_cols].copy()
        
        # Scaling [0, 1]
        if is_training:
            self.scaler.fit(X)
            self.fitted = True
            self.save_scaler()
        else:
            if not self.fitted:
                self.load_scaler()
                
        # Transform and return exactly the array PyTorch wants
        X_scaled = self.scaler.transform(X)
        return X_scaled

    def save_scaler(self):
        with open(self.scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)

    def load_scaler(self):
        if os.path.exists(self.scaler_path):
            with open(self.scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
            self.fitted = True
