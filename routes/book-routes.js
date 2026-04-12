import express from "express";
import { Search5BooksByTitle, SearchBooksByTitle } from "../database/search.js";

const router = express.Router();

router.get("/", async (request, response) => {
  const search = request.query.searchText;
  console.log(request.query);
  const note = await Search5BooksByTitle(search);
  console.log("THE NOTE IS " + note);
  response.json(note);
});

router.get("/search", async (request, response) => {
  const search = request.query.searchText;
  console.log(request.query);
  const note = await SearchBooksByTitle(search);
  console.log("THE NOTE IS " + note);
  response.json(note);
});

export default router;
