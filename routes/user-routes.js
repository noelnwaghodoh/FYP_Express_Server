import express from "express";
import { getUsers, getUser, login } from "../database/database.js";

const router = express.Router();

router.get("/users", async (request, response) => {
  const users = await getUsers();
  response.send(users);
  console.log(users);
});

router.get("/me", async (req, res) => {
  if (!req.session || !req.session.isLoggedIn) {
    return res.status(401).json({ error: "Unauthorized: You must be logged access this page." });
  }

  console.log("the session is: " + JSON.stringify(req.session));
  const user = await getUser(req.session.user.userID);
  res.send(user);
  console.log(user);
});

router.post("/login", async (request, response) => {
  console.log("the request works");
  const user = await login(request.body.email, request.body.password);
  console.log(user);
  
  if (user.length > 0) {
    const finalUser = {
      usertype: user[0].UserTypeID,
      userID: user[0].UserID,
      userFirstName: user[0].UserFirstName,
      userLastName: user[0].UserLastName,
      userEmail: user[0].UserEmail
    }
    
    // Setting session data directly
    request.session.isLoggedIn = true;
    request.session.user = finalUser;

    response.json({ Login: true, user: finalUser });
  } else {
    response.json({ Login: false });
  }
});

export default router;
