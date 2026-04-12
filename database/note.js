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
  
    export async function getFolders(id) {
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM Folders
        WHERE UserID = ?;
        `,
        [id],
      );
      return rows;
    }
    
    export async function getRootFolders(id) {
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM Folders
        WHERE ParentID IS NULL AND UserID = ?;
        `,
        [id],
      );
      return rows;
    }
    
    export async function getSubFoldersbyParent(id) {
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM Folders
        WHERE ParentID = ?;
        `,
        [id],
      );
      return rows;
    }
    
    export async function getRootNotes(id) {
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM Notes
        WHERE ParentID IS NULL AND UserID = ?;
        `,
        [id],
      );
      return rows;
    }
    
    export async function getSubNotesByParent(id) {
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM Notes
        WHERE ParentID = ?;
        `,
        [id],
      );
      return rows;
    }
    
    export async function getNotes(id) {
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM Notes
        WHERE UserID = ?;
        `,
        [id],
      );
      return rows;
    }
    