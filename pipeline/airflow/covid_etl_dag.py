"""
COVID-19 ETL Pipeline DAG
Medallion Architecture: Bronze → Silver → Gold
Runs daily to fetch and process latest COVID data
"""
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.utils.dates import days_ago
from airflow.models import Variable

default_args = {
    "owner": "etl-team",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(hours=2),
}

dag = DAG(
    "covid_medallion_etl",
    default_args=default_args,
    description="COVID-19 ETL Pipeline - Medallion Architecture",
    schedule_interval="0 6 * * *",  # Daily at 6am
    start_date=days_ago(1),
    catchup=False,
    max_active_runs=1,
    tags=["covid", "etl", "medallion", "bronze", "silver", "gold"],
)


def ingest_bronze_fn(**context):
    """Task: Ingest raw COVID data into bronze layer."""
    import sys
    sys.path.insert(0, "/opt/airflow/scripts")
    from ingest_bronze import run_ingestion
    
    result = run_ingestion()
    context["task_instance"].xcom_push(key="bronze_rows", value=result.get("rows", 0))
    context["task_instance"].xcom_push(key="batch_id", value=result.get("batch_id"))
    return result


def transform_silver_fn(**context):
    """Task: Transform bronze data into silver layer."""
    import sys
    sys.path.insert(0, "/opt/airflow/scripts")
    from transform_silver import transform_silver
    
    rows = transform_silver()
    context["task_instance"].xcom_push(key="silver_rows", value=rows)
    return rows


def aggregate_gold_fn(**context):
    """Task: Aggregate silver data into gold layer."""
    import sys
    sys.path.insert(0, "/opt/airflow/scripts")
    from aggregate_gold import run_gold_aggregation
    
    result = run_gold_aggregation()
    return result


def run_quality_tests_fn(**context):
    """Task: Run data quality tests across all layers."""
    import sys
    sys.path.insert(0, "/opt/airflow/scripts")
    from run_tests import run_all_tests
    
    all_passed = run_all_tests()
    if not all_passed:
        raise Exception("Data quality tests failed! Check bronze.data_quality_log")
    return "All tests passed"


def notify_success_fn(**context):
    """Task: Send success notification."""
    bronze_rows = context["task_instance"].xcom_pull(
        task_ids="ingest_bronze", key="bronze_rows"
    )
    silver_rows = context["task_instance"].xcom_pull(
        task_ids="transform_silver", key="silver_rows"
    )
    
    message = f"""
    ✅ ETL Pipeline Completed Successfully!
    Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    Bronze rows: {bronze_rows:,}
    Silver rows: {silver_rows:,}
    """
    print(message)
    return message


# Task definitions
t_ingest_bronze = PythonOperator(
    task_id="ingest_bronze",
    python_callable=ingest_bronze_fn,
    provide_context=True,
    dag=dag,
)

t_transform_silver = PythonOperator(
    task_id="transform_silver",
    python_callable=transform_silver_fn,
    provide_context=True,
    dag=dag,
)

t_aggregate_gold = PythonOperator(
    task_id="aggregate_gold",
    python_callable=aggregate_gold_fn,
    provide_context=True,
    dag=dag,
)

# dbt tests for silver
t_dbt_test_silver = BashOperator(
    task_id="dbt_test_silver",
    bash_command="""
        cd /opt/airflow/dbt_project && \
        dbt test --select silver --profiles-dir /opt/airflow/dbt_project
    """,
    dag=dag,
)

# dbt tests for gold
t_dbt_test_gold = BashOperator(
    task_id="dbt_test_gold",
    bash_command="""
        cd /opt/airflow/dbt_project && \
        dbt test --select gold --profiles-dir /opt/airflow/dbt_project
    """,
    dag=dag,
)

t_quality_tests = PythonOperator(
    task_id="run_quality_tests",
    python_callable=run_quality_tests_fn,
    provide_context=True,
    dag=dag,
)

t_notify = PythonOperator(
    task_id="notify_success",
    python_callable=notify_success_fn,
    provide_context=True,
    dag=dag,
)

# Pipeline flow
t_ingest_bronze >> t_transform_silver >> t_aggregate_gold
t_aggregate_gold >> t_dbt_test_silver >> t_dbt_test_gold
t_dbt_test_gold >> t_quality_tests >> t_notify
