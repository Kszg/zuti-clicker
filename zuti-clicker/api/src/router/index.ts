import express from "express";
import { register, login } from "../controllers/auth.js";

const router: express.Router = express.Router();

export default (): express.Router => {
  router.post("/register", register);
  router.post("/login", login);

  return router;
};
