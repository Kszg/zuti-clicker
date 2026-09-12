import express from "express";

import authentication from "./authentication";
import save from "./save";
import settings from "./settings";

const router = express.Router();

export default (): express.Router => {
  authentication(router);
  save(router);
  settings(router);

  return router;
};
