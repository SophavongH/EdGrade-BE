"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_1 = require("../database/drizzle");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// GET all active classrooms for the current user
router.get("/", async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    // Get classrooms for the user
    const classroomsList = await drizzle_1.db
        .select()
        .from(schema_1.classrooms)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.archived, false), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)));
    // For each classroom, count students
    const result = [];
    for (const cls of classroomsList) {
        const count = await drizzle_1.db
            .select()
            .from(schema_1.classroomStudents)
            .where((0, drizzle_orm_1.eq)(schema_1.classroomStudents.classroomId, Number(cls.id))); // <-- FIXED HERE
        result.push({
            ...cls,
            totalStudents: count.length,
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
    const result = await drizzle_1.db
        .insert(schema_1.classrooms)
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
    const result = await drizzle_1.db
        .update(schema_1.classrooms)
        .set({ name })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.id, id), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)))
        .returning();
    if (result.length === 0)
        return res.status(404).json({ message: "Not found" });
    res.json(result[0]);
});
// PATCH archive classroom
router.patch("/:id/archive", async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    const result = await drizzle_1.db
        .update(schema_1.classrooms)
        .set({ archived: true })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.id, id), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)))
        .returning();
    if (result.length === 0)
        return res.status(404).json({ message: "Not found" });
    res.json(result[0]);
});
// GET archived classrooms for the current user
router.get("/archived", async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const data = await drizzle_1.db
        .select()
        .from(schema_1.classrooms)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.archived, true), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)));
    res.json(data);
});
// PATCH unarchive classroom
router.patch("/:id/unarchive", async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    try {
        const result = await drizzle_1.db
            .update(schema_1.classrooms)
            .set({ archived: false })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.id, id), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)))
            .returning();
        if (result.length === 0)
            return res.status(404).json({ message: "Not found" });
        res.json(result[0]);
    }
    catch (err) {
        res.status(500).json({ success: false, error: "Failed to unarchive classroom" });
    }
});
// GET classroom for detial by ID for the current user
router.get("/:id", async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const id = parseInt(req.params.id);
    const [classroom] = await drizzle_1.db
        .select()
        .from(schema_1.classrooms)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.id, id), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)));
    if (!classroom)
        return res.status(404).json({ message: "Not found" });
    res.json(classroom);
});
// GET all students in a classroom
router.get("/:id/students", async (req, res) => {
    if (!req.user || !req.user.id)
        return res.status(401).json({ error: "Unauthorized" });
    const classroomId = parseInt(req.params.id);
    if (isNaN(classroomId)) {
        return res.status(400).json({ error: "Invalid classroom ID" });
    }
    // Check classroom ownership
    const classroom = await drizzle_1.db.select().from(schema_1.classrooms)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.id, classroomId), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)));
    if (!classroom.length)
        return res.status(404).json({ error: "Classroom not found" });
    // Join classroom_students and students
    const joined = await drizzle_1.db
        .select()
        .from(schema_1.classroomStudents)
        .innerJoin(schema_1.students, (0, drizzle_orm_1.eq)(schema_1.classroomStudents.studentId, schema_1.students.id))
        .where((0, drizzle_orm_1.eq)(schema_1.classroomStudents.classroomId, classroomId));
    // joined is an array of { classroom_students: ..., students: ... }
    res.json(joined.map(j => j.students));
});
// POST add students to classroom
router.post("/:id/students", async (req, res) => {
    if (!req.user || !req.user.id)
        return res.status(401).json({ error: "Unauthorized" });
    const classroomId = parseInt(req.params.id);
    const { studentIds } = req.body; // array of student UUIDs
    if (!Array.isArray(studentIds) || !studentIds.length) {
        return res.status(400).json({ error: "No students selected" });
    }
    // Check classroom ownership
    const classroom = await drizzle_1.db.select().from(schema_1.classrooms)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.id, classroomId), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)));
    if (!classroom.length)
        return res.status(404).json({ error: "Classroom not found" });
    // Only add students that belong to the user
    const validStudents = await drizzle_1.db
        .select()
        .from(schema_1.students)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.students.id, studentIds), (0, drizzle_orm_1.eq)(schema_1.students.userId, req.user.id)));
    // Find already added students
    const alreadyInClass = await drizzle_1.db
        .select({ studentId: schema_1.classroomStudents.studentId })
        .from(schema_1.classroomStudents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classroomStudents.classroomId, classroomId), (0, drizzle_orm_1.inArray)(schema_1.classroomStudents.studentId, studentIds)));
    const alreadyIds = alreadyInClass.map(s => s.studentId);
    const toAdd = validStudents.filter(stu => !alreadyIds.includes(stu.id));
    // Insert new links (ignore duplicates)
    for (const stu of toAdd) {
        await drizzle_1.db
            .insert(schema_1.classroomStudents)
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
    if (!req.user || !req.user.id)
        return res.status(401).json({ error: "Unauthorized" });
    const classroomId = parseInt(req.params.classroomId);
    const studentId = req.params.studentId;
    // Check classroom ownership
    const classroom = await drizzle_1.db.select().from(schema_1.classrooms)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.id, classroomId), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)));
    if (!classroom.length)
        return res.status(404).json({ error: "Classroom not found" });
    // Remove the student from the classroom
    await drizzle_1.db.delete(schema_1.classroomStudents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classroomStudents.classroomId, classroomId), (0, drizzle_orm_1.eq)(schema_1.classroomStudents.studentId, studentId)));
    res.json({ success: true });
});
exports.default = router;
