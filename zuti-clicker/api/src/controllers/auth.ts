import express from "express";
import { random, authentication } from "../helpers/index.js";
import {
  getUserByEmail,
  getUserByUsername,
  createUser,
  updateSessionToken
} from "../helpers/auth.js";

export const register = async (req: express.Request, res: express.Response) => {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      res.status(400).json({ error: "username, email, and password are required" });
      return;
    }

    const [existingEmail, existingUsername] = await Promise.all([
      getUserByEmail(email),
      getUserByUsername(username)
    ]);

    if (existingEmail) {
      res.status(409).json({ error: "A user with that email already exists" });
      return;
    }

    if (existingUsername) {
      res.status(409).json({ error: "A user with that username already exists" });
      return;
    }

    const salt = random();
    const hashedPassword = authentication(salt, password);

    const user = await createUser({ username, email, password: hashedPassword, salt });

    res.status(201).json({ message: "User registered successfully", userId: user.id });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = await getUserByEmail(email);

    if (!user || !user.authentication) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const expectedHash = authentication(user.authentication.salt, password);
    if (user.authentication.password !== expectedHash) {
      res.status(401).json({ error: "Invalid credentials" });
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

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
