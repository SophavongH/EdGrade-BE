import { Router } from "express";
import { db } from "../database/drizzle";
import { reportCardTokens, students, reportCards, reportCardScores, classroomStudents } from "../database/schema";
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

  // Fetch total students in the classroom
  let totalStudents = 0;
  if (reportCard) {
    totalStudents = await db
      .select()
      .from(classroomStudents)
      .where(eq(classroomStudents.classroomId, reportCard.classroomId))
      .then(rows => rows.length);
  }

  res.json({
    student,
    reportCard,
    score: score ? score.scores : null,
    totalStudents, // <-- add this
  });
});

export default router;