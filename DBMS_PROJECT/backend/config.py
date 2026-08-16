class Config:
    DB_CONFIG = {
        "host": "localhost",
        "user": "root",
        "password": "",
        "database": "cecms"
    }
    DEBUG = True

    MYSQL_HOST = DB_CONFIG["host"]
    MYSQL_PORT = 3306
    MYSQL_USER = DB_CONFIG["user"]
    MYSQL_PASSWORD = DB_CONFIG["password"]
    MYSQL_DB = DB_CONFIG["database"]
