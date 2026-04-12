import express, { request } from "express";
import data from "./data/mock.json" with { type: "json" };
import cors from "cors";
import { getUsers, getUser, login } from "./database/database.js";
import { pool } from "./database/database.js";
import req from "express/lib/request.js";
import { S3 } from "@aws-sdk/client-s3";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { addBook } from "./database/database.js";
import {
  addNewBook,
  getCatalogueInfo,
  getfullBookInfo,
  addBookWithCatalogueTransaction
} from "./database/book.js";
import { addNewCatalogueInfo } from "./database/book.js";
import { addBookID } from "./database/book.js";
import { Search5BooksByTitle, SearchBooksByTitle } from "./database/search.js";
import { generateThumbnail } from "./s3.js";
import {generateCatalogueUploadURL,generateCatalogueDownloadURL} from "./s3.js";
//import res from "express/lib/response";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";

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

const MySQLStore = MySQLStoreFactory(session);
const options = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};
const sessionStore = new MySQLStore(options);

sessionStore.onReady().then(() => {
    console.log("Session store ready and table created!");
}).catch(err => {
    console.error("Session store failed to create table:", err);
});



app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat', // Don't forget to change this later!
  store: sessionStore, // Force session saving to the database
  resave: false,
  saveUninitialized: false, // Changed to false to avoid bloat from empty sessions
  cookie: { 
      secure: false // Since you are on localhost (HTTP) this must be false, otherwise cookies won't save
  }
}));
let x = null;

app.get("/users", async (request, response) => {
  const users = await getUsers();
  response.send(users);
  console.log(users);
  // res.json();
});

app.get("/me", async (req, res) => {

  if (!req.session || !req.session.isLoggedIn) {
    return res.status(401).json({ error: "Unauthorized: You must be logged access this page." });
  }

  console.log("the session is: " + JSON.stringify(req.session));
  const user = await getUser(req.session.user.userID);
  res.send(user);
  console.log(user);
});

app.post("/catalogue", async (req, res) => {
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

app.get("/catalogue", async (req, res) => {
  console.log("the  from catalog eget tour title is: " + JSON.stringify(req.query));
  const title = req.query.searchText ; 
  const books = await SearchBooksByTitle(title);
  res.send(books);
  console.log(books);
});
app.get("/catalogue/id", async (req, res) => {
  console.log("the  from catalog the book with our idis: " + JSON.stringify(req.query));
  const id = req.query.bookID ; 
  const books = await getfullBookInfo(id);
  res.send(books);
  console.log(books);
});

app.put("/uploadcomplete", async (req, res) => {
  console.log("The request.body.filekey is " + req.body.fileKey);

  const fileName = req.body.fileKey;
  generateThumbnail(fileName);

  try {
    res.json("Hello");
  } catch (err) {
    console.error(err);
  }
});

async function generateUploadURL(fileName, fileType) {
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

  const signedUrl = await generateCatalogueUploadURL(fileName, fileType);

  res.json({ url: signedUrl });
});
app.get("/catalogue/signed-url", async (req, res) => {

    const fileName  = req.query.fileName;
  const signedUrl = await generateCatalogueDownloadURL(fileName);
  res.json({ url: signedUrl });
  console.log(signedUrl);
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
  
 
  if (user.length>0) {

     const finalUser = {
    usertype: user[0].UserTypeID,
    userID: user[0].UserID,
    userFirstName: user[0].UserFirstName,
    userLastName: user[0].UserLastName,
    userEmail: user[0].UserEmail
  }
    // Setting session data directly instead of setting manual cookies
    request.session.isLoggedIn = true;
    request.session.user = finalUser;

    response.json({ Login: true, user:finalUser });
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
