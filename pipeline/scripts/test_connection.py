"""Test DB connection - tries direct and pooler"""
import psycopg2, os, sys

pw = os.environ.get('DB_PASSWORD', '')
print(f"Testing connection (password length: {len(pw)})")

variants = [
    ('aws-0-sa-east-1.pooler.supabase.com', '5432', 'postgres.ftbtqqwahzpzwqizigcd', 'pooler-5432'),
    ('aws-0-sa-east-1.pooler.supabase.com', '6543', 'postgres.ftbtqqwahzpzwqizigcd', 'pooler-6543'),
    ('db.ftbtqqwahzpzwqizigcd.supabase.co',  '5432', 'postgres',                      'direct-5432'),
]

for host, port, user, label in variants:
    try:
        conn = psycopg2.connect(
            host=host, port=port, dbname='postgres',
            user=user, password=pw, sslmode='require',
            connect_timeout=15
        )
        cur = conn.cursor()
        cur.execute('SELECT COUNT(*) FROM bronze.covid_raw')
        count = cur.fetchone()[0]
        print(f'OK [{label}] bronze rows: {count}')
        conn.close()
        sys.exit(0)
    except Exception as e:
        print(f'FAIL [{label}]: {str(e)[:200]}')

print('ERROR: All connection variants failed')
sys.exit(1)
