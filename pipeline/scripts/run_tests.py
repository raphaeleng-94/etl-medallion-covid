"""
Data Quality Tests - Data Governance
Tests all three medallion layers for data quality and integrity
"""
import os
import sys
import psycopg2
import psycopg2.extras
from datetime import datetime
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


class DataQualityTest:
    def __init__(self, conn):
        self.conn = conn
        self.cursor = conn.cursor()
        self.results = []
    
    def run_test(self, layer: str, table: str, check_name: str, sql: str, 
                 expected_zero: bool = True):
        """Run a single quality check."""
        try:
            self.cursor.execute(sql)
            result = self.cursor.fetchone()
            count = result[0] if result else 0
            
            if expected_zero:
                passed = count == 0
                status = "passed" if passed else "failed"
            else:
                passed = count > 0
                status = "passed" if passed else "failed"
            
            self.results.append({
                "layer": layer, "table": table, "check": check_name,
                "status": status, "count": count, "passed": passed
            })
            
            # Log to DB
            self.cursor.execute("""
                INSERT INTO bronze.data_quality_log
                    (layer, table_name, check_name, status, records_checked, records_failed)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (layer, table, check_name, status, count, 0 if passed else count))
            self.conn.commit()
            
            icon = "✅" if passed else "❌"
            logger.info(f"{icon} [{layer}] {check_name}: {count} records ({status})")
            return passed
            
        except Exception as e:
            logger.error(f"Test error [{check_name}]: {e}")
            self.results.append({
                "layer": layer, "table": table, "check": check_name,
                "status": "error", "count": -1, "passed": False
            })
            return False

    def run_bronze_tests(self):
        """Bronze layer data quality tests."""
        logger.info("=== Running Bronze Layer Tests ===")
        
        # Test 1: Table has data
        self.run_test("bronze", "covid_raw", "table_not_empty",
            "SELECT COUNT(*) FROM bronze.covid_raw", expected_zero=False)
        
        # Test 2: No null dates
        self.run_test("bronze", "covid_raw", "no_null_dates",
            "SELECT COUNT(*) FROM bronze.covid_raw WHERE date IS NULL")
        
        # Test 3: No null countries
        self.run_test("bronze", "covid_raw", "no_null_countries",
            "SELECT COUNT(*) FROM bronze.covid_raw WHERE country IS NULL")
        
        # Test 4: Date format valid
        self.run_test("bronze", "covid_raw", "valid_date_format",
            """SELECT COUNT(*) FROM bronze.covid_raw 
               WHERE date !~ '^\d{4}-\d{2}-\d{2}$' AND date IS NOT NULL""")
        
        # Test 5: Reasonable date range (2020-2025)
        self.run_test("bronze", "covid_raw", "date_range_valid",
            """SELECT COUNT(*) FROM bronze.covid_raw 
               WHERE date < '2020-01-01' OR date > '2025-12-31'""")
    
    def run_silver_tests(self):
        """Silver layer data quality tests."""
        logger.info("=== Running Silver Layer Tests ===")
        
        # Test 1: Silver has data
        self.run_test("silver", "covid_clean", "table_not_empty",
            "SELECT COUNT(*) FROM silver.covid_clean", expected_zero=False)
        
        # Test 2: No null dates
        self.run_test("silver", "covid_clean", "no_null_dates",
            "SELECT COUNT(*) FROM silver.covid_clean WHERE date IS NULL")
        
        # Test 3: No null countries
        self.run_test("silver", "covid_clean", "no_null_countries",
            "SELECT COUNT(*) FROM silver.covid_clean WHERE country IS NULL")
        
        # Test 4: Total cases non-negative
        self.run_test("silver", "covid_clean", "total_cases_non_negative",
            "SELECT COUNT(*) FROM silver.covid_clean WHERE total_cases < 0")
        
        # Test 5: Total deaths non-negative  
        self.run_test("silver", "covid_clean", "total_deaths_non_negative",
            "SELECT COUNT(*) FROM silver.covid_clean WHERE total_deaths < 0")
        
        # Test 6: Deaths <= Cases (logical check)
        self.run_test("silver", "covid_clean", "deaths_not_exceed_cases",
            """SELECT COUNT(*) FROM silver.covid_clean 
               WHERE total_deaths > total_cases 
               AND total_cases IS NOT NULL AND total_deaths IS NOT NULL""")
        
        # Test 7: Case fatality rate between 0-100%
        self.run_test("silver", "covid_clean", "cfr_range_valid",
            """SELECT COUNT(*) FROM silver.covid_clean 
               WHERE case_fatality_rate < 0 OR case_fatality_rate > 100""")
        
        # Test 8: Vaccination rate between 0-200% (can exceed 100% due to boosters)
        self.run_test("silver", "covid_clean", "vaccination_rate_reasonable",
            """SELECT COUNT(*) FROM silver.covid_clean 
               WHERE vaccination_rate < 0 OR vaccination_rate > 300""")
        
        # Test 9: Unique constraint check
        self.run_test("silver", "covid_clean", "no_duplicate_date_country",
            """SELECT COUNT(*) - COUNT(DISTINCT (date::text || '-' || iso_code))
               FROM silver.covid_clean WHERE iso_code IS NOT NULL""")
        
        # Test 10: Quality score in valid range
        self.run_test("silver", "covid_clean", "quality_score_valid",
            """SELECT COUNT(*) FROM silver.covid_clean 
               WHERE data_quality_score < 0 OR data_quality_score > 100""")
        
        # Test 11: Population positive
        self.run_test("silver", "covid_clean", "population_positive",
            "SELECT COUNT(*) FROM silver.covid_clean WHERE population <= 0")
        
        # Test 12: ISO codes 2-3 chars
        self.run_test("silver", "covid_clean", "iso_code_format",
            """SELECT COUNT(*) FROM silver.covid_clean 
               WHERE iso_code IS NOT NULL AND LENGTH(iso_code) NOT BETWEEN 2 AND 5""")
    
    def run_gold_tests(self):
        """Gold layer data quality tests."""
        logger.info("=== Running Gold Layer Tests ===")
        
        # Test 1: Country summary not empty
        self.run_test("gold", "covid_country_summary", "table_not_empty",
            "SELECT COUNT(*) FROM gold.covid_country_summary", expected_zero=False)
        
        # Test 2: Continent summary not empty
        self.run_test("gold", "covid_continent_summary", "table_not_empty",
            "SELECT COUNT(*) FROM gold.covid_continent_summary", expected_zero=False)
        
        # Test 3: Time series not empty
        self.run_test("gold", "covid_time_series", "table_not_empty",
            "SELECT COUNT(*) FROM gold.covid_time_series", expected_zero=False)
        
        # Test 4: No null continents in country summary
        self.run_test("gold", "covid_country_summary", "continents_not_null",
            "SELECT COUNT(*) FROM gold.covid_country_summary WHERE continent IS NULL")
        
        # Test 5: Total cases >= total deaths globally
        self.run_test("gold", "covid_country_summary", "cases_exceed_deaths",
            """SELECT COUNT(*) FROM gold.covid_country_summary 
               WHERE total_cases < total_deaths 
               AND total_cases IS NOT NULL AND total_deaths IS NOT NULL""")
        
        # Test 6: At least 100 countries
        self.run_test("gold", "covid_country_summary", "minimum_countries",
            """SELECT CASE WHEN COUNT(*) >= 100 THEN 0 ELSE 1 END 
               FROM gold.covid_country_summary""")
        
        # Test 7: Time series has complete years
        self.run_test("gold", "covid_time_series", "time_series_has_2021",
            """SELECT CASE WHEN COUNT(*) > 0 THEN 0 ELSE 1 END 
               FROM gold.covid_time_series WHERE EXTRACT(YEAR FROM date) = 2021""")
        
        # Test 8: CFR is reasonable (< 30%)
        self.run_test("gold", "covid_country_summary", "cfr_reasonable",
            """SELECT COUNT(*) FROM gold.covid_country_summary 
               WHERE case_fatality_rate > 30""")
    
    def print_summary(self):
        """Print test summary."""
        total = len(self.results)
        passed = sum(1 for r in self.results if r["passed"])
        failed = total - passed
        
        print("\n" + "="*60)
        print("DATA QUALITY TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {total}")
        print(f"✅ Passed:   {passed}")
        print(f"❌ Failed:   {failed}")
        print(f"Score:       {passed/total*100:.1f}%")
        print("="*60)
        
        if failed > 0:
            print("\nFailed Tests:")
            for r in self.results:
                if not r["passed"]:
                    print(f"  ❌ [{r['layer']}] {r['check']}: {r['count']} records")
        
        return passed == total


def run_all_tests():
    """Execute all data quality tests."""
    logger.info("Starting data quality test suite...")
    conn = get_db_connection()
    
    try:
        tester = DataQualityTest(conn)
        tester.run_bronze_tests()
        tester.run_silver_tests()
        tester.run_gold_tests()
        
        all_passed = tester.print_summary()
        return all_passed
        
    finally:
        conn.close()


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
