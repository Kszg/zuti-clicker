import express from "express";
import { claimBoosterHandler } from "../controllers/boosters";
import { isAuthenticated } from "../middlewares/index";

export default (router: express.Router) => {
  router.post("/boosters/claim", isAuthenticated, claimBoosterHandler);
};
