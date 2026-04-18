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
  console.log("Executing Tiered Combined Search for: " + query);
  
  const combinedResults = [];
  const processedBookIDs = new Set();
  
  // Local helper to natively deduplicate and linearly stack the tiers together 
  const ingestResults = (queryRows) => {
    for (const row of queryRows) {
      if (!processedBookIDs.has(row.BookID)) {
        processedBookIDs.add(row.BookID);
        combinedResults.push(row);
      }
    }
  };

  // TIER 1: Strict Prefix matching (Fastest, exact prefixes get Pushed first)
  const [tier1] = await pool.query(
    `
    SELECT books.* , catalogueinfo.ItemSubjects, catalogueinfo.ItemDescription, catalogueinfo.ItemPublisher 
    FROM books 
    INNER JOIN catalogueinfo ON books.CatalogueInfoID = catalogueinfo.CatalogueInfoID 
    WHERE books.BookTitle LIKE ?
    LIMIT 150;
    `,
    [query + "%"]
  );
  ingestResults(tier1);

  // TIER 2: Broad Text matching (Word structurally buried in title, pushed second)
  const [tier2] = await pool.query(
    `
    SELECT books.* , catalogueinfo.ItemSubjects, catalogueinfo.ItemDescription, catalogueinfo.ItemPublisher 
    FROM books 
    INNER JOIN catalogueinfo ON books.CatalogueInfoID = catalogueinfo.CatalogueInfoID 
    WHERE books.BookTitle LIKE ?
    LIMIT 150;
    `,
    ["%" + query + "%"]
  );
  ingestResults(tier2);

  // TIER 3: Subject & Author Fallbacks (Extremely broad conceptual mapping, pushed last)
  const [tier3] = await pool.query(
    `
    SELECT books.* , catalogueinfo.ItemSubjects, catalogueinfo.ItemDescription, catalogueinfo.ItemPublisher 
    FROM books 
    INNER JOIN catalogueinfo ON books.CatalogueInfoID = catalogueinfo.CatalogueInfoID 
    WHERE catalogueinfo.ItemSubjects LIKE ? OR books.BookAuthor LIKE ?
    LIMIT 150;
    `,
    ["%" + query + "%", "%" + query + "%"]
  );
  ingestResults(tier3);

  // Safely chop off the massive tail so we don't mathematically overload the JSON payload!
  return combinedResults.slice(0, 150);
}
