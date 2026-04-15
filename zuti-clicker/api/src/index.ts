import express from "express";
import http from "http";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const corsOriginUrls: string[] = process.env.CORS_ORIGIN_URLS.split(",");
const corsOptions: cors.CorsOptions = {
  origin: corsOriginUrls,
  credentials: true
};
