import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../database/drizzle";
import { usersTable } from "../database/schema";


const router = Router();

// JWT authentication middleware
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    // The JWT payload includes id, email, name, role
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as Express.User; // <-- assign all fields, not just id/email
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      return res.status(401).json({ success: false, error: "Email is invalid" });
    }

    // Check if the account is deactivated
    if (user.status === "deactivated") {
      return res.status(403).json({ error: "Account is suspended." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: "Password is invalid" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "12h" }
    );

    // Return user object!
    return res.json({
      success: true,
      token,
      role: user.role,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

router.get("/me", authenticateJWT, async (req, res) => {
  // req.user is set by authenticateJWT
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

export default router;