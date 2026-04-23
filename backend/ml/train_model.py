import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import os
import argparse
import glob

# Import our custom modules
from pipeline import DataPipeline
from autoencoder import AnomalyAutoencoder

def load_and_map_data(data_dir, max_rows=500000):
    """Loads parquet files from directory and maps CIC-IDS2017 columns to Sentinel pipeline format."""
    parquet_files = glob.glob(os.path.join(data_dir, "*.parquet"))
    if not parquet_files:
        raise FileNotFoundError(f"No parquet files found in {data_dir}")
        
    print(f"[*] Found {len(parquet_files)} parquet files. Analyzing...")
    
    # Prioritize the Benign Monday file for absolute baseline training
    benign_file = next((f for f in parquet_files if 'Benign' in f or 'BENIGN' in f), parquet_files[0])
    print(f"[*] Loading {os.path.basename(benign_file)} for Pure Baseline (Training)...")
    
    try:
        # Engine='fastparquet' or 'pyarrow'
        df = pd.read_parquet(benign_file)
    except Exception as e:
        raise RuntimeError(f"Failed to load {benign_file}: {e}")

    df.columns = df.columns.str.strip()
    
    # Filter for purely BENIGN traffic just to be absolutely certain
    if 'Label' in df.columns:
        df = df[df['Label'].str.upper() == 'BENIGN'].copy()
        
    # Cap size to prevent Out-Of-Memory errors on a standard PC
    if len(df) > max_rows:
        df = df.sample(n=max_rows, random_state=42)
        
    print(f"[*] Processing {len(df)} benign rows into mathematically viable Feature Vectors.")
    
    # --- Feature Mapping: Translating CIC-IDS2017 into Sentinel Pipeline ---
    mapped_df = pd.DataFrame()
    
    # 1. Total Packets
    mapped_df['total_packets'] = df['Total Fwd Packets'] + df['Total Backward Packets']
    
    # 2. Total Bytes
    mapped_df['total_bytes'] = df['Fwd Packets Length Total'] + df['Bwd Packets Length Total']
    
    # 3. Flow Duration (Convert Microseconds to Seconds)
    mapped_df['flow_duration_sec'] = df['Flow Duration'] / 1e6
    
    # 4. Packet Lengths
    mapped_df['pkt_len_mean'] = df['Packet Length Mean']
    mapped_df['pkt_len_max'] = df['Packet Length Max']
    mapped_df['pkt_len_min'] = df['Packet Length Min']
    mapped_df['pkt_len_std'] = df['Packet Length Std']
    
    # 5. Inter-Arrival Times (convert microseconds to seconds)
    mapped_df['iat_mean'] = df['Flow IAT Mean'] / 1e6
    mapped_df['iat_max'] = df['Flow IAT Max'] / 1e6
    
    # 6. TCP Flags
    mapped_df['syn_count'] = df['SYN Flag Count']
    mapped_df['ack_count'] = df['ACK Flag Count']
    mapped_df['psh_count'] = df['PSH Flag Count']
    mapped_df['fin_count'] = df['FIN Flag Count']
    
    # 7. Protocol mapping (6 -> TCP, 17 -> UDP)
    def map_proto(p):
        if p == 6: return 'TCP'
        if p == 17: return 'UDP'
        if p == 1: return 'ICMP'
        return 'OTHER'
    mapped_df['protocol'] = df['Protocol'].apply(map_proto)
    
    # 8. Synthetic IP Proxies (FOR GNN TRAINING when real IPs are missing)
    if 'Init Fwd Win Bytes' in df.columns:
        mapped_df['src_ip'] = df['Init Fwd Win Bytes'].astype(str)
        mapped_df['dst_ip'] = df['Init Bwd Win Bytes'].astype(str)
    else:
        mapped_df['src_ip'] = "192.168.1.1"
        mapped_df['dst_ip'] = "10.0.0.1"
        
    # 9. Additional Metadata for GraphProcessor
    mapped_df['dst_port'] = df['Destination Port'] if 'Destination Port' in df.columns else 0
    # Proxy entropy using Avg Packet Size or something similar if missing
    mapped_df['entropy'] = df['Avg Packet Size'] / 1500.0 if 'Avg Packet Size' in df.columns else 0.0
        
    return mapped_df


def train_model(data_dir, epochs=15, batch_size=256, learning_rate=0.001):
    try:
        df_mapped = load_and_map_data(data_dir)
    except Exception as e:
        print(f"[!] {e}")
        return

    # 3. Preprocess the Data through our custom Pipeline
    print("[*] Running Data Pipeline (Min-Max Scaling, One-Hot Encoding, & Log Transformation)...")
    pipeline = DataPipeline(scaler_path='scaler.pkl')
    
    X_train = pipeline.preprocess(df_mapped, is_training=True)
    
    # Fill any NaNs created by missing data
    X_train = np.nan_to_num(X_train, nan=0.0)
    
    # 4. PyTorch Data Loaders
    tensor_x = torch.FloatTensor(X_train)
    dataset = TensorDataset(tensor_x, tensor_x) 
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    # 5. Initialize Model
    feature_dim = X_train.shape[1] 
    print(f"[*] Initializing Sentinel Autoencoder Brain (Input Dimension: {feature_dim})...")
    
    model = AnomalyAutoencoder(input_dim=feature_dim)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)

    # 6. Training Loop
    print(f"[*] Starting AI Training over {len(df_mapped)} vectors for {epochs} Epochs...")
    model.train()
    
    for epoch in range(epochs):
        total_loss = 0
        for batch_data, _ in loader:
            optimizer.zero_grad()
            reconstruction = model(batch_data)
            loss = criterion(reconstruction, batch_data)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            
        print(f"    -> Epoch [{epoch+1}/{epochs}], Loss: {total_loss/len(loader):.6f}")

    # 7. Save Model
    save_path = "weights.pth"
    torch.save(model.state_dict(), save_path)
    print(f"\n[✓] Training Complete! AI Core weights successfully saved to 'backend/ml/{save_path}'")
    print(f"[✓] Sentinel AI is now calibrated to detect anomalous deviations!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_dir', type=str, default='../data/', help='Directory containing the parquet dataset files')
    args = parser.parse_args()
    
    train_model(args.data_dir)
