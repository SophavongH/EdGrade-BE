import express from "express";
import { db } from "../database/drizzle";
import { userSubjects } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { authenticateJWT } from "./auth"; // <-- updated import

const router = express.Router();

// Get all custom subjects for the logged-in user
router.get("/", authenticateJWT, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user.id;
  const subjects = await db.select().from(userSubjects).where(eq(userSubjects.userId, userId));
  res.json(subjects.map((s: any) => s.subject));
});

// Add a new custom subject for the logged-in user
router.post("/", authenticateJWT, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user.id;
  const { subject } = req.body;
  if (!subject || typeof subject !== "string") {
    return res.status(400).json({ error: "Invalid subject" });
  }
  // Prevent duplicates
  const exists = await db.select().from(userSubjects)
    .where(and(eq(userSubjects.userId, userId), eq(userSubjects.subject, subject)));
  if (exists.length > 0) {
    return res.status(409).json({ error: "Subject already exists" });
  }
  await db.insert(userSubjects).values({ userId, subject });
  res.json({ success: true });
});

// Delete a custom subject for the logged-in user
router.delete("/", authenticateJWT, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user.id;
  const { subject } = req.body;
  if (!subject || typeof subject !== "string") {
    return res.status(400).json({ error: "Invalid subject" });
  }
  await db.delete(userSubjects)
    .where(and(eq(userSubjects.userId, userId), eq(userSubjects.subject, subject)));
  res.json({ success: true });
});

export default router;
// filepath: c:\Users\hengs\Desktop\fyp\backend\routes\userSubjects.ts