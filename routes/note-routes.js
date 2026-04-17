import express from "express";
import {
    getNotes, getNote,
    updateNote, updateFolder,
    deleteNote, deleteFolder, addNewNote,
    addNewFolder, getSubFoldersbyParent,
    getFolders, getRootFolders, getRootNotes, getSubNotesByParent,
    moveNote, moveFolder
} from "../database/note.js";

const router = express.Router();

router.get("/", async (request, response) => {
  const userId = request.session.user.userID;
  const notes = await getRootNotes(userId);
  response.send(notes);
  console.log(notes);
});

router.get("/folders", async (request, response) => {
    console.log("THE SESSION IS " + JSON.stringify(request.session));
  const id = request.session.user.userID;
  const folders = await getRootFolders(id);
  response.send(folders);
  console.log("FOLDERS IS "+JSON.stringify(folders));
});

router.get("/folders/:id", async (request, response) => {
  const id = request.params.id;
  const userId = request.session.user.userID;
  const folders = await getSubFoldersbyParent(id, userId);
  response.send(folders);
  console.log("SUB FOLDERS IS "+JSON.stringify(folders));
});

router.get("/folders/:id/files", async (request, response) => {
  const id = request.params.id;
  const userId = request.session.user.userID;
  const notes = await getSubNotesByParent(id, userId);
  response.send(notes);
  console.log("SUB Notes IS "+JSON.stringify(notes));
});
router.get("/:id", async (request, response) => {
  const id = request.params.id;
  const userId = request.session.user.userID;
  const note = await getNote(id, userId);
  response.send(note);
  console.log(note);
});

router.post("/", async (request, response) => {
  const parentId = request.body.parentID || null;
  try {
    const note = await addNewNote(request.session.user.userID, request.body.noteTitle, request.body.noteContent, parentId);
    response.send(note);
    console.log("THE NOTE IS " +JSON.stringify(note));
  } catch (error) {
    if (error.message === "Duplicate note title") {
      response.status(409).json({ error: "A note with this title already exists here." });
    } else {
      console.error(error);
      response.status(500).json({ error: "Failed to create note" });
    }
  }
});

router.post("/folders", async (request, response) => {
  const parentId = request.body.parentID || null;
  try {
    const folder = await addNewFolder(request.session.user.userID, request.body.folderName, parentId);
    response.send(folder);
    console.log(folder);
  } catch (error) {
    if (error.message === "Duplicate folder name") {
      response.status(409).json({ error: "A folder with this name already exists here." });
    } else {
      console.error(error);
      response.status(500).json({ error: "Failed to create folder" });
    }
  }
});

router.put("/:id", async (request, response) => {
  const noteId = request.params.id;
  const userId = request.session.user.userID;
  const  noteTitle  = request.body.title;
  const noteContent = request.body.content;

    console.log("THE NOTE ID IS " + noteId);
    console.log("THE USER ID IS " + userId);
    console.log("THE NOTE TITLE IS " + noteTitle);
    console.log("THE NOTE CONTENT IS " + noteContent);
    console.log("THIS REQUEST'S BODY IS : " + JSON.stringify(request.body));
  try {
    await updateNote(noteId, userId, noteTitle, noteContent);
    response.json({ success: true, message: "Note updated successfully" });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Failed to update note" });
  }
});

router.put("/folders/:id", async (request, response) => {
  const folderId = request.params.id;
  const userId = request.session.user.userID;
  const { folderName } = request.body;

  try {
    await updateFolder(folderId, userId, folderName);
    response.json({ success: true, message: "Folder updated successfully" });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Failed to update folder" });
  }
});

router.delete("/:id", async (request, response) => {
  const noteId = request.params.id;
  const userId = request.session.user.userID;

  try {
    await deleteNote(noteId, userId);
    response.json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Failed to delete note" });
  }
});

router.delete("/folders/:id", async (request, response) => {
  const folderId = request.params.id;
  const userId = request.session.user.userID;

  try {
    await deleteFolder(folderId, userId);
    response.json({ success: true, message: "Folder deleted successfully" });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Failed to delete folder" });
  }
});

router.put("/:id/move", async (request, response) => {
  const noteId = request.params.id;
  const userId = request.session.user.userID;
  // If the frontend explicitly sends null or undefined, this strictly defaults to null (ROOT directory map!)
  const newFolderId = request.body.folderId || null;

  try {
    await moveNote(noteId, userId, newFolderId);
    response.json({ success: true, message: "Note moved successfully" });
  } catch (error) {
    if (error.message === "Duplicate note title") {
      response.status(409).json({ error: "A note with this title already exists in the destination." });
    } else {
      console.error(error);
      response.status(500).json({ error: "Failed to move note" });
    }
  }
});

router.put("/folders/:id/move", async (request, response) => {
  const folderId = request.params.id;
  const userId = request.session.user.userID;
  const newParentId = request.body.parentId || request.body.folderId || null;

  try {
    await moveFolder(folderId, userId, newParentId);
    response.json({ success: true, message: "Folder moved successfully" });
  } catch (error) {
    if (error.message === "Duplicate folder name") {
      response.status(409).json({ error: "A folder with this name already exists in the destination." });
    } else if (error.message === "Cannot move a folder into itself.") {
      response.status(400).json({ error: error.message });
    } else {
      console.error(error);
      response.status(500).json({ error: "Failed to move folder" });
    }
  }
});

export default router;
