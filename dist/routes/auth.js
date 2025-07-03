"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const drizzle_1 = require("../database/drizzle");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const [user] = await drizzle_1.db.select().from(schema_1.usersTable).where((0, drizzle_orm_1.eq)(schema_1.usersTable.email, email));
    if (!user)
        return res.status(401).json({ success: false, error: 'User not found' });
    const valid = await bcryptjs_1.default.compare(password, user.password);
    if (!valid)
        return res.status(401).json({ success: false, error: 'Invalid password' });
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, role: user.role, token });
});
exports.default = router;
