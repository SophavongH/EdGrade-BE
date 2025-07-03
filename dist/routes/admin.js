"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="../types/express" />
const express_1 = require("express");
const drizzle_1 = require("../database/drizzle");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = (0, express_1.Router)();
// Dashboard stats and user list
router.get("/dashboard", async (req, res) => {
    try {
        // Get all users with role 'user'
        const users = await drizzle_1.db
            .select()
            .from(schema_1.usersTable)
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.role, "user"));
        // Calculate stats
        const total = users.length;
        const active = users.filter((u) => u.status !== "deactivated").length;
        const deactivated = users.filter((u) => u.status === "deactivated").length;
        res.json({
            stats: {
                total,
                active,
                deactivated,
            },
            schools: users, // Return users as schools for the frontend
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
});
// Create school user
router.post("/create-school-user", async (req, res) => {
    try {
        const { name, email, password } = req.body; // <-- remove address
        // Check for duplicate email
        const existing = await drizzle_1.db.select().from(schema_1.usersTable).where((0, drizzle_orm_1.eq)(schema_1.usersTable.email, email));
        if (existing.length > 0) {
            return res.status(409).json({ error: "Email already exists" });
        }
        await drizzle_1.db.insert(schema_1.usersTable).values({
            name,
            email,
            password: await bcrypt_1.default.hash(password, 10),
            role: "user",
            createdAt: new Date(),
            status: "active",
        });
        res.status(201).json({ success: true });
    }
    catch (err) {
        console.error("Create user error:", err); // Add this for debugging
        res.status(500).json({ error: "Failed to create user" });
    }
});
// Get a single school user by ID
router.get("/school/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [user] = await drizzle_1.db
            .select()
            .from(schema_1.usersTable)
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, id));
        if (!user)
            return res.status(404).json({ error: "School not found" });
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.status,
            // add other fields if needed
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch school" });
    }
});
// Update a school user by ID
router.put("/school/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password } = req.body;
        const updateData = { name, email };
        if (password && password.trim() !== "") {
            updateData.password = await bcrypt_1.default.hash(password, 10);
        }
        await drizzle_1.db
            .update(schema_1.usersTable)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update school" });
    }
});
// Delete a school user by ID
router.delete("/school/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await drizzle_1.db.delete(schema_1.usersTable).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to delete user" });
    }
});
// Update status of a school user by ID
router.patch("/school/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // "active" or "deactivated"
        await drizzle_1.db
            .update(schema_1.usersTable)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, id));
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update status" });
    }
});
exports.default = router;
