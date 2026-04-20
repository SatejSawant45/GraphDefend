import pandas as pd

df = pd.read_parquet('data/Benign-Monday-no-metadata.parquet')
print(df.head())  # Shows the first few rows