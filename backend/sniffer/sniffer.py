import json
import logging
from scapy.all import sniff, IP, TCP, UDP, conf
import time
from datetime import datetime

# Disable strict scapy warnings to keep our stdout clean
logging.getLogger("scapy.runtime").setLevel(logging.ERROR)

def packet_callback(packet):
    """
    Callback function that processes a captured packet
    and extracts relevant metadata into JSON format.
    """
    packet_data = {}
    
    # Check if packet has an IP layer
    if IP in packet:
        packet_data["timestamp"] = time.time()
        packet_data["time_hr"] = datetime.fromtimestamp(packet_data["timestamp"]).strftime('%Y-%m-%d %H:%M:%S.%f')
        packet_data["src_ip"] = packet[IP].src
        packet_data["dst_ip"] = packet[IP].dst
        packet_data["ip_len"] = packet[IP].len
        packet_data["ttl"] = packet[IP].ttl
        packet_data["proto"] = packet[IP].proto
        
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
            packet_data["payload_len"] = len(packet[IP].payload)
            packet_data["tcp_flags"] = "N/A"

        # Emit the packet data as JSON object on a single line
        # This acts as our Layer 1 stream output going to Layer 2
        print(json.dumps(packet_data))


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
    
    # Sniff strictly IP traffic, without storing packets in memory (store=False)
    # This ensures the script can run forever without eating up RAM.
    sniff(iface=interface, prn=packet_callback, store=False, count=packet_count, filter="ip")


if __name__ == "__main__":
    try:
        # Note: Running packet capture usually requires root/sudo privileges on Linux.
        start_sniffer()
    except KeyboardInterrupt:
        print(json.dumps({"status": "info", "message": "Stopping Sniffer."}))
    except PermissionError:
        print(json.dumps({"status": "error", "message": "Permission Error: You need to run this script as root/sudo to capture packets."}))
