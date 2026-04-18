import os
import dotenv
from sqlalchemy import create_engine, text

def undo_massive_upload():
    dotenv.load_dotenv()
    db_user = os.getenv("MYSQL_USER")
    db_pass = os.getenv("MYSQL_PASSWORD")
    db_host = os.getenv("MYSQL_HOST")
    db_name = os.getenv("MYSQL_DATABASE")
    db_port = os.getenv("MYSQL_PORT")

    engine = create_engine(f"mysql+pymysql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}")

    print("Connecting securely to database to undo the upload...")
    
    with engine.begin() as connection:
        # 1. First, check exactly how many books exist BEFORE the wipe
        count_before = connection.execute(text("SELECT COUNT(*) FROM books")).scalar()
        
        # 2. Delete ALL books structurally added during the massive pipeline run
        # Your test books were IDs 1, 2, and 7. The big upload started well past ID 100!
        connection.execute(text("DELETE FROM books WHERE BookID >= 100;"))
        connection.execute(text("DELETE FROM catalogueinfo WHERE CatalogueInfoID >= 100;"))
        
        # 3. Check exactly how many survived
        count_after = connection.execute(text("SELECT COUNT(*) FROM books")).scalar()
        
    print(f"Undo Complete! The database originally had {count_before} books. It has now been reverted safely back to {count_after} test books!")

if __name__ == '__main__':
    undo_massive_upload()
