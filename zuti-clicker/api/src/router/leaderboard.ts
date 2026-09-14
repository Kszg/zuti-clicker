import express from "express";
import { getLeaderboard } from "../controllers/leaderboard";
import { isAuthenticated } from "../middlewares/index";

export default (router: express.Router) => {
  router.get("/leaderboard", isAuthenticated, getLeaderboard);
};
