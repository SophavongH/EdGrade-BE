/// <reference types="../types/express" />
import { Router } from "express";
import { db } from "../database/drizzle";
import { usersTable } from "../database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
const router = Router();

// Dashboard stats and user list
router.get("/dashboard", async (req, res) => {
  try {
    // Get all users with role 'user'
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "user"));

    // Calculate stats
    const total = users.length;
    const active = users.filter((u: any) => u.status !== "deactivated").length;
    const deactivated = users.filter((u: any) => u.status === "deactivated").length;

    res.json({
      stats: {
        total,
        active,
        deactivated,
      },
      schools: users, // Return users as schools for the frontend
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// Create school user
router.post("/create-school-user", async (req, res) => {
  try {
    const { name, email, password } = req.body; // <-- remove address
    // Check for duplicate email
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }
    await db.insert(usersTable).values({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: "user",
      createdAt: new Date(),
      status: "active",
    });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Create user error:", err); // Add this for debugging
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Get a single school user by ID
router.get("/school/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ error: "School not found" });
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      // add other fields if needed
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch school" });
  }
});

// Update a school user by ID
router.put("/school/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;
    const updateData: any = { name, email };
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }
    await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update school" });
  }
});

// Delete a school user by ID
router.delete("/school/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Update status of a school user by ID
router.patch("/school/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "active" or "deactivated"
    await db
      .update(usersTable)
      .set({ status })
      .where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;