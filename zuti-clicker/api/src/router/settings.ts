import express from "express";
import { loadSettings, storeSettings } from "../controllers/settings";
import { isAuthenticated } from "../middlewares/index";

export default (router: express.Router) => {
  router.get("/settings", isAuthenticated, loadSettings);
  router.put("/settings", isAuthenticated, storeSettings);
};
