# GraphDefend

GraphDefend is a comprehensive system designed to monitor, analyze, and defend network infrastructures using advanced machine learning techniques and a user-friendly frontend interface. The project is divided into two main components: the backend and the frontend.

## Features

### Backend
- **Machine Learning Models**: Includes an autoencoder and other tools for anomaly detection and attack evaluation.
- **Data Processing**: Handles data ingestion and preprocessing for analysis.
- **Sniffer Module**: Captures and processes network traffic.

### Frontend
- **Interactive Visualizations**: Provides components like AnomalyLog, FeatureRadar, GNNMap, and NetworkHeartbeat for real-time monitoring.
- **Modern Web Interface**: Built with Next.js for a seamless user experience.

## Project Structure

```
GraphDefend/
├── backend/
│   ├── data/                # Data files and resources
│   ├── ml/                  # Machine learning models and utilities
│   │   ├── autoencoder.py   # Autoencoder implementation
│   │   ├── brain.py         # Core ML logic
│   │   ├── evaluate_attack.py # Attack evaluation scripts
│   │   ├── pipeline.py      # Data pipeline for ML
│   │   ├── train_model.py   # Model training scripts
│   │   └── weights.pth      # Pre-trained model weights
│   ├── processor/           # Data processing utilities
│   │   └── processor.py     # Processor logic
│   └── sniffer/             # Network sniffer module
│       └── sniffer.py       # Sniffer implementation
├── frontend/
│   ├── src/                 # Source code for the frontend
│   │   ├── app/             # Next.js app structure
│   │   │   ├── globals.css  # Global styles
│   │   │   ├── layout.tsx   # Layout configuration
│   │   │   └── page.tsx     # Main page
│   │   ├── components/      # React components
│   │       ├── AnomalyLog.tsx
│   │       ├── FeatureRadar.tsx
│   │       ├── GNNMap.tsx
│   │       └── NetworkHeartbeat.tsx
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies
│   ├── tsconfig.json        # TypeScript configuration
│   └── README.md            # Frontend-specific documentation
└── cols.txt                 # Column definitions or metadata
```

## Installation

### Prerequisites
- Node.js and npm (for the frontend)
- Python 3.8+ (for the backend)
- Virtual environment tools (e.g., `venv` or `conda`)

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Start the backend services by running the appropriate scripts in the `backend` directory.
2. Launch the frontend interface to interact with the system.
3. Monitor network activity and analyze anomalies using the provided visualizations.
