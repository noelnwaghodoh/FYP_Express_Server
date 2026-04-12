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

export async function getUsers() {
  const [rows] = await pool.query("SELECT * FROM Users;");
  return rows;
}

export async function getUser(id) {
  const [rows] = await pool.query(
    `
    SELECT * 
    FROM Users
    WHERE UserID = ?;
    `,
    [id],
  );
  return rows[0];
}


export async function getBook(id) {
  const [rows] = await pool.query(
    `
    SELECT * 
    FROM Catalogue
    WHERE BookID = ?;
    `,
    [id],
  );
  return rows[0];
}

export async function addBook(values) {
  console.log(values);
  const [result] = await pool.query(
    `
      INSERT into Catalogue (BookTitle,BookSubjects,BookPublisher,BookIdentifier,BookEdition,BookDate,BookContributors,BookAuthor,BookFileName)
      Values(?,?,?,?,?,?,?,?,?)
    `,
    [
      values.bookTitle,
      values.bookSubjects,
      values.bookPublisher,
      values.bookIdentifier,
      values.bookEdition,
      values.bookReleaseDate,
      values.bookContributors,
      values.bookAuthor,
      values.bookFileName,
    ],
  );
  const id = [result.insertId];

  return getBook(id);
}

export async function login(email, password) {
  console.log(email + " " + password);
  const [rows] = await pool.query(
    `
    SELECT * 
    FROM Users
    WHERE UserEmail = ? and UserPassword =?;
    `,
    [email, password],
  );
  return rows;
}
