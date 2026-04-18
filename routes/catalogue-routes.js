import express from "express";
import { getfullBookInfo, addBookWithCatalogueTransaction, deleteBookAndCatalogue, updateBookAndCatalogueTransaction, getBooksBySubject, getAllUniqueSubjects } from "../database/book.js";
import { SearchBooksByTitle } from "../database/search.js";
import { generateCatalogueUploadURL, generateCatalogueDownloadURL, deleteCatalogueFile, deleteThumbnailFile } from "../s3.js";

function isValidISBN(isbn) {
  if (!isbn) return false;
  const cleanISBN = isbn.toString().replace(/[- ]/g, "").trim();
  return /^(\d{10}|\d{13})$/.test(cleanISBN);
}

const router = express.Router();

router.post("/", async (req, res) => {
  // Protect the route using the session
  if (!req.session || !req.session.isLoggedIn) {
    return res.status(401).json({ error: "Unauthorized: You must be logged in to upload to the catalogue." });
  }

  if (req.body.bookISBN && !isValidISBN(req.body.bookISBN)) {
    return res.status(400).json({ error: "Invalid ISBN format. Must be exactly 10 or 13 digits." });
  }

  const catalogueInfo = {
    itemSubjects: req.body.bookSubjects,
    itemDescription: req.body.bookDescription,
    itemPublisher: req.body.bookPublisher,
  };

  try {
    // We now insert both the Catalogue Info and the Book atomically via transaction
    const bookId = await addBookWithCatalogueTransaction(req.body, catalogueInfo);

    const finalres = await getfullBookInfo(bookId);
    console.log("the final response is: " + JSON.stringify(finalres));
    res.send(finalres);
  } catch (err) {
    console.error("Failed to upload catalogue using transaction:", err);
    res.status(500).send({ error: "Failed to create catalogue entry" });
  }
});

router.get("/", async (req, res) => {
  console.log("the  from catalog eget tour title is: " + JSON.stringify(req.query));
  const title = req.query.searchText ; 
  const books = await SearchBooksByTitle(title);
  res.send(books);
  console.log(books);
});

router.get("/id", async (req, res) => {
  console.log("the  from catalog the book with our idis: " + JSON.stringify(req.query));
  const id = req.query.bookID ; 
  const books = await getfullBookInfo(id);
  res.send(books);
  console.log(books);
});

router.get("/subjects/all", async (req, res) => {
  try {
    const subjects = await getAllUniqueSubjects();
    res.json(subjects);
  } catch (error) {
    console.error("Failed to load unique subjects:", error);
    res.status(500).json({ error: "Failed to load subjects" });
  }
});

router.get("/subjects/:subjectName", async (req, res) => {
  try {
    const subject = req.params.subjectName;
    const books = await getBooksBySubject(subject);
    res.json(books);
  } catch (error) {
    console.error(`Failed to load books for subject ${req.params.subjectName}:`, error);
    res.status(500).json({ error: "Failed to load books by subject" });
  }
});

router.get("/upload", async (req, res) => {
  console.log("pong");
  console.log("this is " + req.query.fileName);
  const { fileName, fileType } = req.query;
  console.log("file name and file type are" + fileType);

  const signedUrl = await generateCatalogueUploadURL(fileName, fileType);

  res.json({ url: signedUrl });
});

router.get("/signed-url", async (req, res) => {
  const fileName  = req.query.fileName;
  const signedUrl = await generateCatalogueDownloadURL(fileName);
  res.json({ url: signedUrl });
  console.log(signedUrl);
});

router.delete("/:id", async (req, res) => {
  const bookId = req.params.id;

  console.log("the book id is: " + bookId);
  try {
    const book = await getfullBookInfo(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    // Delete files from S3 if the book references a file
    if (book.BookFileName) {
      await deleteCatalogueFile(book.BookFileName).catch(err => console.error(err));
      await deleteThumbnailFile(book.BookFileName).catch(err => console.error(err));
    }

    // Delete DB entries
    await deleteBookAndCatalogue(bookId);

    res.json({ success: true, message: "Book and related files deleted successfully." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete the book." });
  }
});

router.put("/:id", async (req, res) => {
  const bookId = req.params.id;

  if (!req.session || !req.session.isLoggedIn) {
    return res.status(401).json({ error: "Unauthorized: You must be logged in to modify the catalogue." });
  }

  if (req.body.bookISBN && !isValidISBN(req.body.bookISBN)) {
    return res.status(400).json({ error: "Invalid ISBN format. Must be exactly 10 or 13 digits." });
  }

  const catalogueInfo = {
    itemSubjects: req.body.bookSubjects,
    itemDescription: req.body.bookDescription,
    itemPublisher: req.body.bookPublisher,
  };

  try {
    const updatedBookId = await updateBookAndCatalogueTransaction(bookId, req.body, catalogueInfo);
    
    const finalres = await getfullBookInfo(updatedBookId);
    console.log("the final PUT response is: " + JSON.stringify(finalres));
    res.json(finalres);
  } catch (err) {
    console.error("Failed to update catalogue using transaction:", err);
    res.status(500).json({ error: "Failed to update catalogue entry" });
  }
});

export default router;
