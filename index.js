import express, { request } from "express";
import data from "./data/mock.json" with { type: "json" };
import cors from "cors";
import { getUsers, getUser, login } from "./database/database.js";
import { pool } from "./database/database.js";
import req from "express/lib/request.js";
import { S3 } from "@aws-sdk/client-s3";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { addBook } from "./database/database.js";
import {
  addNewBook,
  getCatalogueInfo,
  getfullBookInfo,
} from "./database/book.js";
import { addNewCatalogueInfo } from "./database/book.js";
import { addBookID } from "./database/book.js";
import { Search5BooksByTitle, SearchBooksByTitle } from "./database/search.js";
//import res from "express/lib/response";

const app = express();

/*const s3Client = new S3({
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    endpoint: "https://cataloguefiles.lon1.digitaloceanspaces.com",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET
    }
});*/

/*const signS3URL = async (req, res, next) => {
    const { fileName, fileType } = req.query;
    const s3Params = {
        Bucket: process.env.S3_BUCKET,
        Key: fileName,
        ContentType: fileType,
        // ACL: 'bucket-owner-full-control'
    };
    const s3 = new S3({
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    endpoint: "https://cataloguefiles.lon1.digitaloceanspaces.com",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET
    }
});
    const command = new PutObjectCommand(s3Params);

    try {
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
        console.log(signedUrl);
        res.json({ signedUrl })
    } catch (err) {
        console.error(err);
        next(err);
    }
}*/

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

let x = null;

app.get("/users", async (request, response) => {
  const users = await getUsers();
  response.send(users);
  console.log(users);
  // res.json();
});

app.post("/catalogue", async (req, res) => {
  const newBook = addNewBook(req.body);

  const catalogueInfo = {
    itemSubjects: req.body.bookSubjects,
    itemDescription: req.body.bookDescription,
    itemPublisher: req.body.bookPublisher,
  };

  const newCatalogueInfo = await addNewCatalogueInfo(catalogueInfo);
  const r2 = await addBookID(newCatalogueInfo, newCatalogueInfo);
  const r1 = await getCatalogueInfo(newCatalogueInfo);

  console.log("r2 is:" + r2);
  console.log("r1 is: " + r1);
  const finalres = await getfullBookInfo(newCatalogueInfo);
  console.log("the final response is: " + JSON.stringify(finalres));
  res.send(finalres);
});

app.put("/upload-complete", async (req, res) => {
  console.log("The request.body.filekey is " + req.body.fileKey);

  try {
    res.json("Hello");
  } catch (err) {
    console.error(err);
  }
});

async function generateSignedURL(fileName, fileType) {
  const s3Params = {
    Bucket: "cataloguefiles",
    Key: fileName,
    ContentType: fileType,
    // ACL: 'bucket-owner-full-control'
  };
  const s3 = new S3Client({
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    endpoint: "https://lon1.digitaloceanspaces.com",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET,
    },
  });
  const command = new PutObjectCommand(s3Params);

  try {
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return signedUrl;
  } catch (err) {
    console.error(err);
  }
}
app.get("/upload", async (req, res) => {
  console.log("pong");
  console.log("this is " + req.query.fileName);
  const { fileName, fileType } = req.query;
  console.log("file name and file type are" + fileType);

  generateSignedURL(fileName, fileType);

  const s3Params = {
    Bucket: "cataloguefiles",
    Key: fileName,
    ContentType: fileType,
    // ACL: 'bucket-owner-full-control'
  };
  const s3 = new S3Client({
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    endpoint: "https://lon1.digitaloceanspaces.com",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET,
    },
  });
  const command = new PutObjectCommand(s3Params);

  try {
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    console.log(signedUrl);
    res.json({ signedUrl });
  } catch (err) {
    console.error(err);
  }
});

app.get("/users/:id", async (request, response) => {
  const id = request.params.id;
  const note = await getNote(id);
  response.send(note);
  // console.log(result);
  // res.json();
});

app.get("/books/", async (request, response) => {
  const search = request.query.searchText;
  console.log(request.query);
  const note = await Search5BooksByTitle(search);
  console.log("THE NOTE IS " + note);
  response.json(note);
  // console.log(result);
  // res.json();
});
app.get("/books/search", async (request, response) => {
  const search = request.query.searchText;
  console.log(request.query);
  const note = await SearchBooksByTitle(search);
  console.log("THE NOTE IS " + note);
  response.json(note);
  // console.log(result);
  // res.json();
});

app.post("/login", async (request, response) => {
  console.log("the request works");
  const sql = "SELECT *FROM users WHERE UserEmail = ? and UserPassword =?";
  /* pool.query(sql, ["k1234567@kingston.ac.uk", "1234567"], (err, result) => {
    console.log("the query runs ");
    if (err) return response.json({ Message: "Error inside server" });
    if (result.length > 0) {
      return response.json({ Login: true, usertype: result[0].UserTypeID });
    } else {
      return response.json({ Login: false });
    }
  });*/
  const user = await login(request.body.email, request.body.password);
  console.log(user);
  if (user) {
    response.json({ Login: true, usertype: user[0].UserTypeID });
  } else {
    response.json({ Login: false });
  }
});

app.post("/edit", (request, response) => {
  response.send("This is PUT request at /edit");
});
app.post("/delete", (request, response) => {
  response.send("This is DELETE request at /delte");
});
const PORT = 8080;

app.listen(PORT, () => {
  console.log(`The server is runnig on port ${PORT}`);
  //console.log(data);
});
