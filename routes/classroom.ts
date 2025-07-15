import { Router } from "express";
import { db } from "../database/drizzle";
import { classrooms as classroomsTable, classroomStudents, students } from "../database/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

const router = Router();

// GET all active classrooms for the current user
router.get("/", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Get all classrooms for the user
  const classroomsList = await db
    .select()
    .from(classroomsTable)
    .where(and(eq(classroomsTable.archived, false), eq(classroomsTable.userId, req.user.id)));

  // For each classroom, count students
  const result = [];
  for (const cls of classroomsList) {
    const studentCount = await db
      .select()
      .from(classroomStudents)
      .where(eq(classroomStudents.classroomId, cls.id))
      .then(rows => rows.length);

    result.push({
      ...cls,
      totalStudents: studentCount,
    });
  }

  res.json(result);
});

// POST create classroom
router.post("/", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { name, color } = req.body;
  if (!name || !color) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const result = await db
    .insert(classroomsTable)
    .values({
      name,
      color,
      totalStudents: 0,
      archived: false,
      userId: req.user.id,
    })
    .returning();
  res.status(201).json(result[0]);
});

// PATCH edit classroom
router.patch("/:id", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const id = parseInt(req.params.id);
  const { name } = req.body;
  const result = await db
    .update(classroomsTable)
    .set({ name })
    .where(and(eq(classroomsTable.id, id), eq(classroomsTable.userId, req.user.id)))
    .returning();
  if (result.length === 0) return res.status(404).json({ message: "Not found" });
  res.json(result[0]);
});

// PATCH archive classroom
router.patch("/:id/archive", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const id = parseInt(req.params.id);
  const result = await db
    .update(classroomsTable)
    .set({ archived: true })
    .where(and(eq(classroomsTable.id, id), eq(classroomsTable.userId, req.user.id)))
    .returning();
  if (result.length === 0) return res.status(404).json({ message: "Not found" });
  res.json(result[0]);
});

// GET archived classrooms for the current user
router.get("/archived", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const data = await db
    .select()
    .from(classroomsTable)
    .where(and(eq(classroomsTable.archived, true), eq(classroomsTable.userId, req.user.id)));
  res.json(data);
});

// PATCH unarchive classroom
router.patch("/:id/unarchive", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const id = parseInt(req.params.id);
  try {
    const result = await db
      .update(classroomsTable)
      .set({ archived: false })
      .where(and(eq(classroomsTable.id, id), eq(classroomsTable.userId, req.user.id)))
      .returning();
    if (result.length === 0) return res.status(404).json({ message: "Not found" });
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to unarchive classroom" });
  }
});

// GET classroom for detial by ID for the current user
router.get("/:id", async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const id = parseInt(req.params.id);
  const [classroom] = await db
    .select()
    .from(classroomsTable)
    .where(and(eq(classroomsTable.id, id), eq(classroomsTable.userId, req.user.id)));
  if (!classroom) return res.status(404).json({ message: "Not found" });
  res.json(classroom);
});

// GET all students in a classroom
router.get("/:id/students", async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: "Unauthorized" });
  const classroomId = parseInt(req.params.id);

  if (isNaN(classroomId)) {
    return res.status(400).json({ error: "Invalid classroom ID" });
  }

  // Check classroom ownership
  const classroom = await db.select().from(classroomsTable)
    .where(and(eq(classroomsTable.id, classroomId), eq(classroomsTable.userId, req.user.id)));
  if (!classroom.length) return res.status(404).json({ error: "Classroom not found" });

  // Join classroom_students and students
  const joined = await db
    .select()
    .from(classroomStudents)
    .innerJoin(students, eq(classroomStudents.studentId, students.id))
    .where(eq(classroomStudents.classroomId, classroomId));
  // joined is an array of { classroom_students: ..., students: ... }
  res.json(joined.map(j => j.students));
});

// POST add students to classroom
router.post("/:id/students", async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: "Unauthorized" });
  const classroomId = parseInt(req.params.id);
  const { studentIds } = req.body; // array of student UUIDs

  if (!Array.isArray(studentIds) || !studentIds.length) {
    return res.status(400).json({ error: "No students selected" });
  }

  // Check classroom ownership
  const classroom = await db.select().from(classroomsTable)
    .where(and(eq(classroomsTable.id, classroomId), eq(classroomsTable.userId, req.user.id)));
  if (!classroom.length) return res.status(404).json({ error: "Classroom not found" });

  // Only add students that belong to the user
  const validStudents = await db
    .select()
    .from(students)
    .where(and(
      inArray(students.id, studentIds),
      eq(students.userId, req.user.id)
    ));

  // Find already added students
  const alreadyInClass = await db
    .select({ studentId: classroomStudents.studentId })
    .from(classroomStudents)
    .where(and(
      eq(classroomStudents.classroomId, classroomId),
      inArray(classroomStudents.studentId, studentIds)
    ));

  const alreadyIds = alreadyInClass.map(s => s.studentId);
  const toAdd = validStudents.filter(stu => !alreadyIds.includes(stu.id));

  // Insert new links (ignore duplicates)
  for (const stu of toAdd) {
    await db
      .insert(classroomStudents)
      .values({ classroomId, studentId: stu.id });
  }

  // Return info about already added students
  res.json({
    success: toAdd.length > 0,
    alreadyAdded: validStudents.filter(stu => alreadyIds.includes(stu.id)).map(stu => ({ id: stu.id, name: stu.name }))
  });
});

// Remove a student from a classroom (not delete student from DB)
router.delete("/:classroomId/students/:studentId", async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: "Unauthorized" });
  const classroomId = parseInt(req.params.classroomId);
  const studentId = req.params.studentId;

  // Check classroom ownership
  const classroom = await db.select().from(classroomsTable)
    .where(and(eq(classroomsTable.id, classroomId), eq(classroomsTable.userId, req.user.id)));
  if (!classroom.length) return res.status(404).json({ error: "Classroom not found" });

  // Remove the student from the classroom
  await db.delete(classroomStudents)
    .where(and(
      eq(classroomStudents.classroomId, classroomId),
      eq(classroomStudents.studentId, studentId)
    ));

  res.json({ success: true });
});



export default router;