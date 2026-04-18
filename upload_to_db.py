import pandas as pd
import os
import dotenv
import re
from sqlalchemy import create_engine, text

def upload_dataframe_to_mysql():
    dotenv.load_dotenv()
    
    # 1. Establish strict MySQL Connection Architecture
    db_user = os.getenv("MYSQL_USER")
    db_pass = os.getenv("MYSQL_PASSWORD")
    db_host = os.getenv("MYSQL_HOST")
    db_name = os.getenv("MYSQL_DATABASE")
    db_port = os.getenv("MYSQL_PORT")
    
    # Note: We must use the PyMySQL dialect we installed specifically for MySQL earlier!
    engine = create_engine(
        f"mysql+pymysql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
    )

    # 2. Load the perfectly mapped Dataframe
    print("Loading mapped dataframe from disk...")
    data = pd.read_csv("enriched_penrhyn.csv",
                   usecols=["Title", "Author", "ISBN", "BookContributors", "ItemSubjects", "ItemPublisher", "ItemDescription"],
                   dtype=str)

    data = data.rename(columns={
        "Title": "BookTitle",
        "Author": "BookAuthor",
        "ISBN": "BookIdentifier"
    })
    data = data.dropna(subset=["BookTitle"])
    
    # Clean up archaic Library Catalogue trailing slashes and spaces natively!
    data["BookTitle"] = data["BookTitle"].str.rstrip(" /")
    
    # Intelligently fix obscure MARC ascii brackets back into standard math symbols!
    marc_replacements = {
        r'\[plus plus\]': '++',
        r'\[plus\]': '+',
        r'\[sharp\]': '#',
        r'\[and\]': '&',
        r'\[equals\]': '=',
        r'\[equal\]': '=',
        r'\[percent\]': '%',
        r'\[dollar\]': '$',
        r'\[at\]': '@',
        r'\[star\]': '*',
        r'\[slash\]': '/'
    }
    for old_regex, new_char in marc_replacements.items():
        data["BookTitle"] = data["BookTitle"].str.replace(old_regex, new_char, regex=True, flags=re.IGNORECASE)
    
    # Phenomenally faster: Mathematically shred identical duplicates in memory BEFORE we upload!
    data = data.drop_duplicates(subset=["BookTitle"], keep="first")
    
    data = data.fillna("")

    # 3. Iteratively execute strict database insertions preserving relational Foreign Keys
    print("Beginning secure MySQL Server Uploads...")
    
    with engine.begin() as connection:
        processed = 0
        for index, row in data.iterrows():
            
            # Step A: We must ALWAYS insert into 'catalogueinfo' first to natively generate the ID
            cat_query = text("""
                INSERT INTO catalogueinfo (ItemSubjects, ItemPublisher, ItemDescription) 
                VALUES (:subj, :pub, :desc)
            """)
            
            cat_result = connection.execute(cat_query, {
                "subj": row["ItemSubjects"][:255] if row["ItemSubjects"] else None,
                "pub": row["ItemPublisher"][:255] if row["ItemPublisher"] else None,
                "desc": row["ItemDescription"] if row["ItemDescription"] else None
            })
            
            # Grab the newly generated Auto-Increment ID instantly!
            catalogue_id = cat_result.lastrowid
            
            # Step B: Insert into the core 'books' table structurally binding the new Foreign Key
            book_query = text("""
                INSERT INTO books (BookTitle, BookAuthor, BookIdentifier, BookContributors, catalogueInfoID) 
                VALUES (:title, :author, :isbn, :contrib, :catid)
            """)
            
            connection.execute(book_query, {
                "title": row["BookTitle"][:255] if row["BookTitle"] else None,
                "author": row["BookAuthor"][:255] if row["BookAuthor"] else None,
                "isbn": re.sub(r'[^0-9X]', '', str(row["BookIdentifier"]).split(";")[0].strip().upper())[:13] if row["BookIdentifier"] else None,
                "contrib": row["BookContributors"][:255] if row["BookContributors"] else None,
                "catid": catalogue_id
            })
            
            processed += 1
            if processed % 1000 == 0:
                print(f"Successfully uploaded {processed} books securely to the database...")

    print(f"Database Upload Complete! {len(data)} Books are now totally live in your Next.js application!")

if __name__ == '__main__':
    upload_dataframe_to_mysql()
