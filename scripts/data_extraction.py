import os
import requests
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from google.cloud import bigquery
from datetime import datetime

# Cargar variables de entorno
load_dotenv()

# Configuración de rutas
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Configuración de ACLED
ACLED_FIELDS = '|'.join([
    'event_id_cnty', 'event_date', 'year', 'time_precision',
    'disorder_type', 'event_type', 'sub_event_type',
    'actor1', 'actor2', 'interaction', 'civilian_targeting',
    'country', 'admin1', 'admin2', 'admin3', 'location',
    'latitude', 'longitude', 'geo_precision',
    'source', 'source_scale', 'notes', 'fatalities', 'timestamp'
])

def get_acled_token():
    """Obtiene el token OAuth para la API de ACLED."""
    username = os.getenv('ACLED_EMAIL')
    password = os.getenv('ACLED_KEY') # ACLED llama a su password 'key' a veces
    
    if not username or not password:
        raise ValueError("Faltan ACLED_EMAIL o ACLED_KEY en el archivo .env")

    response = requests.post(
        'https://acleddata.com/oauth/token',
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        data={
            'username': username,
            'password': password,
            'grant_type': 'password',
            'client_id': 'acled',
            'scope': 'authenticated',
        },
        timeout=60,
    )
    response.raise_for_status()
    return response.json()['access_token']

def fetch_acled(country, start_date, end_date):
    """Descarga datos de ACLED para un país y rango de fechas."""
    token = get_acled_token()
    params = {
        '_format': 'json',
        'country': country,
        'event_date': f'{start_date}|{end_date}',
        'event_date_where': 'BETWEEN',
        'fields': ACLED_FIELDS,
        'limit': 5000,
    }
    response = requests.get(
        'https://acleddata.com/api/acled/read',
        params=params,
        headers={'Authorization': f'Bearer {token}'},
        timeout=120,
    )
    response.raise_for_status()
    payload = response.json()
    if not payload.get('success', False):
        raise RuntimeError(payload.get('messages', "Error desconocido en ACLED"))
    
    df = pd.DataFrame(payload['data'])
    output_path = RAW_DIR / f"acled_{country.lower().replace(' ', '_')}.csv"
    df.to_csv(output_path, index=False)
    print(f"Datos de ACLED guardados en {output_path}")
    return df

# Configuración de GDELT en BigQuery
GDELT_SQL = '''
SELECT
  PARSE_DATE('%Y%m%d', CAST(SQLDATE AS STRING)) AS event_date,
  ActionGeo_ADM1Code AS gdelt_admin1_code,
  ROUND(ActionGeo_Lat, 1) AS lat_bin,
  ROUND(ActionGeo_Long, 1) AS lon_bin,
  COUNT(*) AS gdelt_event_count,
  SUM(NumMentions) AS gdelt_mentions,
  SUM(NumSources) AS gdelt_sources,
  SUM(NumArticles) AS gdelt_articles,
  AVG(AvgTone) AS avg_tone,
  AVG(GoldsteinScale) AS avg_goldstein,
  SUM(CASE WHEN QuadClass = 4 THEN 1 ELSE 0 END) AS material_conflict_events,
  SUM(CASE WHEN EventRootCode IN ('18', '19', '20') THEN 1 ELSE 0 END) AS high_conflict_events
FROM `gdelt-bq.gdeltv2.events_partitioned`
WHERE _PARTITIONTIME BETWEEN TIMESTAMP(@start_date) AND TIMESTAMP(@end_date)
  AND ActionGeo_CountryCode = @country_code
GROUP BY event_date, gdelt_admin1_code, lat_bin, lon_bin
'''

def fetch_gdelt(country_code, start_date, end_date):
    """Extrae métricas agregadas de GDELT vía BigQuery."""
    project_id = os.getenv('GCP_PROJECT_ID')
    if not project_id:
        raise ValueError("Falta GCP_PROJECT_ID en el archivo .env")

    client = bigquery.Client(project=project_id)
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter('start_date', 'DATE', start_date),
            bigquery.ScalarQueryParameter('end_date', 'DATE', end_date),
            bigquery.ScalarQueryParameter('country_code', 'STRING', country_code),
        ]
    )
    df = client.query(GDELT_SQL, job_config=job_config).to_dataframe()
    output_path = RAW_DIR / f"gdelt_{country_code.lower()}_daily.csv"
    df.to_csv(output_path, index=False)
    print(f"Datos de GDELT guardados en {output_path}")
    return df

def fetch_ucdp(country_id, start_date, end_date):
    """
    Descarga datos de UCDP GED (Georeferenced Event Dataset) para un país.
    Nota: UCDP usa IDs numéricos para países (ej. 630 para Irán, 666 para Israel).
    """
    token = os.getenv('UCDP_TOKEN')
    if not token:
        print("Aviso: Falta UCDP_TOKEN. Saltando extracción de UCDP.")
        return None

    base_url = "https://ucdpapi.pcr.uu.se/api/gedevents/26.1" # Versión candidate para 2026
    params = {
        "Country": country_id,
        "StartDate": start_date,
        "EndDate": end_date,
        "pagesize": 1000
    }
    headers = {"Authorization": f"Bearer {token}"}
    
    all_events = []
    page = 1
    
    while True:
        params["page"] = page
        response = requests.get(base_url, params=params, headers=headers, timeout=120)
        response.raise_for_status()
        data = response.json()
        
        events = data.get("Result", [])
        if not events:
            break
            
        all_events.extend(events)
        print(f"UCDP: Descargada página {page}...")
        
        if page >= data.get("TotalPages", 1):
            break
        page += 1
        
    df = pd.DataFrame(all_events)
    if not df.empty:
        output_path = RAW_DIR / f"ucdp_{country_id}.csv"
        df.to_csv(output_path, index=False)
        print(f"Datos de UCDP guardados en {output_path}")
    return df

if __name__ == "__main__":
    # Ejemplo de ejecución para Irán e Israel
    # Fechas sugeridas para el conflicto reciente
    START = "2024-01-01"
    END = datetime.now().strftime("%Y-%m-%d")
    
    try:
        print("Iniciando extracción de datos...")
        # fetch_acled("Iran", START, END)
        # fetch_acled("Israel", START, END)
        # fetch_gdelt("IR", START, END)
        # fetch_gdelt("IS", START, END)
        # fetch_ucdp(630, START, END) # 630 = Iran
        # fetch_ucdp(666, START, END) # 666 = Israel
        print("Scripts de extracción listos. (Comenta/Descomenta en main para ejecutar)")
    except Exception as e:
        print(f"Error durante la extracción: {e}")
