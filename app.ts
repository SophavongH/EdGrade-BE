import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import classroomRoutes from "./routes/classroom"; 
import studentRoutes from "./routes/student";
import { authenticateJWT } from "./routes/auth";
import reportCardRouter from "./routes/reportCard";
import publicReportRoutes from "./routes/publicReport";
import adminRoutes from "./routes/admin";
import userSubjectsRouter from "./routes/userSubjects";
import userRouter from "./routes/user";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://edgrade.vercel.app",
  "https://edgrade-ofs-pthglu-sophavonghs-projects.vercel.app",
  "https://edgrade-git-main-sophavonghs-projects.vercel.app",
  "https://www.edgrade.me",
  "https://edgrade.me"
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    console.log("CORS Origin:", origin); // <-- Add this line
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^https:\/\/.*\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // <-- Ensure this uses the same options

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(cookieParser());

// Public routes (no JWT)
app.use("/api", publicReportRoutes);

// Auth routes (no JWT)
app.use("/api/auth", authRoutes);

// Protected routes (require JWT)
app.use("/api/classrooms", authenticateJWT, classroomRoutes);
app.use("/api/students", authenticateJWT, studentRoutes);
app.use("/api/report-cards", authenticateJWT, reportCardRouter);
app.use("/api/admin", authenticateJWT, adminRoutes);
app.use("/api/user-subjects", authenticateJWT, userSubjectsRouter);
app.use("/api/user", authenticateJWT, userRouter);

export default app;
