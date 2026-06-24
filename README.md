# ETL Medallion COVID-19 Dashboard

Full end-to-end data engineering portfolio project demonstrating a **Bronze → Silver → Gold** medallion ETL pipeline with an interactive Next.js dashboard.

## Stack
- **Ingestion**: Python + Apache Airflow (daily @ 06:00 UTC)
- **Transformation**: Python + dbt
- **Storage**: Supabase (PostgreSQL)
- **Dashboard**: Next.js 14, Recharts, Framer Motion, TailwindCSS
- **CI/CD**: GitHub Actions → Vercel

## Pipeline
1. `ingest_bronze.py` — Raw COVID data from Our World in Data
2. `transform_silver.py` — Cleaning, validation, derived metrics
3. `aggregate_gold.py` — Business-ready summaries (country, continent, time series)
4. `run_tests.py` — 24 data quality tests across all 3 layers

## Data Source
[Our World in Data COVID-19 Dataset](https://covid.ourworldindata.org/data/owid-covid-data.csv)
