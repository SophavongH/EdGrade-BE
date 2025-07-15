"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const classroom_1 = __importDefault(require("./routes/classroom"));
const student_1 = __importDefault(require("./routes/student"));
const auth_2 = require("./routes/auth");
const reportCard_1 = __importDefault(require("./routes/reportCard"));
const publicReport_1 = __importDefault(require("./routes/publicReport"));
const admin_1 = __importDefault(require("./routes/admin"));
const userSubjects_1 = __importDefault(require("./routes/userSubjects"));
const user_1 = __importDefault(require("./routes/user"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const allowedOrigins = [
    "https://edgrade.vercel.app",
    "https://edgrade-ofs-pthglu-sophavonghs-projects.vercel.app",
    "https://edgrade-git-main-sophavonghs-projects.vercel.app",
    "https://www.edgrade.me",
    "https://edgrade.me",
    "https://api.edgrade.me" // <-- Add your backend custom domain here!
];
const corsOptions = {
    origin: (origin, callback) => {
        console.log("CORS Origin:", origin);
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) ||
            /^https:\/\/.*\.vercel\.app$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["Set-Cookie"],
};
app.use((0, cors_1.default)(corsOptions));
app.options("*", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ limit: '20mb', extended: true }));
app.use((0, cookie_parser_1.default)());
// Public routes (no JWT)
app.use("/api", publicReport_1.default);
// Auth routes (no JWT)
app.use("/api/auth", auth_1.default);
// Protected routes (require JWT)
app.use("/api/classrooms", auth_2.authenticateJWT, classroom_1.default);
app.use("/api/students", auth_2.authenticateJWT, student_1.default);
app.use("/api/report-cards", auth_2.authenticateJWT, reportCard_1.default);
app.use("/api/admin", auth_2.authenticateJWT, admin_1.default);
app.use("/api/user-subjects", auth_2.authenticateJWT, userSubjects_1.default);
app.use("/api/user", auth_2.authenticateJWT, user_1.default);
exports.default = app;
