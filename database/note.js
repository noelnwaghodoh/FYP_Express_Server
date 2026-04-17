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


export async function addNewFolder(id,folderName,parentID) {
  const [existing] = await pool.query(
    `SELECT FolderID FROM folders WHERE UserID = ? AND FolderName = ? AND ParentID <=> ?;`,
    [id, folderName, parentID]
  );
  if (existing.length > 0) {
    throw new Error("Duplicate folder name");
  }

  const [result] = await pool.query(
    `
    INSERT INTO folders (UserID,FolderName,ParentID,FolderDate)
    VALUES (?,?,?,?);
    `,
    [id,folderName,parentID,new Date()],
  );
  const [newFolder] = await pool.query(
    `SELECT * FROM folders WHERE FolderID = ?;`,
    [result.insertId]
  );
  return newFolder[0];
}
export async function addNewNote(id,noteTitle,noteContent,parentID) {
  const [existing] = await pool.query(
    `SELECT NoteID FROM notes WHERE UserID = ? AND NoteTitle = ? AND FolderID <=> ?;`,
    [id, noteTitle, parentID]
  );
  if (existing.length > 0) {
    throw new Error("Duplicate note title");
  }

  const [result] = await pool.query(
    `
    INSERT INTO notes (UserID,NoteTitle,NotesContent,FolderID,NoteDate)
    VALUES (?,?,?,?,?);
    `,
    [id,noteTitle,JSON.stringify(noteContent),parentID,new Date()],
  );
  const [newNote] = await pool.query(
    `SELECT * FROM notes WHERE NoteID = ?;`,
    [result.insertId]
  );
  return newNote[0];
}
  
    export async function getFolders(id) {
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM folders
        WHERE UserID = ?;
        `,
        [id],
      );
      return rows;
    }
    
export async function getRootFolders(id) {
        console.log("ID IS " + id);
      const [rows] = await pool.query(
        `
        SELECT * 
        FROM folders
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
        FROM folders
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
        FROM notes
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
        FROM notes
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
    FROM notes
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
        FROM notes
        WHERE UserID = ?;
        `,
        [id],
      );
      return rows;
    }

export async function updateNote(noteId, userId, noteTitle, noteContent) {
  const [rows] = await pool.query(
    `
    UPDATE notes
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
    UPDATE folders
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
    DELETE FROM notes
    WHERE NoteID = ? AND UserID = ?;
    `,
    [noteId, userId],
  );
  return rows;
}

export async function deleteFolder(folderId, userId) {
  const [rows] = await pool.query(
    `
    DELETE FROM folders
    WHERE FolderID = ? AND UserID = ?;
    `,
    [folderId, userId],
  );
  return rows;
}

export async function moveNote(noteId, userId, newFolderId) {
  // Check duplicate titles natively in the destination folder
  const [existing] = await pool.query(
    `SELECT NoteTitle FROM notes WHERE NoteID = ? AND UserID = ?;`,
    [noteId, userId]
  );
  if (existing.length === 0) throw new Error("Note not found.");
  const noteTitle = existing[0].NoteTitle;

  const [duplicates] = await pool.query(
    `SELECT NoteID FROM notes WHERE UserID = ? AND NoteTitle = ? AND FolderID <=> ? AND NoteID != ?;`,
    [userId, noteTitle, newFolderId, noteId]
  );
  
  if (duplicates.length > 0) {
    throw new Error("Duplicate note title");
  }

  const [rows] = await pool.query(
    `
    UPDATE notes
    SET FolderID = ?
    WHERE NoteID = ? AND UserID = ?;
    `,
    [newFolderId, noteId, userId],
  );
  return rows;
}

export async function moveFolder(folderId, userId, newParentId) {
  // Prevent infinite loops safely
  if (String(folderId) === String(newParentId)) throw new Error("Cannot move a folder into itself.");

  // For robust safety, we meticulously check duplicate names in the destination prior to moving
  const [existing] = await pool.query(
    `SELECT FolderName FROM folders WHERE FolderID = ? AND UserID = ?;`,
    [folderId, userId]
  );
  if (existing.length === 0) throw new Error("Folder not found.");
  const folderName = existing[0].FolderName;

  const [duplicates] = await pool.query(
    `SELECT FolderID FROM folders WHERE UserID = ? AND FolderName = ? AND ParentID <=> ? AND FolderID != ?;`,
    [userId, folderName, newParentId, folderId]
  );
  
  if (duplicates.length > 0) {
    throw new Error("Duplicate folder name");
  }

  const [rows] = await pool.query(
    `
    UPDATE folders
    SET ParentID = ?
    WHERE FolderID = ? AND UserID = ?;
    `,
    [newParentId, folderId, userId],
  );
  return rows;
}