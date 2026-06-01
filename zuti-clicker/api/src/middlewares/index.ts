import express from "express";
import { merge } from "lodash";
import { getUserBySessionToken } from "../helpers/auth";

export const isAuthenticated = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const sessionToken: string | undefined = req.cookies["AUTH_TOKEN"];

    if (!sessionToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const authRecord = await getUserBySessionToken(sessionToken);

    if (!authRecord) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    merge(req, { identity: authRecord.user });
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
