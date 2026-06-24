"""
Gold Layer Aggregation Script
Creates business-ready aggregated tables from silver layer
"""
import os
import psycopg2
import psycopg2.extras
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "db.ftbtqqwahzpzwqizigcd.supabase.co")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")


def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASSWORD, sslmode="require"
    )


def build_country_summary(conn):
    """Aggregate silver data into gold country summaries."""
    logger.info("Building gold.covid_country_summary...")
    
    sql = """
        INSERT INTO gold.covid_country_summary (
            country, iso_code, continent, population, gdp_per_capita,
            human_development_index, total_cases, total_deaths, total_vaccinations,
            people_vaccinated, people_fully_vaccinated,
            max_daily_cases, max_daily_deaths,
            case_fatality_rate, vaccination_rate,
            cases_per_million, deaths_per_million,
            first_case_date, last_update, updated_at
        )
        SELECT
            country,
            iso_code,
            continent,
            MAX(population) as population,
            MAX(gdp_per_capita) as gdp_per_capita,
            MAX(human_development_index) as human_development_index,
            MAX(total_cases) as total_cases,
            MAX(total_deaths) as total_deaths,
            MAX(total_vaccinations) as total_vaccinations,
            MAX(people_vaccinated) as people_vaccinated,
            MAX(people_fully_vaccinated) as people_fully_vaccinated,
            MAX(new_cases) as max_daily_cases,
            MAX(new_deaths) as max_daily_deaths,
            CASE 
                WHEN MAX(total_cases) > 0 THEN 
                    ROUND(MAX(total_deaths)::NUMERIC / MAX(total_cases) * 100, 4)
                ELSE NULL 
            END as case_fatality_rate,
            CASE 
                WHEN MAX(population) > 0 AND MAX(people_fully_vaccinated) IS NOT NULL THEN
                    ROUND(MAX(people_fully_vaccinated)::NUMERIC / MAX(population) * 100, 4)
                ELSE NULL
            END as vaccination_rate,
            CASE 
                WHEN MAX(population) > 0 THEN
                    ROUND(MAX(total_cases)::NUMERIC / MAX(population) * 1000000, 2)
                ELSE NULL
            END as cases_per_million,
            CASE 
                WHEN MAX(population) > 0 THEN
                    ROUND(MAX(total_deaths)::NUMERIC / MAX(population) * 1000000, 2)
                ELSE NULL
            END as deaths_per_million,
            MIN(CASE WHEN total_cases > 0 THEN date ELSE NULL END) as first_case_date,
            MAX(date) as last_update,
            NOW() as updated_at
        FROM silver.covid_clean
        WHERE iso_code IS NOT NULL
          AND iso_code NOT LIKE 'OWID_%'
          AND country IS NOT NULL
        GROUP BY country, iso_code, continent
        ON CONFLICT (iso_code) DO UPDATE SET
            total_cases = EXCLUDED.total_cases,
            total_deaths = EXCLUDED.total_deaths,
            total_vaccinations = EXCLUDED.total_vaccinations,
            people_vaccinated = EXCLUDED.people_vaccinated,
            people_fully_vaccinated = EXCLUDED.people_fully_vaccinated,
            max_daily_cases = EXCLUDED.max_daily_cases,
            max_daily_deaths = EXCLUDED.max_daily_deaths,
            case_fatality_rate = EXCLUDED.case_fatality_rate,
            vaccination_rate = EXCLUDED.vaccination_rate,
            cases_per_million = EXCLUDED.cases_per_million,
            deaths_per_million = EXCLUDED.deaths_per_million,
            last_update = EXCLUDED.last_update,
            updated_at = NOW()
    """
    
    cursor = conn.cursor()
    cursor.execute(sql)
    count = cursor.rowcount
    conn.commit()
    cursor.close()
    logger.success(f"Country summary: {count} rows upserted")
    return count


def build_continent_summary(conn):
    """Aggregate data by continent."""
    logger.info("Building gold.covid_continent_summary...")
    
    sql = """
        INSERT INTO gold.covid_continent_summary (
            continent, total_countries, population, total_cases, total_deaths,
            total_vaccinations, avg_case_fatality_rate, avg_vaccination_rate,
            cases_per_million, deaths_per_million, updated_at
        )
        SELECT
            continent,
            COUNT(DISTINCT country) as total_countries,
            SUM(population) as population,
            SUM(total_cases) as total_cases,
            SUM(total_deaths) as total_deaths,
            SUM(total_vaccinations) as total_vaccinations,
            AVG(case_fatality_rate) as avg_case_fatality_rate,
            AVG(vaccination_rate) as avg_vaccination_rate,
            CASE WHEN SUM(population) > 0 THEN
                ROUND(SUM(total_cases)::NUMERIC / SUM(population) * 1000000, 2)
            ELSE NULL END as cases_per_million,
            CASE WHEN SUM(population) > 0 THEN
                ROUND(SUM(total_deaths)::NUMERIC / SUM(population) * 1000000, 2)
            ELSE NULL END as deaths_per_million,
            NOW() as updated_at
        FROM gold.covid_country_summary
        WHERE continent IS NOT NULL
        GROUP BY continent
        ON CONFLICT (continent) DO UPDATE SET
            total_countries = EXCLUDED.total_countries,
            population = EXCLUDED.population,
            total_cases = EXCLUDED.total_cases,
            total_deaths = EXCLUDED.total_deaths,
            total_vaccinations = EXCLUDED.total_vaccinations,
            avg_case_fatality_rate = EXCLUDED.avg_case_fatality_rate,
            avg_vaccination_rate = EXCLUDED.avg_vaccination_rate,
            cases_per_million = EXCLUDED.cases_per_million,
            deaths_per_million = EXCLUDED.deaths_per_million,
            updated_at = NOW()
    """
    
    cursor = conn.cursor()
    cursor.execute(sql)
    count = cursor.rowcount
    conn.commit()
    cursor.close()
    logger.success(f"Continent summary: {count} rows upserted")
    return count


def build_time_series(conn):
    """Build global time series aggregated by date and continent."""
    logger.info("Building gold.covid_time_series...")
    
    sql = """
        INSERT INTO gold.covid_time_series (
            date, continent, total_cases, new_cases, total_deaths, new_deaths,
            total_vaccinations, rolling_7day_cases, rolling_7day_deaths, updated_at
        )
        SELECT
            date,
            COALESCE(continent, 'Global') as continent,
            SUM(total_cases) as total_cases,
            SUM(CASE WHEN new_cases > 0 THEN new_cases ELSE 0 END) as new_cases,
            SUM(total_deaths) as total_deaths,
            SUM(CASE WHEN new_deaths > 0 THEN new_deaths ELSE 0 END) as new_deaths,
            SUM(total_vaccinations) as total_vaccinations,
            AVG(SUM(CASE WHEN new_cases > 0 THEN new_cases ELSE 0 END)) OVER (
                PARTITION BY COALESCE(continent, 'Global')
                ORDER BY date
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) as rolling_7day_cases,
            AVG(SUM(CASE WHEN new_deaths > 0 THEN new_deaths ELSE 0 END)) OVER (
                PARTITION BY COALESCE(continent, 'Global')
                ORDER BY date
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) as rolling_7day_deaths,
            NOW() as updated_at
        FROM silver.covid_clean
        WHERE iso_code NOT LIKE 'OWID_%'
        GROUP BY date, COALESCE(continent, 'Global')
        ON CONFLICT (date, continent) DO UPDATE SET
            total_cases = EXCLUDED.total_cases,
            new_cases = EXCLUDED.new_cases,
            total_deaths = EXCLUDED.total_deaths,
            new_deaths = EXCLUDED.new_deaths,
            total_vaccinations = EXCLUDED.total_vaccinations,
            rolling_7day_cases = EXCLUDED.rolling_7day_cases,
            rolling_7day_deaths = EXCLUDED.rolling_7day_deaths,
            updated_at = NOW()
    """
    
    cursor = conn.cursor()
    cursor.execute(sql)
    count = cursor.rowcount
    conn.commit()
    cursor.close()
    logger.success(f"Time series: {count} rows upserted")
    return count


def run_gold_aggregation():
    """Run all gold layer aggregations."""
    logger.info("Starting Gold layer aggregation...")
    conn = get_db_connection()
    
    try:
        c1 = build_country_summary(conn)
        c2 = build_continent_summary(conn)
        c3 = build_time_series(conn)
        
        # Log completion
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO bronze.data_quality_log
                (layer, table_name, check_name, status, records_checked)
            VALUES ('gold', 'all_tables', 'aggregation_complete', 'passed', %s)
        """, (c1 + c2 + c3,))
        conn.commit()
        cursor.close()
        
        logger.success(f"Gold aggregation complete: {c1+c2+c3} total rows")
        return {"countries": c1, "continents": c2, "time_series": c3}
        
    finally:
        conn.close()


if __name__ == "__main__":
    result = run_gold_aggregation()
    print(f"Gold result: {result}")
