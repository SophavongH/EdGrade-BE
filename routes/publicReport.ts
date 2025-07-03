import { Router } from "express";
import { db } from "../database/drizzle";
import { reportCardTokens, students, reportCards, reportCardScores } from "../database/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/report/:token", async (req, res) => {
  const { token } = req.params;
  const [row] = await db
    .select()
    .from(reportCardTokens)
    .where(eq(reportCardTokens.token, token));
  if (!row) return res.status(404).json({ error: "Invalid or expired link" });

  const [student] = await db.select().from(students).where(eq(students.id, row.studentId));
  const [reportCard] = await db.select().from(reportCards).where(eq(reportCards.id, row.reportCardId));
  const [score] = await db.select().from(reportCardScores)
    .where(and(eq(reportCardScores.reportCardId, row.reportCardId), eq(reportCardScores.studentId, row.studentId)));

  res.json({
    student,
    reportCard,
    score: score ? score.scores : null,
  });
});

export default router;