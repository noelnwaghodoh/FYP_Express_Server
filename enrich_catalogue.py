import pandas as pd
import gzip
import orjson
import os
import gc

def enrich_dataset():
    # 1. File Paths
    csv_path = "penrhyn.csv"
    editions_path = r"C:\Users\Admin\Downloads\ol_dump_editions_2026-03-31.txt.gz"
    works_path = r"C:\Users\Admin\Downloads\ol_dump_works_2026-03-31.txt.gz"
    output_path = "enriched_penrhyn.csv"

    print("Loading original CSV...")
    df = pd.read_csv(csv_path, dtype={"ISBN": str})
    
    # Create the new empty columns natively inside Pandas
    df["ItemSubjects"] = ""
    df["ItemPublisher"] = ""
    df["ItemDescription"] = ""
    df["BookContributors"] = ""
    
    # 2. Build mathematical lookup dictionaries for O(1) performance
    # Map ISBN string -> List of DataFrame indices (because 1 ISBN might appear on multiple rows!)
    isbn_to_indices = {}
    
    for index, row in df.iterrows():
        raw_isbn = str(row["ISBN"]).strip()
        if raw_isbn and raw_isbn != 'nan':
            # Split by semicolon in case they stacked them, take the first clean one
            clean_isbn = raw_isbn.split(';')[0].strip()
            
            if clean_isbn not in isbn_to_indices:
                isbn_to_indices[clean_isbn] = []
            isbn_to_indices[clean_isbn].append(index)
            
    print(f"Tracking {len(isbn_to_indices)} unique ISBNs from the CSV...")

    # We also need to map Works -> List of DataFrame indices so the second pass knows exactly where to put descriptions
    work_to_indices = {}

    # ==========================================
    # PHASE 1: STREAM EDITIONS DUMP 
    # ==========================================
    print("Streaming Editions heavily... (this will take a while, get a coffee!)")
    
    with gzip.open(editions_path, 'rt', encoding='utf-8') as file:
        for line in file:
            columns = line.split('\t')
            if len(columns) < 5: continue
                
            try:
                data = orjson.loads(columns[4])
                
                file_isbns = data.get("isbn_10", []) + data.get("isbn_13", [])
                
                for isbn in file_isbns:
                    if isbn in isbn_to_indices:
                        # We have a mathematical Hit!
                        indices_to_update = isbn_to_indices[isbn]
                        
                        # Grab Subjects (Comma Separated String for MySQL!)
                        subjects = data.get("subjects", [])
                        if subjects:
                            # Sometimes subjects are dicts, sometimes strings
                            subject_names = [s if isinstance(s, str) else s.get("name", "") for s in subjects]
                            subject_string = ", ".join(filter(None, subject_names))
                            
                            for idx in indices_to_update:
                                df.at[idx, "ItemSubjects"] = subject_string
                                
                        # Grab Publishers (Comma Separated)
                        publishers = data.get("publishers", [])
                        if publishers:
                            pub_string = ", ".join(publishers)
                            for idx in indices_to_update:
                                df.at[idx, "ItemPublisher"] = pub_string
                                
                        # Grab Contributors (by_statement shortcut)
                        by_statement = data.get("by_statement", "")
                        if by_statement:
                            for idx in indices_to_update:
                                df.at[idx, "BookContributors"] = str(by_statement).strip()
                                
                        # Map the Works ID so Phase 2 can catch the Description!
                        works = data.get("works", [])
                        if works:
                            work_key = works[0].get("key")
                            if work_key:
                                if work_key not in work_to_indices:
                                    work_to_indices[work_key] = []
                                # Merge the indices so Phase 2 knows all rows that need this specific description
                                work_to_indices[work_key].extend(indices_to_update)
                                
                        break # Found it, skip the other ISBNs on this line
            except Exception:
                pass # Gracefully ignore any structurally malformed JSON lines in the database dump

    # Force memory garbage collection
    isbn_to_indices.clear()
    gc.collect()

    # ==========================================
    # PHASE 2: STREAM WORKS DUMP
    # ==========================================
    print(f"Streaming Works to find {len(work_to_indices)} matched descriptions...")
    
    with gzip.open(works_path, 'rt', encoding='utf-8') as file:
        for line in file:
            columns = line.split('\t')
            if len(columns) < 5: continue
                
            work_key = columns[1] # e.g. /works/OL123M
            
            if work_key in work_to_indices:
                try:
                    data = orjson.loads(columns[4])
                    
                    # Extract the deeply nested Description
                    desc_obj = data.get("description", "")
                    description_text = desc_obj.get("value", "") if isinstance(desc_obj, dict) else str(desc_obj)
                    
                    if description_text:
                        # Automatically inject it into every Pandas row that needed it!
                        for idx in work_to_indices[work_key]:
                            df.at[idx, "ItemDescription"] = description_text
                except Exception:
                    pass

    # ==========================================
    # PHASE 3: EXPORT
    # ==========================================
    print("Dumping compiled data offline...")
    df.to_csv(output_path, index=False)
    print(f"Completely Finished! Final dataset saved perfectly to: {output_path}")

if __name__ == '__main__':
    enrich_dataset()
