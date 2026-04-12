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


export async function addNewFolder(id,folderName,parentID) {
  const [result] = await pool.query(
    `
    INSERT INTO Folders (UserID,FolderName,ParentID,FolderDate)
    VALUES (?,?,?,?);
    `,
    [id,folderName,parentID,new Date()],
  );
  const [newFolder] = await pool.query(
    `SELECT * FROM Folders WHERE FolderID = ?;`,
    [result.insertId]
  );
  return newFolder[0];
}
export async function addNewNote(id,noteTitle,noteContent,parentID) {
  const [result] = await pool.query(
    `
    INSERT INTO Notes (UserID,NoteTitle,NotesContent,FolderID,NoteDate)
    VALUES (?,?,?,?,?);
    `,
    [id,noteTitle,JSON.stringify(noteContent),parentID,new Date()],
  );
  const [newNote] = await pool.query(
    `SELECT * FROM Notes WHERE NoteID = ?;`,
    [result.insertId]
  );
  return newNote[0];
}
  
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
    
    export async function getSubFoldersbyParent(id, userId) {
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM Folders
        WHERE ParentID = ? AND UserID = ?;
        `,
        [id, userId],
      );
      return rows;
    }
    
    export async function getRootNotes(id) {
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM Notes
        WHERE FolderID IS NULL AND UserID = ?;
        `,
        [id],
      );
      return rows;
    }
    
    export async function getSubNotesByParent(id, userId) {
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM Notes
        WHERE FolderID = ? AND UserID = ?;
        `,
        [id, userId],
      );
      return rows;
}
    
export async function getNote(id, userId) {
  const [rows] = await pool.query(
    `
    SELECT * 
    FROM Notes
    WHERE NoteID = ? AND UserID = ?;
    `,
    [id, userId],
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

export async function updateNote(noteId, userId, noteTitle, noteContent) {
  const [rows] = await pool.query(
    `
    UPDATE Notes
    SET NoteTitle = ?, NotesContent = ?, NoteUpdatedAt = ?
    WHERE NoteID = ? AND UserID = ?;
    `,
    [noteTitle, JSON.stringify(noteContent), new Date(), noteId, userId],
  );
  return rows;
}

export async function updateFolder(folderId, userId, folderName) {
  const [rows] = await pool.query(
    `
    UPDATE Folders
    SET FolderName = ?
    WHERE FolderID = ? AND UserID = ?;
    `,
    [folderName, folderId, userId],
  );
  return rows;
}

export async function deleteNote(noteId, userId) {
  const [rows] = await pool.query(
    `
    DELETE FROM Notes
    WHERE NoteID = ? AND UserID = ?;
    `,
    [noteId, userId],
  );
  return rows;
}

export async function deleteFolder(folderId, userId) {
  const [rows] = await pool.query(
    `
    DELETE FROM Folders
    WHERE FolderID = ? AND UserID = ?;
    `,
    [folderId, userId],
  );
  return rows;
}