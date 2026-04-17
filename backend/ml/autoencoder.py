import torch
import torch.nn as nn
import numpy as np

class AnomalyAutoencoder(nn.Module):
    def __init__(self, input_dim):
        super(AnomalyAutoencoder, self).__init__()
        
        # Encoder (Compresses the 5-Tuple Network Flow into a bottleneck)
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 4) # The Bottleneck
        )
        
        # Decoder (Attempts to reconstruct the Flow back to original dimension)
        self.decoder = nn.Sequential(
            nn.Linear(4, 8),
            nn.ReLU(),
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, input_dim),
            nn.Sigmoid() # Output is bounded [0, 1] matching our Min-Max Scaler
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded
        
def compute_reconstruction_error(model, x_tensor):
    """Calculates the Mean Squared Error between the original input and the model's reconstruction."""
    model.eval()
    with torch.no_grad():
        reconstruction = model(x_tensor)
        # Calculate Mean Squared Error (MSE) per flow feature vector
        mse = torch.mean((x_tensor - reconstruction) ** 2, dim=1)
    return mse.numpy()
