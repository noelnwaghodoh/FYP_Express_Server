import os
import dotenv
from sqlalchemy import create_engine, text

def reset_auto_increment():
    dotenv.load_dotenv()
    db_user = os.getenv("MYSQL_USER")
    db_pass = os.getenv("MYSQL_PASSWORD")
    db_host = os.getenv("MYSQL_HOST")
    db_name = os.getenv("MYSQL_DATABASE")
    db_port = os.getenv("MYSQL_PORT")

    engine = create_engine(f"mysql+pymysql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}")

    with engine.begin() as conn:
        print("Resetting AUTO_INCREMENT back dynamically...")
        # MySQL automatically clamps this to MAX(id) + 1 natively
        conn.execute(text("ALTER TABLE books AUTO_INCREMENT = 1;"))
        conn.execute(text("ALTER TABLE catalogueinfo AUTO_INCREMENT = 1;"))
        
    print("Flawlessly reset the AUTO_INCREMENT trackers entirely back down!")

if __name__ == '__main__':
    reset_auto_increment()
