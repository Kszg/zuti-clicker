import express from "express";
import { random, authentication } from "../helpers/index";
import {
  getUserByEmail,
  getUserByUsername,
  createUser,
  updateSessionToken
} from "../database/models/user";
import { Responses } from "../constants/responses";

export const register = async (req: express.Request, res: express.Response) => {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      const r = Responses.AUTH.MISSING_REGISTER_FIELDS;
      res.status(r.status).json(r.body);
      return;
    }

    const [existingEmail, existingUsername] = await Promise.all([
      getUserByEmail(email),
      getUserByUsername(username)
    ]);

    if (existingEmail) {
      const r = Responses.AUTH.EMAIL_EXISTS;
      res.status(r.status).json(r.body);
      return;
    }

    if (existingUsername) {
      const r = Responses.AUTH.USERNAME_EXISTS;
      res.status(r.status).json(r.body);
      return;
    }

    const salt = random();
    const hashedPassword = authentication(salt, password);

    const user = await createUser({ username, email, password: hashedPassword, salt });

    const r = Responses.AUTH.REGISTER_SUCCESS;
    res.status(r.status).json({ ...r.body, userId: user.id });
  } catch (error) {
    console.error("Register error:", error);
    const r = Responses.AUTH.INTERNAL_ERROR;
    res.status(r.status).json(r.body);
  }
};

export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      const r = Responses.AUTH.MISSING_LOGIN_FIELDS;
      res.status(r.status).json(r.body);
      return;
    }

    const user = await getUserByEmail(email);

    if (!user || !user.authentication) {
      const r = Responses.AUTH.INVALID_CREDENTIALS;
      res.status(r.status).json(r.body);
      return;
    }

    const expectedHash = authentication(user.authentication.salt, password);
    if (user.authentication.password !== expectedHash) {
      const r = Responses.AUTH.INVALID_CREDENTIALS;
      res.status(r.status).json(r.body);
      return;
    }

    const sessionSalt = random();
    const sessionToken = authentication(sessionSalt, user.id.toString());

    await updateSessionToken(user.id, sessionToken);

    res.cookie("AUTH_TOKEN", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    });

    const r = Responses.AUTH.LOGIN_SUCCESS;
    res.status(r.status).json(r.body);
  } catch (error) {
    console.error("Login error:", error);
    const r = Responses.AUTH.INTERNAL_ERROR;
    res.status(r.status).json(r.body);
  }
};
