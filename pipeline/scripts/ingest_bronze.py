"""Bronze Layer Ingestion - truncate + reload latest per country"""
import os, uuid, json
import requests
import pandas as pd
import psycopg2
from loguru import logger

DB_CONFIG = dict(
    host=os.environ["DB_HOST"],
    port=os.environ.get("DB_PORT", "5432"),
    dbname=os.environ.get("DB_NAME", "postgres"),
    user=os.environ.get("DB_USER", "postgres"),
    password=os.environ["DB_PASSWORD"],
    sslmode="require"
)

COVID_URL = "https://covid.ourworldindata.org/data/owid-covid-data.csv"

EXCLUDE = {"World","High income","Upper middle income","Lower middle income",
           "Low income","European Union","International"}

def run():
    logger.info("Downloading OWID CSV...")
    resp = requests.get(COVID_URL, timeout=180)
    resp.raise_for_status()
    
    from io import StringIO
    df = pd.read_csv(StringIO(resp.text), low_memory=False)
    logger.info(f"Downloaded {len(df)} rows")
    
    # Rename and filter
    df = df.rename(columns={"location": "country"})
    df = df[~df["country"].isin(EXCLUDE)]
    df = df[df["iso_code"].notna() & ~df["iso_code"].astype(str).str.startswith("OWID_")]
    
    # Latest per country
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    df = df.sort_values("date").groupby("iso_code").last().reset_index()
    logger.info(f"{len(df)} countries after filtering")
    
    # Connect and load
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute("TRUNCATE bronze.covid_raw")
    
    batch_id = str(uuid.uuid4())
    cols = ["date","country","iso_code","continent","total_cases","new_cases",
            "total_deaths","new_deaths","total_vaccinations","people_vaccinated",
            "people_fully_vaccinated","population","gdp_per_capita",
            "human_development_index","hospital_beds_per_thousand","life_expectancy"]
    
    records = []
    for _, row in df.iterrows():
        def v(c):
            val = row.get(c)
            if pd.isna(val) if hasattr(val, '__class__') else val != val:
                return None
            return str(val) if not isinstance(val, str) else val
        
        records.append((
            v("date"), v("country"), v("iso_code"), v("continent"),
            v("total_cases"), v("new_cases"), v("total_deaths"), v("new_deaths"),
            v("total_vaccinations"), v("people_vaccinated"), v("people_fully_vaccinated"),
            v("population"), v("gdp_per_capita"), v("human_development_index"),
            v("hospital_beds_per_thousand"), v("life_expectancy"),
            json.dumps({c: str(row.get(c, "")) for c in cols}),
            COVID_URL, batch_id
        ))
    
    cur.executemany("""
        INSERT INTO bronze.covid_raw (
            date, country, iso_code, continent,
            total_cases, new_cases, total_deaths, new_deaths,
            total_vaccinations, people_vaccinated, people_fully_vaccinated,
            population, gdp_per_capita, human_development_index,
            hospital_beds_per_thousand, life_expectancy,
            raw_json, source_url, batch_id, ingested_at
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
    """, records)
    
    cur.execute("""
        INSERT INTO bronze.data_quality_log (layer,table_name,check_name,status,records_checked,records_failed)
        VALUES ('bronze','covid_raw','ingestion_complete','passed',%s,0)
    """, (len(records),))
    
    conn.commit()
    cur.close(); conn.close()
    logger.success(f"Bronze done: {len(records)} rows")

if __name__ == "__main__":
    run()
