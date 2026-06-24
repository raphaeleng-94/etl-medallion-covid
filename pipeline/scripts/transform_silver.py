"""
Silver Layer Transformation Script
Cleans, validates and transforms bronze data into silver layer
Applies data governance rules and quality checks
"""
import os
import math
import psycopg2
import psycopg2.extras
from datetime import datetime, date
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "db.ftbtqqwahzpzwqizigcd.supabase.co")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# Aggregated territories to exclude (OWID specific)
EXCLUDED_LOCATIONS = {
    "World", "High income", "Upper middle income", "Lower middle income",
    "Low income", "European Union", "Asia", "Europe", "North America",
    "South America", "Africa", "Oceania", "International",
    "High-income countries", "Low-income countries"
}


def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASSWORD, sslmode="require"
    )


def safe_int(val):
    """Safely convert to int."""
    try:
        if val is None or str(val).strip() in ("", "None", "nan"):
            return None
        f = float(str(val).replace(",", ""))
        if math.isnan(f) or math.isinf(f):
            return None
        return int(f)
    except (ValueError, TypeError):
        return None


def safe_float(val):
    """Safely convert to float."""
    try:
        if val is None or str(val).strip() in ("", "None", "nan"):
            return None
        f = float(str(val).replace(",", ""))
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 4)
    except (ValueError, TypeError):
        return None


def safe_date(val):
    """Safely convert to date."""
    try:
        if val is None or str(val).strip() in ("", "None", "nan"):
            return None
        return datetime.strptime(str(val).strip(), "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def calculate_data_quality_score(row: dict) -> int:
    """Calculate data quality score 0-100 based on completeness."""
    important_fields = [
        "date", "country", "iso_code", "continent",
        "total_cases", "new_cases", "total_deaths", "population"
    ]
    score = 100
    deductions = 100 // len(important_fields)
    
    for field in important_fields:
        val = row.get(field)
        if val is None or str(val).strip() in ("", "None", "nan"):
            score -= deductions
    
    return max(0, score)


def transform_silver():
    """Main silver transformation."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # Get unprocessed bronze records
    cursor.execute("""
        SELECT b.* 
        FROM bronze.covid_raw b
        LEFT JOIN silver.covid_clean s ON s.bronze_id = b.id
        WHERE s.id IS NULL
        ORDER BY b.id
    """)
    
    bronze_rows = cursor.fetchall()
    logger.info(f"Found {len(bronze_rows):,} unprocessed bronze rows")
    
    if not bronze_rows:
        logger.info("No new records to process")
        return 0
    
    insert_sql = """
        INSERT INTO silver.covid_clean (
            date, country, iso_code, continent,
            total_cases, new_cases, total_deaths, new_deaths,
            total_vaccinations, people_vaccinated, people_fully_vaccinated,
            population, gdp_per_capita, human_development_index,
            hospital_beds_per_thousand, life_expectancy,
            case_fatality_rate, vaccination_rate,
            bronze_id, data_quality_score, processed_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, NOW()
        )
        ON CONFLICT (date, iso_code) DO UPDATE SET
            total_cases = EXCLUDED.total_cases,
            new_cases = EXCLUDED.new_cases,
            total_deaths = EXCLUDED.total_deaths,
            new_deaths = EXCLUDED.new_deaths,
            total_vaccinations = EXCLUDED.total_vaccinations,
            people_vaccinated = EXCLUDED.people_vaccinated,
            people_fully_vaccinated = EXCLUDED.people_fully_vaccinated,
            case_fatality_rate = EXCLUDED.case_fatality_rate,
            vaccination_rate = EXCLUDED.vaccination_rate,
            data_quality_score = EXCLUDED.data_quality_score,
            processed_at = NOW()
    """
    
    rows_processed = 0
    rows_skipped = 0
    errors = []
    
    batch_size = 500
    batch = []
    
    for row in bronze_rows:
        row_dict = dict(row)
        country = row_dict.get("country", "")
        
        # Skip aggregated regions
        if country in EXCLUDED_LOCATIONS:
            rows_skipped += 1
            continue
        
        # Parse dates
        parsed_date = safe_date(row_dict.get("date"))
        if not parsed_date:
            rows_skipped += 1
            errors.append(f"Invalid date for row {row_dict.get('id')}: {row_dict.get('date')}")
            continue
        
        # Parse numerics
        total_cases = safe_int(row_dict.get("total_cases"))
        new_cases = safe_int(row_dict.get("new_cases"))
        total_deaths = safe_int(row_dict.get("total_deaths"))
        new_deaths = safe_int(row_dict.get("new_deaths"))
        total_vaccinations = safe_int(row_dict.get("total_vaccinations"))
        people_vaccinated = safe_int(row_dict.get("people_vaccinated"))
        people_fully_vaccinated = safe_int(row_dict.get("people_fully_vaccinated"))
        population = safe_int(row_dict.get("population"))
        gdp_per_capita = safe_float(row_dict.get("gdp_per_capita"))
        hdi = safe_float(row_dict.get("human_development_index"))
        hospital_beds = safe_float(row_dict.get("hospital_beds_per_thousand"))
        life_exp = safe_float(row_dict.get("life_expectancy"))
        
        # Derived metrics
        case_fatality_rate = None
        if total_cases and total_deaths and total_cases > 0:
            case_fatality_rate = round(total_deaths / total_cases * 100, 4)
        
        vaccination_rate = None
        if people_fully_vaccinated and population and population > 0:
            vaccination_rate = round(people_fully_vaccinated / population * 100, 4)
        
        # Quality score
        quality_score = calculate_data_quality_score(row_dict)
        
        batch.append((
            parsed_date, country, row_dict.get("iso_code"), row_dict.get("continent"),
            total_cases, new_cases, total_deaths, new_deaths,
            total_vaccinations, people_vaccinated, people_fully_vaccinated,
            population, gdp_per_capita, hdi, hospital_beds, life_exp,
            case_fatality_rate, vaccination_rate,
            row_dict.get("id"), quality_score
        ))
        
        if len(batch) >= batch_size:
            cursor.executemany(insert_sql, batch)
            conn.commit()
            rows_processed += len(batch)
            logger.info(f"Silver: processed {rows_processed:,} rows")
            batch = []
    
    if batch:
        cursor.executemany(insert_sql, batch)
        conn.commit()
        rows_processed += len(batch)
    
    # Log quality check
    cursor.execute("""
        INSERT INTO bronze.data_quality_log
            (layer, table_name, check_name, status, records_checked, records_failed, error_message)
        VALUES ('silver', 'covid_clean', 'transformation_complete', 'passed', %s, %s, %s)
    """, (rows_processed, rows_skipped, f"Skipped: {rows_skipped}; Errors: {len(errors)}"))
    conn.commit()
    
    logger.success(f"Silver transformation: {rows_processed:,} processed, {rows_skipped:,} skipped")
    cursor.close()
    conn.close()
    return rows_processed


if __name__ == "__main__":
    result = transform_silver()
    print(f"Silver rows processed: {result}")
