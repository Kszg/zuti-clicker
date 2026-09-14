import express from "express";

import authentication from "./authentication";
import save from "./save";
import settings from "./settings";
import leaderboard from "./leaderboard";

const router = express.Router();

export default (): express.Router => {
  authentication(router);
  save(router);
  settings(router);
  leaderboard(router);

  return router;
};
