import torch
import torch.nn as nn
import torch.nn.functional as F
try:
    from torch_geometric.nn import GATConv, global_mean_pool
except ImportError:
    # Fallback or placeholder if torch_geometric is not installed yet
    class GATConv:
        def __init__(self, *args, **kwargs): pass
    def global_mean_pool(*args, **kwargs): pass

class GraphAnomalyAE(nn.Module):
    """
    Graph Attention Autoencoder for Structural Anomaly Detection.
    Learns the normal 'topology' and 'feature distribution' of the network.
    """
    def __init__(self, node_in_dim=6, edge_in_dim=15, hidden_dim=32, latent_dim=16):
        super(GraphAnomalyAE, self).__init__()
        
        # 1. Encoder: Using GAT layers to capture neighborhood context
        # GAT allows the model to learn which neighbors are most relevant
        self.conv1 = GATConv(node_in_dim, hidden_dim, heads=2, edge_dim=edge_in_dim)
        self.conv2 = GATConv(hidden_dim * 2, latent_dim, heads=1, edge_dim=edge_in_dim)
        
        # 2. Decoder: Reconstruct Node Features
        self.node_decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, node_in_dim),
            nn.Sigmoid()
        )
        
        # 3. Decoder: Reconstruct Edge Features (via dot product or MLP on pair of nodes)
        self.edge_decoder = nn.Sequential(
            nn.Linear(latent_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, edge_in_dim),
            nn.Sigmoid()
        )

    def encode(self, x, edge_index, edge_attr):
        """
        x: Node features [num_nodes, node_in_dim]
        edge_index: Graph connectivity [2, num_edges]
        edge_attr: Edge features [num_edges, edge_in_dim]
        """
        # First GAT layer
        x = self.conv1(x, edge_index, edge_attr)
        x = F.elu(x)
        
        # Second GAT layer
        x = self.conv2(x, edge_index, edge_attr)
        return x

    def decode_nodes(self, z):
        return self.node_decoder(z)

    def decode_edges(self, z, edge_index):
        """
        Reconstructs edge attributes based on the latent representation of connected nodes.
        """
        src, dst = edge_index
        # Concatenate latent vectors of nodes forming an edge
        edge_repr = torch.cat([z[src], z[dst]], dim=-1)
        return self.edge_decoder(edge_repr)

    def forward(self, x, edge_index, edge_attr):
        z = self.encode(x, edge_index, edge_attr)
        
        recon_x = self.decode_nodes(z)
        recon_edge = self.decode_edges(z, edge_index)
        
        return recon_x, recon_edge

def compute_gnn_reconstruction_error(model, data):
    """
    Calculates the combined reconstruction error for the graph.
    'data' should be a PyTorch Geometric Data object or compatible dict.
    """
    model.eval()
    with torch.no_grad():
        x = torch.tensor(data['x'], dtype=torch.float)
        edge_index = torch.tensor(data['edge_index'], dtype=torch.long)
        edge_attr = torch.tensor(data['edge_attr'], dtype=torch.float)
        
        recon_x, recon_edge = model(x, edge_index, edge_attr)
        
        # Node Reconstruction Error (MSE per node)
        node_error = torch.mean((x - recon_x) ** 2, dim=1)
        
        # Edge Reconstruction Error (MSE per edge)
        # Structural anomalies will show high error here if the connection is 'unusual'
        edge_error = torch.mean((edge_attr - recon_edge) ** 2, dim=1)
        
    return node_error.numpy(), edge_error.numpy()
