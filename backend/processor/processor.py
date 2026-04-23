import json
import pandas as pd
import time
import numpy as np
from collections import defaultdict

class FlowProcessor:
    def __init__(self, time_window_sec=5.0):
        # Dictionary to store active flows. Key: 5-tuple, Value: list of packets
        self.active_flows = defaultdict(list)
        # Time window before emitting a flow array to the AI Model
        self.time_window_sec = time_window_sec
        self.last_emit_time = time.time()

    def generate_flow_key(self, packet):
        """Creates a unique bidirectional 5-tuple flow key."""
        # Sorting IP and Port ensures bidirectional traffic is treated as one unified flow
        ips = sorted([packet.get('src_ip', ''), packet.get('dst_ip', '')])
        ports = sorted([packet.get('src_port', 0), packet.get('dst_port', 0)])
        proto = packet.get('protocol_name', 'OTHER')
        return f"{ips[0]}_{ips[1]}_{ports[0]}_{ports[1]}_{proto}"

    def process_packet(self, packet_json):
        """
        Ingests a raw JSON packet string from Layer 1.
        Returns a Pandas DataFrame of Flow Feature Vectors if the time window is reached, else None.
        """
        try:
            if isinstance(packet_json, str):
                packet = json.loads(packet_json)
            else:
                packet = packet_json
        except json.JSONDecodeError:
            return None

        # Ignore info/error messages
        if "status" in packet:
            return None

        flow_key = self.generate_flow_key(packet)
        self.active_flows[flow_key].append(packet)

        # Check if we should emit flows
        current_time = time.time()
        if current_time - self.last_emit_time >= self.time_window_sec:
            vectors_df = self.emit_flow_vectors()
            self.last_emit_time = current_time
            return vectors_df
        
        return None

    def emit_flow_vectors(self):
        """Calculates mathematical features for all active flows and returns them as a DataFrame."""
        flow_vectors = []
        
        for flow_key, packets in self.active_flows.items():
            if not packets:
                continue
                
            df = pd.DataFrame(packets)
            
            # Sort chronologically
            df = df.sort_values(by="timestamp")
            
            # Core Feature extraction
            total_packets = len(df)
            total_bytes = df['payload_len'].sum()
            
            # Duration in seconds
            flow_duration = df['timestamp'].max() - df['timestamp'].min()
            
            # Packet size statistics
            pkt_len_mean = df['payload_len'].mean()
            pkt_len_max = df['payload_len'].max()
            pkt_len_min = df['payload_len'].min()
            pkt_len_std = df['payload_len'].std() if total_packets > 1 else 0.0
            
            # Inter-Arrival Time (IAT) calculation
            df['iat'] = df['timestamp'].diff()
            iat_mean = df['iat'].mean() if total_packets > 1 else 0.0
            iat_max = df['iat'].max() if total_packets > 1 else 0.0
            
            # Simple Shannon Entropy over payload lengths as a proxy for feature entropy
            try:
                val_counts = df['payload_len'].value_counts(normalize=True)
                entropy = -(val_counts * np.log2(val_counts)).sum()
            except Exception:
                entropy = 0.0
            
            # TCP Flags Count (Parsing from string representation)
            syn_count = df['tcp_flags'].apply(lambda x: "S" in str(x)).sum()
            ack_count = df['tcp_flags'].apply(lambda x: "A" in str(x)).sum()
            psh_count = df['tcp_flags'].apply(lambda x: "P" in str(x)).sum()
            fin_count = df['tcp_flags'].apply(lambda x: "F" in str(x)).sum()
            
            # Creating the Math Vector
            feature_vector = {
                "flow_id": flow_key,
                "src_ip": packets[0].get('src_ip'),
                "dst_ip": packets[0].get('dst_ip'),
                "src_port": packets[0].get('src_port'),
                "dst_port": packets[0].get('dst_port'),
                "protocol": packets[0].get('protocol_name'),
                # The Numerical Features that go to the ML Model:
                "total_packets": total_packets,
                "total_bytes": int(total_bytes),
                "flow_duration_sec": float(flow_duration),
                "pkt_len_mean": float(pkt_len_mean),
                "pkt_len_max": int(pkt_len_max),
                "pkt_len_min": int(pkt_len_min),
                "pkt_len_std": float(pkt_len_std),
                "iat_mean": float(iat_mean) if pd.notna(iat_mean) else 0.0,
                "iat_max": float(iat_max) if pd.notna(iat_max) else 0.0,
                "entropy": float(entropy),
                "syn_count": int(syn_count),
                "ack_count": int(ack_count),
                "psh_count": int(psh_count),
                "fin_count": int(fin_count)
            }
            
            flow_vectors.append(feature_vector)
            
        # Clear aggregated flows after emitting so we start fresh for the next window
        self.active_flows.clear()
        
        # Return a pandas DataFrame ready for Layer 3 (PyTorch / Scikit-Learn)
        return pd.DataFrame(flow_vectors)

class GraphProcessor:
    """
    Translates individual flow vectors into a structured Graph (Nodes and Edges).
    Prepares data for PyTorch Geometric GNN models.
    """
    def __init__(self):
        self.reset()

    def reset(self):
        self.nodes = {} # IP -> Feature Vector
        self.edges = [] # List of (src_idx, dst_idx, edge_attr)
        self.ip_to_idx = {} # IP -> Integer Index

    def build_graph(self, df_flows: pd.DataFrame):
        """
        Constructs graph components from a batch of flow vectors.
        """
        self.reset()
        if df_flows.empty:
            return None

        # 1. Identify all unique IPs (Nodes)
        all_ips = pd.concat([df_flows['src_ip'], df_flows['dst_ip']]).unique()
        for idx, ip in enumerate(all_ips):
            self.ip_to_idx[ip] = idx

        # 2. Extract Edge Features (The 17-dim vectors we already have)
        # We assume the incoming df_flows has already been processed by the pipeline or contains the raw numeric cols
        # For simplicity in Phase 1, we use the numeric columns directly.
        edge_cols = [
            "total_packets", "total_bytes", "flow_duration_sec",
            "pkt_len_mean", "pkt_len_max", "pkt_len_min", "pkt_len_std",
            "iat_mean", "iat_max", "syn_count", "ack_count", "psh_count", "fin_count",
            "entropy"
        ]
        
        for _, row in df_flows.iterrows():
            src_idx = self.ip_to_idx[row['src_ip']]
            dst_idx = self.ip_to_idx[row['dst_ip']]
            
            # Edge attributes: numerical features of this specific connection
            edge_attr = [float(row[col]) for col in edge_cols if col in row]
            self.edges.append((src_idx, dst_idx, edge_attr))

        # 3. Build Node Features (Aggregated per IP)
        node_features = []
        for ip in all_ips:
            # Stats for this specific IP as a Source
            src_flows = df_flows[df_flows['src_ip'] == ip]
            # Stats for this specific IP as a Target
            dst_flows = df_flows[df_flows['dst_ip'] == ip]
            
            degree_out = len(src_flows)
            degree_in = len(dst_flows)
            total_sent = src_flows['total_bytes'].sum() if not src_flows.empty else 0
            total_recv = dst_flows['total_bytes'].sum() if not dst_flows.empty else 0
            
            # Unique peers (Structural feature)
            unique_peers = len(set(src_flows['dst_ip'].tolist() + dst_flows['src_ip'].tolist()))
            
            # Diversity of destination ports (Lateral movement indicator)
            unique_ports = len(src_flows['dst_port'].unique()) if not src_flows.empty else 0
            
            # Node feature vector - LOG SCALED to keep values in [0, ~15] range
            feat = [
                float(np.log1p(degree_out)),
                float(np.log1p(degree_in)),
                float(np.log1p(total_sent) / 10.0), # Squashing further
                float(np.log1p(total_recv) / 10.0),
                float(np.log1p(unique_peers)),
                float(np.log1p(unique_ports))
            ]
            node_features.append(feat)

        return {
            "num_nodes": len(all_ips),
            "edge_index": [[e[0] for e in self.edges], [e[1] for e in self.edges]],
            "edge_attr": [e[2] for e in self.edges],
            "x": node_features,
            "mapping": self.ip_to_idx
        }

if __name__ == "__main__":
    # Quick Test / Demonstration
    processor = FlowProcessor(time_window_sec=2.0)
    print("[*] Layer 2: Feature Engineering Processor initialized.")

if __name__ == "__main__":
    # Quick Test / Demonstration
    processor = FlowProcessor(time_window_sec=2.0)
    print("[*] Layer 2: Feature Engineering Processor initialized.")
    print("This module groups loose packets into bidirectional Mathematical Vectors using Pandas.")
