import os
import torch
import torch.optim as optim
import pandas as pd
import numpy as np
import sys

# Ensure we can import from parent and sibling directories
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.gnn import GraphAnomalyAE
from ml.pipeline import DataPipeline
from processor.processor import GraphProcessor
from ml.train_model import load_and_map_data

def train_gnn(data_dir, epochs=20, batch_size=1, lr=0.001):
    """
    Trains the GNN Autoencoder on Benign traffic to learn normal network topology.
    """
    print("[*] Phase 3: GNN Training & Calibration starting...")
    
    # 1. Load Benign Data
    try:
        df_benign = load_and_map_data(data_dir, max_rows=100000)
    except Exception as e:
        print(f"[!] Error loading data: {e}")
        return

    # 2. Preprocess numerical features (Standardizing for the GNN)
    # Use the shared scaler.pkl fitted during train_model.py
    pipeline = DataPipeline(scaler_path='scaler.pkl')
    # Load existing scaler bounds
    pipeline.load_scaler()
    
    # If not fitted yet (safety check), fit it
    if not pipeline.fitted:
        print("[*] Fitting scaler as scaler.pkl was not found or fitted...")
        X_scaled_arr = pipeline.preprocess(df_benign, is_training=True)
    else:
        X_scaled_arr = pipeline.preprocess(df_benign, is_training=False)
    
    # Put scaled features back into a temporary dataframe for the GraphProcessor
    feature_cols = pipeline.numeric_cols
    df_scaled = df_benign.copy()
    df_scaled[feature_cols] = X_scaled_arr[:, :len(feature_cols)]

    # 3. Construct the Graph
    print("[*] Constructing Baseline Graph from Benign flows...")
    graph_proc = GraphProcessor()
    graph_data = graph_proc.build_graph(df_scaled)
    
    if not graph_data:
        print("[!] Failed to construct graph.")
        return

    # 4. Initialize GNN Model
    # node_in_dim=6 (from GraphProcessor.build_graph), edge_in_dim=14 (numeric_cols + entropy)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = GraphAnomalyAE(node_in_dim=6, edge_in_dim=14).to(device)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = torch.nn.MSELoss()

    # Convert graph data to tensors
    x = torch.tensor(graph_data['x'], dtype=torch.float).to(device)
    edge_index = torch.tensor(graph_data['edge_index'], dtype=torch.long).to(device)
    edge_attr = torch.tensor(graph_data['edge_attr'], dtype=torch.float).to(device)

    # 5. Training Loop
    print(f"[*] Training GNN on {graph_data['num_nodes']} nodes and {len(graph_data['edge_attr'])} edges...")
    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        
        recon_x, recon_edge = model(x, edge_index, edge_attr)
        
        loss_x = criterion(recon_x, x)
        loss_edge = criterion(recon_edge, edge_attr)
        
        loss = loss_x + loss_edge
        loss.backward()
        optimizer.step()
        
        if (epoch + 1) % 5 == 0:
            print(f"    -> Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.6f} (Nodes: {loss_x.item():.6f}, Edges: {loss_edge.item():.6f})")

    # 6. Save Model
    save_path = os.path.join(os.path.dirname(__file__), "gnn_weights.pth")
    torch.save(model.state_dict(), save_path)
    print(f"[✓] GNN Training Complete. Weights saved to {save_path}")
    
    # Save IP Mapping for future reference (optional but helpful for evaluation)
    import json
    map_path = os.path.join(os.path.dirname(__file__), "gnn_mapping.json")
    with open(map_path, 'w') as f:
        json.dump(graph_data['mapping'], f)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_dir', type=str, default='../data/')
    args = parser.parse_args()
    
    train_gnn(args.data_dir)
