import pandas as pd
import numpy as np
from pathlib import Path

# Configuración de rutas
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

def process_acled(file_path):
    """Limpia y agrega datos de ACLED por día y cuadrante."""
    df = pd.read_csv(file_path)
    df['event_date'] = pd.to_datetime(df['event_date']).dt.date
    df['fatalities'] = pd.to_numeric(df['fatalities'], errors='coerce').fillna(0)
    
    # Redondeo de coordenadas para crear "bins" espaciales
    df['lat_bin'] = df['latitude'].round(1)
    df['lon_bin'] = df['longitude'].round(1)
    
    # Agregación
    acled_daily = df.groupby(['event_date', 'admin1', 'lat_bin', 'lon_bin'], dropna=False).agg(
        fatalities=('fatalities', 'sum'),
        event_count=('event_id_cnty', 'nunique')
    ).reset_index()
    
    return acled_daily

def process_ucdp(file_path):
    """Limpia y agrega datos de UCDP GED por día y cuadrante."""
    df = pd.read_csv(file_path)
    df['date_start'] = pd.to_datetime(df['date_start']).dt.date
    # UCDP usa 'best' como la estimación más probable de muertes
    df['fatalities'] = pd.to_numeric(df['best'], errors='coerce').fillna(0)
    
    df['lat_bin'] = df['latitude'].round(1)
    df['lon_bin'] = df['longitude'].round(1)
    
    ucdp_daily = df.groupby(['date_start', 'lat_bin', 'lon_bin'], dropna=False).agg(
        ucdp_fatalities=('fatalities', 'sum'),
        ucdp_event_count=('id', 'nunique')
    ).reset_index()
    ucdp_daily.rename(columns={'date_start': 'event_date'}, inplace=True)
    
    return ucdp_daily

def merge_acled_gdelt(acled_df, gdelt_df):
    """Une ACLED y GDELT usando la clave (fecha, lat_bin, lon_bin)."""
    acled_df['event_date'] = pd.to_datetime(acled_df['event_date']).dt.date
    gdelt_df['event_date'] = pd.to_datetime(gdelt_df['event_date']).dt.date
    
    # Asegurar que los tipos coincidan para el merge
    acled_df['lat_bin'] = acled_df['lat_bin'].astype(float)
    acled_df['lon_bin'] = acled_df['lon_bin'].astype(float)
    gdelt_df['lat_bin'] = gdelt_df['lat_bin'].astype(float)
    gdelt_df['lon_bin'] = gdelt_df['lon_bin'].astype(float)
    
    merged = acled_df.merge(
        gdelt_df,
        on=['event_date', 'lat_bin', 'lon_bin'],
        how='left'
    )
    
    # Llenar nulos en las métricas de GDELT con 0
    gdelt_cols = [c for c in merged.columns if 'gdelt_' in c or 'avg_' in c or 'events' in c]
    merged[gdelt_cols] = merged[gdelt_cols].fillna(0)
    
    return merged

if __name__ == "__main__":
    print("Módulo de procesamiento cargado. Listo para integrarse en el notebook.")
