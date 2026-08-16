import pymysql
import pymysql.cursors
from config import Config


def get_connection():
    connection = pymysql.connect(
        host=Config.MYSQL_HOST,
        port=Config.MYSQL_PORT,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )
    return connection


def execute_query(query, params=None, fetch=False, fetch_one=False, commit=False):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            if fetch_one:
                result = cursor.fetchone()
            elif fetch:
                result = cursor.fetchall()
            else:
                result = cursor.lastrowid
            if commit:
                conn.commit()
        return result
    except pymysql.err.IntegrityError as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
