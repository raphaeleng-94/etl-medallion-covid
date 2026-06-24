"""
Bronze Layer Ingestion - Fetches latest COVID data from OWID
Strategy: truncate + reload (simpler, avoids conflict issues)
"""
import os, uuid, json, requests, pandas as pd, psycopg2
from datetime import datetime
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = dict(
    host=os.getenv("DB_HOST", "db.ftbtqqwahzpzwqizigcd.supabase.co"),
    port=os.getenv("DB_PORT", "5432"),
    dbname=os.getenv("DB_NAME", "postgres"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD", ""),
    sslmode="require"
)

COVID_URL = "https://covid.ourworldindata.org/data/owid-covid-data.csv"

COLS = ["date","location","iso_code","continent","total_cases","new_cases",
        "total_deaths","new_deaths","total_vaccinations","people_vaccinated",
        "people_fully_vaccinated","population","gdp_per_capita",
        "human_development_index","hospital_beds_per_thousand","life_expectancy"]

# Only keep the LATEST record per country (reduces rows from ~100k to ~230)
def fetch_latest():
    logger.info("Downloading OWID data...")
    df = pd.read_csv(COVID_URL, usecols=[c for c in COLS if c != "location"] + ["location"])
    df = df.rename(columns={"location": "country"})
    
    # Filter out aggregated regions
    exclude = {"World","High income","Upper middle income","Lower middle income",
               "Low income","European Union","International","High-income countries","Low-income countries"}
    df = df[~df["country"].isin(exclude)]
    df = df[df["iso_code"].notna() & ~df["iso_code"].str.startswith("OWID_")]
    
    # Keep only latest date per country
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    df = df.sort_values("date").groupby("iso_code").last().reset_index()
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    
    # Convert all to string for bronze layer
    for col in df.columns:
        df[col] = df[col].astype(str).replace("nan", None)
    
    logger.info(f"Got {len(df)} countries (latest records only)")
    return df

def load_bronze(df):
    batch_id = str(uuid.uuid4())
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Truncate and reload
    cur.execute("TRUNCATE bronze.covid_raw")
    
    insert_sql = """
        INSERT INTO bronze.covid_raw (
            date, country, iso_code, continent,
            total_cases, new_cases, total_deaths, new_deaths,
            total_vaccinations, people_vaccinated, people_fully_vaccinated,
            population, gdp_per_capita, human_development_index,
            hospital_beds_per_thousand, life_expectancy,
            raw_json, source_url, batch_id, ingested_at
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
    """
    
    records = []
    for _, row in df.iterrows():
        records.append((
            row.get("date"), row.get("country"), row.get("iso_code"), row.get("continent"),
            row.get("total_cases"), row.get("new_cases"), row.get("total_deaths"), row.get("new_deaths"),
            row.get("total_vaccinations"), row.get("people_vaccinated"), row.get("people_fully_vaccinated"),
            row.get("population"), row.get("gdp_per_capita"), row.get("human_development_index"),
            row.get("hospital_beds_per_thousand"), row.get("life_expectancy"),
            json.dumps(row.to_dict()), COVID_URL, batch_id
        ))
    
    cur.executemany(insert_sql, records)
    
    cur.execute("""
        INSERT INTO bronze.data_quality_log (layer, table_name, check_name, status, records_checked, records_failed)
        VALUES ('bronze', 'covid_raw', 'ingestion_complete', 'passed', %s, 0)
    """, (len(records),))
    
    conn.commit()
    cur.close(); conn.close()
    logger.success(f"Bronze: {len(records)} rows loaded (batch {batch_id[:8]})")
    return len(records)

if __name__ == "__main__":
    df = fetch_latest()
    n = load_bronze(df)
    print(f"✅ Bronze complete: {n} rows")
