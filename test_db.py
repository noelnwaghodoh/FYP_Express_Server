import pandas as pd
import os
import dotenv
from sqlalchemy import create_engine, text

dotenv.load_dotenv()
db_user = os.getenv("MYSQL_USER")
db_pass = os.getenv("MYSQL_PASSWORD")
db_host = os.getenv("MYSQL_HOST")
db_name = os.getenv("MYSQL_DATABASE")
db_port = os.getenv("MYSQL_PORT")

engine = create_engine(f"mysql+pymysql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}")

with engine.begin() as conn:
    res = conn.execute(text("SELECT BookID, BookTitle, BookAuthor, BookIdentifier, catalogueInfoID FROM books LIMIT 5"))
    for row in res:
        print(row)
