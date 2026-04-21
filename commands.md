# GraphDefend Execution Commands

This document provides the commands required to run each of the 5 major components of the GraphDefend project.

---

## 1. Server (Node.js Gateway)
The central orchestrator that connects the sniffer, ML backend, and frontend.

```bash
cd server
npm install
# Ensure .env is configured with MONGO_URI, JWT_SECRET, and FASTAPI_URL
node index.js
```

---

## 2. Backend (FastAPI ML Microservice)
Handles flow aggregation and anomaly detection using the PyTorch Autoencoder.

### ML Service:
```bash
cd backend
source venv/bin/activate
# Install dependencies if needed:
# pip install fastapi uvicorn torch scikit-learn pandas requests
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Local Sniffer (Optional):
```bash
cd backend
source venv/bin/activate
sudo python3 sniffer/sniffer.py
```

---

## 3. Frontend (Next.js Dashboard)
The interactive visualization interface.

```bash
cd frontend
npm install
npm run dev
```

---

## 4. Endpoint Agent
A standalone packet capture agent that can run on remote machines to stream data to the central server.

```bash
cd endpoint_agent
# Activate a virtual environment and install requirements.txt
sudo python3 sniffer.py
```

---

## 5. Local Demo Script (Attack Simulator)
Used to generate network anomalies for testing the detection engine.

```bash
cd local_demo_script
# Mode: 'tcp' (safe, no root) or 'syn' (aggressive, requires sudo)
python3 simulate_attack.py --mode tcp --threads 20 --duration 10
```

---

## Recommended Launch Order
1. **Server** (Node.js)
2. **Backend** (FastAPI)
3. **Frontend** (Next.js)
4. **Sniffer/Agent** (Packet Capture)
5. **Simulate Attack** (To test the pipeline)
