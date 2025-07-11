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
  "https://edgrade-git-main-sophavonghs-projects.vercel.app",
  "https://www.edgrade.me"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Allow all vercel.app subdomains
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
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());

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
