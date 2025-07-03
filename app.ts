import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import classroomRoutes from "./routes/classroom"; 
import studentRoutes from "./routes/student";
import { authenticateJWT } from "./routes/auth";
import reportCardsRoutes from "./routes/reportCard";
import publicReportRoutes from "./routes/publicReport";
import adminRoutes from "./routes/admin";
import userSubjectsRouter from "./routes/userSubjects";

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://edgrade.vercel.app",
  "https://edgrade-ofs-pthglu-sophavonghs-projects.vercel.app",
  "https://edgrade-git-main-sophavonghs-projects.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true, // if you use cookies/auth
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Public routes (no JWT)
app.use("/api", publicReportRoutes);

// Auth routes (no JWT)
app.use("/api/auth", authRoutes);


// Protected routes (require JWT)
app.use("/api/classrooms", authenticateJWT, classroomRoutes);
app.use("/api/students", authenticateJWT, studentRoutes);
app.use("/api/report-cards", authenticateJWT, reportCardsRoutes);
app.use("/api/admin", authenticateJWT, adminRoutes);
app.use("/api/user-subjects", authenticateJWT, userSubjectsRouter);

export default app;
