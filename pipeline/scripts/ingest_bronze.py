"""Bronze Layer Ingestion - truncate + reload latest per country"""
import os, uuid, json, traceback
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
    # Step 1: Download
    logger.info("Downloading OWID CSV...")
    resp = requests.get(COVID_URL, timeout=180)
    resp.raise_for_status()
    logger.info(f"Downloaded {len(resp.content)//1024}KB")

    # Step 2: Parse
    from io import StringIO
    df = pd.read_csv(StringIO(resp.text), low_memory=False)
    logger.info(f"Parsed {len(df)} rows, {len(df.columns)} cols")

    # Step 3: Filter
    df = df.rename(columns={"location": "country"})
    df = df[~df["country"].isin(EXCLUDE)]
    df = df[df["iso_code"].notna() & ~df["iso_code"].astype(str).str.startswith("OWID_")]
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    df = df.sort_values("date").groupby("iso_code").last().reset_index()
    logger.info(f"{len(df)} countries after filtering")

    # Step 4: Connect
    logger.info(f"Connecting to {DB_CONFIG['host']}...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    logger.info("Connected!")

    # Step 5: Truncate
    cur.execute("TRUNCATE bronze.covid_raw")
    logger.info("Truncated bronze.covid_raw")

    # Step 6: Insert
    batch_id = str(uuid.uuid4())
    cols = ["date","country","iso_code","continent","total_cases","new_cases",
            "total_deaths","new_deaths","total_vaccinations","people_vaccinated",
            "people_fully_vaccinated","population","gdp_per_capita",
            "human_development_index","hospital_beds_per_thousand","life_expectancy"]

    def safe(val):
        try:
            if pd.isna(val): return None
        except: pass
        return str(val) if not isinstance(val, str) else val

    records = []
    for _, row in df.iterrows():
        records.append((
            safe(row.get("date")), safe(row.get("country")), safe(row.get("iso_code")),
            safe(row.get("continent")), safe(row.get("total_cases")), safe(row.get("new_cases")),
            safe(row.get("total_deaths")), safe(row.get("new_deaths")),
            safe(row.get("total_vaccinations")), safe(row.get("people_vaccinated")),
            safe(row.get("people_fully_vaccinated")), safe(row.get("population")),
            safe(row.get("gdp_per_capita")), safe(row.get("human_development_index")),
            safe(row.get("hospital_beds_per_thousand")), safe(row.get("life_expectancy")),
            json.dumps({c: str(row.get(c,"")) for c in cols}),
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
    logger.success(f"Bronze done: {len(records)} rows loaded")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        logger.error(f"BRONZE FAILED: {e}")
        traceback.print_exc()
        raise
