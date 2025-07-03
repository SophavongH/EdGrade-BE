"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const drizzle_1 = require("../database/drizzle");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("./auth"); // <-- updated import
const router = express_1.default.Router();
// Get all custom subjects for the logged-in user
router.get("/", auth_1.authenticateJWT, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: "Unauthorized" });
    const userId = req.user.id;
    const subjects = await drizzle_1.db.select().from(schema_1.userSubjects).where((0, drizzle_orm_1.eq)(schema_1.userSubjects.userId, userId));
    res.json(subjects.map((s) => s.subject));
});
// Add a new custom subject for the logged-in user
router.post("/", auth_1.authenticateJWT, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: "Unauthorized" });
    const userId = req.user.id;
    const { subject } = req.body;
    if (!subject || typeof subject !== "string") {
        return res.status(400).json({ error: "Invalid subject" });
    }
    // Prevent duplicates
    const exists = await drizzle_1.db.select().from(schema_1.userSubjects)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userSubjects.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userSubjects.subject, subject)));
    if (exists.length > 0) {
        return res.status(409).json({ error: "Subject already exists" });
    }
    await drizzle_1.db.insert(schema_1.userSubjects).values({ userId, subject });
    res.json({ success: true });
});
// Delete a custom subject for the logged-in user
router.delete("/", auth_1.authenticateJWT, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: "Unauthorized" });
    const userId = req.user.id;
    const { subject } = req.body;
    if (!subject || typeof subject !== "string") {
        return res.status(400).json({ error: "Invalid subject" });
    }
    await drizzle_1.db.delete(schema_1.userSubjects)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userSubjects.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userSubjects.subject, subject)));
    res.json({ success: true });
});
exports.default = router;
// filepath: c:\Users\hengs\Desktop\fyp\backend\routes\userSubjects.ts
