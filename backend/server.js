// Deployment Check
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from "./routes/auth.js";
import formRoutes from "./routes/forms.js";
import publicRoutes from "./routes/public.js";
import connectDB from "./config/db.js";

dotenv.config();

// Connect to Database
connectDB();

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,      
  "http://localhost:5173",
  "https://form-frontend-nine.vercel.app" // Add your vercel domain here if known, else CLIENT_URL handles it
];

app.use(cors({
  origin: function (origin, callback) {
    // allow Postman / server-to-server calls (no origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  }
}));

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/public", publicRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
