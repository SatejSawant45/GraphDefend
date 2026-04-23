import os
import pandas as pd
import numpy as np
import torch
import sys

# Ensure we can import from parent and sibling directories
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.brain import SentinelBrain

def simulate_test_scenarios():
    print("[*] Initializing Sentinel Ensemble Brain for Final Validation...")
    brain = SentinelBrain()
    
    # --- STEP 0: WARM UP ---
    print("[*] Priming structural sliding window with 50 baseline flows...")
    warmup_data = []
    for i in range(50):
        warmup_data.append({
            "flow_id": f"warmup_{i}", "src_ip": f"192.168.1.{10 + (i % 5)}", "dst_ip": "8.8.8.8",
            "src_port": 50000 + i, "dst_port": 443, "protocol_name": "TCP", "protocol": "TCP",
            "total_packets": 10, "total_bytes": 2000, "flow_duration_sec": 1.0,
            "pkt_len_mean": 200, "pkt_len_max": 500, "pkt_len_min": 60, "pkt_len_std": 100,
            "iat_mean": 0.1, "iat_max": 0.2, "entropy": 3.0,
            "syn_count": 1, "ack_count": 9, "psh_count": 2, "fin_count": 0
        })
    brain.analyze_flows(pd.DataFrame(warmup_data))

    # 1. Scenario: Normal Baseline Traffic (Using a Warmup IP)
    normal_data = pd.DataFrame([{
        "flow_id": "normal_test", "src_ip": "192.168.1.10", "dst_ip": "8.8.8.8",
        "src_port": 54321, "dst_port": 443, "protocol_name": "TCP", "protocol": "TCP",
        "total_packets": 12, "total_bytes": 2500, "flow_duration_sec": 1.1,
        "pkt_len_mean": 210, "pkt_len_max": 510, "pkt_len_min": 60, "pkt_len_std": 110,
        "iat_mean": 0.1, "iat_max": 0.2, "entropy": 3.1,
        "syn_count": 1, "ack_count": 11, "psh_count": 3, "fin_count": 0
    }])

    # 2. Scenario: VOLUME ANOMALY (Extreme Packet Rate)
    # Using 1M packets and 0.000001 IAT to force a Flow error spike
    volume_anomaly = pd.DataFrame([{
        "flow_id": "volume_spike", "src_ip": "192.168.1.11", "dst_ip": "8.8.8.8",
        "src_port": 54322, "dst_port": 443, "protocol_name": "TCP", "protocol": "TCP",
        "total_packets": 1000000, "total_bytes": 500000000, "flow_duration_sec": 2.0,
        "pkt_len_mean": 1490, "pkt_len_max": 1500, "pkt_len_min": 1400, "pkt_len_std": 1,
        "iat_mean": 0.0000001, "iat_max": 0.000001, "entropy": 0.01,
        "syn_count": 1, "ack_count": 999999, "psh_count": 500000, "fin_count": 0
    }])

    # 3. Scenario: STRUCTURAL ANOMALY (Lateral Movement)
    # Using a completely "alien" IP and sensitive internal port (445)
    lateral_movement = pd.DataFrame([{
        "flow_id": "lateral_jump", "src_ip": "10.255.255.255", "dst_ip": "172.16.0.1",
        "src_port": 666, "dst_port": 445, "protocol_name": "TCP", "protocol": "TCP",
        "total_packets": 15, "total_bytes": 3000, "flow_duration_sec": 1.5,
        "pkt_len_mean": 200, "pkt_len_max": 500, "pkt_len_min": 60, "pkt_len_std": 100,
        "iat_mean": 0.1, "iat_max": 0.2, "entropy": 3.0,
        "syn_count": 1, "ack_count": 14, "psh_count": 4, "fin_count": 0
    }])

    scenarios = [
        ("NORMAL BASELINE", normal_data),
        ("VOLUME ANOMALY (Exfiltration)", volume_anomaly),
        ("STRUCTURAL ANOMALY (Lateral Movement)", lateral_movement)
    ]

    print("\n" + "="*80)
    print(f"{'SCENARIO':<40} | {'FLOW ERR':<10} | {'STRUCT ERR':<10} | {'THREAT %':<8} | {'STATUS'}")
    print("-" * 80)

    for name, df in scenarios:
        results = brain.analyze_flows(df)
        if results:
            res = results[0]
            print(f"{name:<40} | {res['flow_error']:<10.4f} | {res['structural_error']:<10.4f} | {res['threat_score']*100:<8.1f}% | {res['status']}")

    print("="*80 + "\n")
    print("[✓] Ensemble Validation Complete.")

if __name__ == "__main__":
    simulate_test_scenarios()
