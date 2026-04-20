from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import pandas as pd
import os

from ml.brain import SentinelBrain
from processor.processor import FlowProcessor
from ml.pipeline import DataPipeline

app = FastAPI(title="GraphDefend ML Microservice")

# Ensure paths correctly point to the ml folder regardless of execution directory
ML_DIR = os.path.join(os.path.dirname(__file__), 'ml')
SCALER_PATH = os.path.join(ML_DIR, 'scaler.pkl')

# Initialize pipeline with explicit scaler path
pipeline = DataPipeline(scaler_path=SCALER_PATH)

# Initialize the ML Brain at startup, inject our path-aware pipeline
print("[*] Loading SentinelBrain...")
brain = SentinelBrain()
brain.pipeline = pipeline  # Override inside brain.py
print("[*] SentinelBrain loaded and ready.")

class AnalyzeRequest(BaseModel):
    packets: List[Dict[str, Any]]

@app.post("/api/v1/analyze")
async def analyze_traffic(request: AnalyzeRequest):
    """
    Receives raw network packets as JSON arrays.
    Returns calculated threat scores for each bidirectional flow.
    """
    if not request.packets:
        return {"results": []}

    # Initialize a temporary processor for this specific batch
    processor = FlowProcessor(time_window_sec=0)
    
    for pkt in request.packets:
        # Generate the flow key
        flow_key = processor.generate_flow_key(pkt)
        processor.active_flows[flow_key].append(pkt)
        
    # Emit flows to a DataFrame instantly (ignoring the time window)
    df_flows = processor.emit_flow_vectors()
    
    if df_flows.empty:
        return {"results": []}
        
    # Pass the DataFrame to SentinelBrain for evaluation
    results = brain.analyze_flows(df_flows)
    
    return {"results": results}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "GraphDefend ML Microservice"}
