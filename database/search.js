import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();
export const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT,
    ssl: { rejectUnauthorized: false }
  })
  .promise();

export async function Search5BooksByTitle(title) {
  console.log("the title is: " + title);
  const [rows] = await pool.query(
    `
    SELECT BookTitle
    FROM books
    WHERE BookTitle LIKE ?
    LIMIT 5;
    `,
    [title + "%"],
  );
  return rows;
}

export async function SearchBooksByTitle(query) {
  console.log("Executing Tiered Search for: " + query);
  
  // TIER 1: Strict Prefix matching (Fastest, most relevant exact titles)
  let [rows] = await pool.query(
    `
    SELECT books.* , catalogueinfo.ItemSubjects, catalogueinfo.ItemDescription, catalogueinfo.ItemPublisher 
    FROM books 
    INNER JOIN catalogueinfo ON books.CatalogueInfoID = catalogueinfo.CatalogueInfoID 
    WHERE books.BookTitle LIKE ?
    LIMIT 150;
    `,
    [query + "%"]
  );

  // If we dynamically catch results exclusively matching exactly what they typed, bail out early!
  if (rows.length > 0) return rows;

  // TIER 2: Broad Text Title matching (Checks if the term mathematically exists anywhere geographically in the title string)
  [rows] = await pool.query(
    `
    SELECT books.* , catalogueinfo.ItemSubjects, catalogueinfo.ItemDescription, catalogueinfo.ItemPublisher 
    FROM books 
    INNER JOIN catalogueinfo ON books.CatalogueInfoID = catalogueinfo.CatalogueInfoID 
    WHERE books.BookTitle LIKE ?
    LIMIT 150;
    `,
    ["%" + query + "%"]
  );

  // If the broad title matched something tucked into the end of a title, bail!
  if (rows.length > 0) return rows;

  // TIER 3: Deep Deep Subject & Author Fallback checking (The final net)
  [rows] = await pool.query(
    `
    SELECT books.* , catalogueinfo.ItemSubjects, catalogueinfo.ItemDescription, catalogueinfo.ItemPublisher 
    FROM books 
    INNER JOIN catalogueinfo ON books.CatalogueInfoID = catalogueinfo.CatalogueInfoID 
    WHERE catalogueinfo.ItemSubjects LIKE ? OR books.BookAuthor LIKE ?
    LIMIT 150;
    `,
    ["%" + query + "%", "%" + query + "%"]
  );

  return rows;
}
