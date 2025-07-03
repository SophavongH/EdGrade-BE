"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_1 = require("../database/drizzle");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// GET all students for the current user
router.get("/", async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const data = await drizzle_1.db
        .select()
        .from(schema_1.students)
        .where((0, drizzle_orm_1.eq)(schema_1.students.userId, req.user.id));
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
        const [student] = await drizzle_1.db
            .insert(schema_1.students)
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
    }
    catch (err) {
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
    const result = await drizzle_1.db
        .update(schema_1.students)
        .set({ name, avatar, gender, parentPhone, dob, address })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.students.id, id), (0, drizzle_orm_1.eq)(schema_1.students.userId, req.user.id)))
        .returning();
    if (result.length === 0)
        return res.status(404).json({ message: "Not found" });
    // Return studentId in the response
    res.json(result[0]);
});
// GET single student by id
router.get("/:id", async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    const [student] = await drizzle_1.db
        .select()
        .from(schema_1.students)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.students.id, id), (0, drizzle_orm_1.eq)(schema_1.students.userId, req.user.id)));
    if (!student)
        return res.status(404).json({ message: "Not found" });
    // Return studentId in the response
    res.json(student);
});
router.delete("/:id", async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    const result = await drizzle_1.db
        .delete(schema_1.students)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.students.id, id), (0, drizzle_orm_1.eq)(schema_1.students.userId, req.user.id)))
        .returning();
    if (result.length === 0)
        return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
});
exports.default = router;
