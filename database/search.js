import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();
export const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

export async function Search5BooksByTitle(title) {
  console.log("the title is: " + title);
  const [rows] = await pool.query(
    `
    SELECT BookTitle
    FROM Books
    WHERE BookTitle LIKE ?
    LIMIT 5;
    `,
    [title + "%"],
  );
  return rows;
}

export async function SearchBooksByTitle(title) {
  console.log("the title is: " + title);
  const [rows] = await pool.query(
    `
    SELECT Books.* , CatalogueInfo.ItemSubjects, CatalogueInfo.ItemDescription,CatalogueInfo.ItemPublisher 
    FROM Books 
    INNER JOIN CatalogueInfo
    ON Books.CatalogueInfoID = CatalogueInfo.CatalogueInfoID AND Books.BookTitle LIKE ?
    `,
    [title + "%"],
  );
  return rows;
}
