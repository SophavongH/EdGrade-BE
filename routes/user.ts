import { Router } from "express";
import { usersTable } from "../database/schema";
import { db } from "../database/drizzle";
import { eq } from "drizzle-orm";
import { authenticateJWT } from "./auth";
import bcrypt from "bcryptjs";

const router = Router();

// Get current user's profile
router.get("/profile", authenticateJWT, async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: "Unauthorized" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    name: user.name,
    email: user.email,
    avatar: user.avatar || "",
    role: user.role,
  });
});

// Update current user's profile
router.put("/profile", authenticateJWT, async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: "Unauthorized" });
  const { name, email, avatar, password } = req.body;
  const updateData: any = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (avatar) updateData.avatar = avatar;
  if (password && password.trim() !== "") {
    updateData.password = await bcrypt.hash(password, 10); 
  }
  await db.update(usersTable).set(updateData).where(eq(usersTable.id, req.user.id));
  res.json({ success: true });
});

export default router;