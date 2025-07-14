"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schema_1 = require("../database/schema");
const drizzle_1 = require("../database/drizzle");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
// Get current user's profile
router.get("/profile", auth_1.authenticateJWT, async (req, res) => {
    if (!req.user || !req.user.id)
        return res.status(401).json({ error: "Unauthorized" });
    const [user] = await drizzle_1.db.select().from(schema_1.usersTable).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, req.user.id));
    if (!user)
        return res.status(404).json({ error: "User not found" });
    res.json({
        name: user.name,
        email: user.email,
        avatar: user.avatar || "",
        role: user.role,
    });
});
// Update current user's profile
router.put("/profile", auth_1.authenticateJWT, async (req, res) => {
    if (!req.user || !req.user.id)
        return res.status(401).json({ error: "Unauthorized" });
    const { name, email, avatar, password } = req.body;
    const updateData = {};
    if (name)
        updateData.name = name;
    if (email)
        updateData.email = email;
    if (avatar)
        updateData.avatar = avatar;
    if (password)
        updateData.password = password; // hash if needed
    await drizzle_1.db.update(schema_1.usersTable).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, req.user.id));
    res.json({ success: true });
});
exports.default = router;
