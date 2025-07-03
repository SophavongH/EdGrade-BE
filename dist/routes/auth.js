"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = authenticateJWT;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_1 = require("../database/drizzle");
const schema_1 = require("../database/schema");
const router = (0, express_1.Router)();
// JWT authentication middleware
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: "No token" });
    const token = authHeader.split(" ")[1];
    try {
        // The JWT payload includes id, email, name, role
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // <-- assign all fields, not just id/email
        next();
    }
    catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const [user] = await drizzle_1.db
            .select()
            .from(schema_1.usersTable)
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.email, email));
        if (!user) {
            return res.status(401).json({ success: false, error: "Email is invalid" });
        }
        // Check if the account is deactivated
        if (user.status === "deactivated") {
            return res.status(403).json({ error: "Account is suspended." });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ success: false, error: "Password is invalid" });
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        }, process.env.JWT_SECRET, { expiresIn: "12h" });
        // Return user object!
        return res.json({
            success: true,
            token,
            role: user.role,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    }
    catch (err) {
        console.error("Login error:", err);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    }
});
router.get("/me", authenticateJWT, async (req, res) => {
    // req.user is set by authenticateJWT
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    const [user] = await drizzle_1.db
        .select()
        .from(schema_1.usersTable)
        .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, userId));
    if (!user)
        return res.status(404).json({ error: "User not found" });
    return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    });
});
exports.default = router;
