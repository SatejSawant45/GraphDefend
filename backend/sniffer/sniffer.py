import json
import logging
from scapy.all import sniff, IP, IPv6, TCP, UDP, conf
import time
from datetime import datetime
import threading
import requests

# Set the Node.js ingestion URL (Update this if your Node.js server runs on a different IP/Port)
NODE_INGEST_URL = "http://127.0.0.1:3001/api/ingest"

# A buffer to hold packets before sending them to the Node.js server
packet_buffer = []
# Create a lock to prevent race conditions during buffer operations
buffer_lock = threading.Lock()

# Disable strict scapy warnings to keep our stdout clean
logging.getLogger("scapy.runtime").setLevel(logging.ERROR)

def send_packets_to_server():
    """
    Background worker function that runs periodically to send accumulated raw packets 
    to the Node.js gateway.
    """
    global packet_buffer
    
    while True:
        time.sleep(2) # Send batches every 2 seconds
        
        with buffer_lock:
            if not packet_buffer:
                continue
            
            # Extract packets and reset buffer
            batch = packet_buffer[:]
            packet_buffer.clear()
            
        try:
            # Send batch of real packets to Node.js backend
            requests.post(NODE_INGEST_URL, json={"packets": batch}, timeout=2)
            print(f"[*] Sniffer push: Successfully sent {len(batch)} real packets to Node.js Gateway.", flush=True)
        except Exception as e:
            # If sending fails, we just drop the batch so we don't blow up RAM.
            print(f"[-] Sniffer push failed: {e}", flush=True)

def packet_callback(packet):
    """
    Callback function that processes a captured packet
    and extracts relevant metadata into JSON format.
    """
    packet_data = {}
    
    # Check if packet has an IP or IPv6 layer
    if IP in packet or IPv6 in packet:
        is_ipv6 = IPv6 in packet
        layer = packet[IPv6] if is_ipv6 else packet[IP]

        packet_data["timestamp"] = time.time()
        packet_data["time_hr"] = datetime.fromtimestamp(packet_data["timestamp"]).strftime('%Y-%m-%d %H:%M:%S.%f')
        packet_data["src_ip"] = layer.src
        packet_data["dst_ip"] = layer.dst
        
        # IP vs IPv6 attribute naming differences in Scapy
        if is_ipv6:
            packet_data["ip_len"] = layer.plen # Payload length for IPv6
            packet_data["ttl"] = layer.hlim    # Hop limit for IPv6
            packet_data["proto"] = layer.nh    # Next header for IPv6
        else:
            packet_data["ip_len"] = layer.len
            packet_data["ttl"] = layer.ttl
            packet_data["proto"] = layer.proto
        
        # Check for TCP layer
        if TCP in packet:
            packet_data["protocol_name"] = "TCP"
            packet_data["src_port"] = packet[TCP].sport
            packet_data["dst_port"] = packet[TCP].dport
            packet_data["payload_len"] = len(packet[TCP].payload)
            # TCP Flags (F, S, R, P, A, U, E, C)
            packet_data["tcp_flags"] = str(packet[TCP].flags)
        
        # Check for UDP layer
        elif UDP in packet:
            packet_data["protocol_name"] = "UDP"
            packet_data["src_port"] = packet[UDP].sport
            packet_data["dst_port"] = packet[UDP].dport
            packet_data["payload_len"] = len(packet[UDP].payload)
            packet_data["tcp_flags"] = "N/A"
            
        else:
            packet_data["protocol_name"] = "OTHER"
            packet_data["src_port"] = 0
            packet_data["dst_port"] = 0
            packet_data["payload_len"] = len(layer.payload)
            packet_data["tcp_flags"] = "N/A"

        # Add the packet to the global buffer
        with buffer_lock:
            packet_buffer.append(packet_data)

def start_sniffer(interface=None, packet_count=0):
    """
    Starts the Scapy sniffer on the given interface.
    packet_count=0 means sniff continuously indefinitely.
    """
    if interface is None:
        # Default interface based on scapy config
        interface = conf.iface
        
    print(json.dumps({
        "status": "info", 
        "message": f"Starting SIH1451 Packet Sniffer on interface: {interface}"
    }), flush=True)
    
    # Launch background thread to upload packets continuously
    sender_thread = threading.Thread(target=send_packets_to_server, daemon=True)
    sender_thread.start()
    
    # Sniff both IP and IPv6 traffic, without storing packets in memory
    # This ensures the script can run forever without eating up RAM.
    sniff(iface=interface, prn=packet_callback, store=False, count=packet_count, filter="ip or ip6")


if __name__ == "__main__":
    try:
        # Note: Running packet capture usually requires root/sudo privileges on Linux.
        start_sniffer()
    except KeyboardInterrupt:
        print(json.dumps({"status": "info", "message": "Stopping Sniffer."}))
    except PermissionError:
        print(json.dumps({"status": "error", "message": "Permission Error: You need to run this script as root/sudo to capture packets."}))
