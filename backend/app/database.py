import os
import pymysql
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Configuracion de conexion para XAMPP (MySQL / MariaDB local)
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_DB = os.getenv("MYSQL_DB", "technova_derm")

def ensure_database_exists():
    """
    Se conecta a XAMPP MySQL y crea automaticamente la base de datos 'technova_derm'
    si todavia no existe, para que el usuario no tenga que crearla a mano en phpMyAdmin.
    """
    try:
        connection = pymysql.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            port=MYSQL_PORT,
            charset="utf8mb4",
            connect_timeout=2
        )
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        connection.commit()
        connection.close()
        print(f"[XAMPP MySQL]: Base de datos '{MYSQL_DB}' verificada/creada exitosamente en XAMPP.")
        return True
    except Exception as e:
        print(f"[XAMPP MySQL]: MySQL no esta respondiendo en {MYSQL_HOST}:{MYSQL_PORT}.")
        print(" -> Abre el XAMPP Control Panel y haz clic en 'Start' en el modulo MySQL.")
        return False

# Intentar crear/conectar a XAMPP MySQL
has_mysql = ensure_database_exists()

if has_mysql:
    SQLALCHEMY_DATABASE_URL = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
    )
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )
    print(f"[XAMPP MySQL]: Conectado a base de datos MySQL local: {MYSQL_DB}")
else:
    # Fallback local de seguridad para evitar caidas si XAMPP MySQL aun no esta encendido
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, "..", "technova_derm.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    print("[INFO]: Usando almacenamiento local temporal hasta que inicies MySQL en el panel de XAMPP.")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
