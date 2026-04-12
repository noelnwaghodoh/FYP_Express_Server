import express from "express";
import { getfullBookInfo, addBookWithCatalogueTransaction } from "../database/book.js";
import { SearchBooksByTitle } from "../database/search.js";
import { generateCatalogueUploadURL, generateCatalogueDownloadURL } from "../s3.js";

const router = express.Router();

router.post("/", async (req, res) => {
  // Protect the route using the session
  if (!req.session || !req.session.isLoggedIn) {
    return res.status(401).json({ error: "Unauthorized: You must be logged in to upload to the catalogue." });
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

export default router;
