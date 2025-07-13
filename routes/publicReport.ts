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
  if (!row) return res.status(404).json({ error: "Invalid link" });

  const [student] = await db.select().from(students).where(eq(students.id, row.studentId));
  const [reportCard] = await db.select().from(reportCards).where(eq(reportCards.id, row.reportCardId));
  const [score] = await db.select().from(reportCardScores)
    .where(and(eq(reportCardScores.reportCardId, row.reportCardId), eq(reportCardScores.studentId, row.studentId)));

  // Use subjects from reportCard
  const subjectsToShow = reportCard?.subjects || [];

  // Filter scores to only selected subjects
  let filteredScores: Record<string, unknown> = {};
  if (score && subjectsToShow.length > 0) {
    const scoresObj = score.scores as Record<string, unknown>;
    for (const key of subjectsToShow) {
      if (scoresObj[key] !== undefined) {
        filteredScores[key] = scoresObj[key];
      }
    }
    ["absent", "total", "average", "grade", "rank"].forEach((k) => {
      if (scoresObj[k] !== undefined) filteredScores[k] = scoresObj[k];
    });
  }

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
    score: filteredScores,
    subjects: subjectsToShow,
    totalStudents,
  });
});

export default router;