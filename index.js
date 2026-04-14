import express, { request } from "express";
import data from "./data/mock.json" with { type: "json" };
import cors from "cors";
import userRoutes from "./routes/user-routes.js";
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
} from "./database/book.js";
import { addNewCatalogueInfo } from "./database/book.js";
import { addBookID } from "./database/book.js";
import bookRoutes from "./routes/book-routes.js";
import noteRoutes from "./routes/note-routes.js";
import { generateThumbnail } from "./s3.js";

import catalogueRoutes from "./routes/catalogue-routes.js";
//import res from "express/lib/response";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";

const app = express();


app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const MySQLStore = MySQLStoreFactory(session);
const options = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT,
    ssl: { rejectUnauthorized: false }
}; 
const sessionStore = new MySQLStore(options);

sessionStore.onReady().then(() => {
    console.log("Session store ready and table created!");
}).catch(err => {
    console.error("Session store failed to create table:", err);
});


 
app.use(cors({
  origin: "https://fyp-library-app-537xi.ondigitalocean.app", // NO trailing slash!
  credentials: true 
}));
app.set("trust proxy", 1); 


app.use(session({
  secret: process.env.SESSION_SECRET , // Don't forget to change this later!
  store: sessionStore, // Force session saving to the database
  resave: false,
  saveUninitialized: false, // Changed to false to avoid bloat from empty sessions
 cookie: {
    secure: true,         // MUST BE TRUE in production
    sameSite: "none",     // MAGIC WORD for cross-domain cookies
    maxAge: 1000 * 60 * 60 * 24
  }
}));
let x = null;

app.use("/", userRoutes);

app.use("/catalogue", catalogueRoutes);

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


app.use("/books", bookRoutes);
app.use("/notes", noteRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/edit", (request, response) => {
  response.send("This is PUT request at /edit");
});
app.post("/delete", (request, response) => {
  response.send("This is DELETE request at /delte");
});
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`The server is running on port ${PORT}`);
  //console.log(data);
});
