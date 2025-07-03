import { Router } from "express";
import { db } from "../database/drizzle";
import { students } from "../database/schema";
import { eq, and } from "drizzle-orm";


declare global {
  namespace Express {
    interface User {
      id: string;
      // add other user properties if needed
    }
    interface Request {
      user?: User;
    }
  }
}

const router = Router();

// GET all students for the current user
router.get("/", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const data = await db
    .select()
    .from(students)
    .where(eq(students.userId, req.user.id));
  // Ensure studentId is included in the response
  res.json(data);
});

// POST create student
router.post("/", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const { name, avatar, gender, parentPhone, dob, address } = req.body;
    if (!name || !gender) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [student] = await db
      .insert(students)
      .values({
        name,
        avatar,
        gender,
        parentPhone,
        dob,
        address,
        userId: req.user.id,
        // Do NOT set studentId here!
      })
      .returning();
    // Return studentId in the response
    res.status(201).json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create student" });
  }
});

// PUT update student
router.put("/:id", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { id } = req.params;
  const { name, avatar, gender, parentPhone, dob, address } = req.body;
  const result = await db
    .update(students)
    .set({ name, avatar, gender, parentPhone, dob, address })
    .where(and(eq(students.id, id), eq(students.userId, req.user.id)))
    .returning();
  if (result.length === 0) return res.status(404).json({ message: "Not found" });
  // Return studentId in the response
  res.json(result[0]);
});

// GET single student by id
router.get("/:id", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { id } = req.params;
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, id), eq(students.userId, req.user.id)));
  if (!student) return res.status(404).json({ message: "Not found" });
  // Return studentId in the response
  res.json(student);
});

router.delete("/:id", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { id } = req.params;
  const result = await db
    .delete(students)
    .where(and(eq(students.id, id), eq(students.userId, req.user.id)))
    .returning();
  if (result.length === 0) return res.status(404).json({ message: "Not found" });
  res.json({ success: true });
});

export default router;