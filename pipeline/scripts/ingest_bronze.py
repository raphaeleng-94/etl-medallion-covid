"""
Bronze Layer Ingestion Script
Fetches COVID-19 data from Our World in Data and loads into bronze.covid_raw
"""
import os
import sys
import uuid
import json
import requests
import pandas as pd
import psycopg2
from datetime import datetime
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

# Configuration
DB_HOST = os.getenv("DB_HOST", "db.ftbtqqwahzpzwqizigcd.supabase.co")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

COVID_DATA_URL = os.getenv(
    "COVID_DATA_URL",
    "https://covid.ourworldindata.org/data/owid-covid-data.csv"
)

BRONZE_COLUMNS = [
    "date", "location", "iso_code", "continent",
    "total_cases", "new_cases", "total_deaths", "new_deaths",
    "total_vaccinations", "people_vaccinated", "people_fully_vaccinated",
    "population", "gdp_per_capita", "human_development_index",
    "hospital_beds_per_thousand", "life_expectancy"
]


def get_db_connection():
    """Create database connection."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        sslmode="require"
    )


def fetch_covid_data(url: str) -> pd.DataFrame:
    """Download COVID data from Our World in Data."""
    logger.info(f"Fetching data from: {url}")
    
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    
    from io import StringIO
    df = pd.read_csv(StringIO(response.text))
    logger.info(f"Downloaded {len(df):,} rows, {len(df.columns)} columns")
    return df


def clean_for_bronze(df: pd.DataFrame) -> pd.DataFrame:
    """Minimal cleaning for bronze layer - keep raw values as strings."""
    cols_available = [c for c in BRONZE_COLUMNS if c in df.columns]
    df_bronze = df[cols_available].copy()
    
    # Rename location to country for consistency
    if "location" in df_bronze.columns:
        df_bronze = df_bronze.rename(columns={"location": "country"})
    
    # Convert to string to preserve raw data fidelity
    for col in df_bronze.columns:
        df_bronze[col] = df_bronze[col].astype(str)
        df_bronze[col] = df_bronze[col].replace("nan", None)
    
    return df_bronze


def load_bronze(df: pd.DataFrame, batch_id: str, source_url: str) -> int:
    """Load data into bronze.covid_raw table."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    insert_sql = """
        INSERT INTO bronze.covid_raw (
            date, country, iso_code, continent,
            total_cases, new_cases, total_deaths, new_deaths,
            total_vaccinations, people_vaccinated, people_fully_vaccinated,
            population, gdp_per_capita, human_development_index,
            hospital_beds_per_thousand, life_expectancy,
            raw_json, source_url, batch_id, ingested_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, NOW()
        )
        ON CONFLICT DO NOTHING
    """
    
    rows_inserted = 0
    batch_size = 1000
    
    for i in range(0, len(df), batch_size):
        batch = df.iloc[i:i + batch_size]
        records = []
        
        for _, row in batch.iterrows():
            raw_json = json.dumps(row.to_dict())
            records.append((
                row.get("date"), row.get("country"), row.get("iso_code"),
                row.get("continent"), row.get("total_cases"), row.get("new_cases"),
                row.get("total_deaths"), row.get("new_deaths"),
                row.get("total_vaccinations"), row.get("people_vaccinated"),
                row.get("people_fully_vaccinated"), row.get("population"),
                row.get("gdp_per_capita"), row.get("human_development_index"),
                row.get("hospital_beds_per_thousand"), row.get("life_expectancy"),
                raw_json, source_url, batch_id
            ))
        
        cursor.executemany(insert_sql, records)
        conn.commit()
        rows_inserted += len(records)
        logger.info(f"Inserted batch {i // batch_size + 1}: {rows_inserted:,} rows total")
    
    # Log ingestion
    cursor.execute("""
        INSERT INTO bronze.data_quality_log 
            (layer, table_name, check_name, status, records_checked, records_failed)
        VALUES ('bronze', 'covid_raw', 'ingestion_complete', 'passed', %s, 0)
    """, (rows_inserted,))
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return rows_inserted


def run_ingestion():
    """Main ingestion pipeline."""
    batch_id = str(uuid.uuid4())
    logger.info(f"Starting bronze ingestion - Batch ID: {batch_id}")
    
    try:
        # Fetch data
        df_raw = fetch_covid_data(COVID_DATA_URL)
        
        # Prepare for bronze
        df_bronze = clean_for_bronze(df_raw)
        logger.info(f"Prepared {len(df_bronze):,} rows for bronze layer")
        
        # Load to database
        rows = load_bronze(df_bronze, batch_id, COVID_DATA_URL)
        
        logger.success(f"Bronze ingestion complete: {rows:,} rows loaded")
        return {"status": "success", "rows": rows, "batch_id": batch_id}
        
    except Exception as e:
        logger.error(f"Bronze ingestion failed: {e}")
        raise


if __name__ == "__main__":
    result = run_ingestion()
    print(f"Result: {result}")
