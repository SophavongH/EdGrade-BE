import { Router } from "express";
import axios from "axios";
import crypto from "crypto";
import { db } from "../database/drizzle";
import { reportCards, classrooms, usersTable, reportCardScores, reportCardTokens, students } from "../database/schema";
import { eq, and, desc, inArray } from "drizzle-orm";


type ScoreObj = {
  absent: string;
  total: string;
  average: string;
  grade: string;
  rank: string;
  [subject: string]: any; // for dynamic subject scores
};

const router = Router();

const ALLOWED_SUBJECT_KEYS = [
  "khmerLiterature",
  "mathematics",
  "biology",
  "chemistry",
  "physics",
  "history",
  // ...add all your subject keys here
];

function cleanScoreObj(scoreObj: ScoreObj): ScoreObj {
  const cleaned: ScoreObj = {
    absent: "",
    total: "",
    average: "",
    grade: "",
    rank: "",
  };
  for (const key in scoreObj) {
    if (
      ["absent", "total", "average", "grade", "rank"].includes(key) ||
      ALLOWED_SUBJECT_KEYS.includes(key)
    ) {
      cleaned[key] = scoreObj[key];
    }
  }
  return cleaned;
}

// List report cards for a classroom (only for the classroom owner)
router.get("/classrooms/:classroomId/report-cards", async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: "Unauthorized" });
  const classroomId = parseInt(req.params.classroomId);

  // Only show report cards for classrooms owned by this user
  const [classroom] = await db.select().from(classrooms)
    .where(and(eq(classrooms.id, classroomId), eq(classrooms.userId, req.user.id)));
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });

  // Join with usersTable to get creator name
  const cards = await db
    .select({
      id: reportCards.id,
      title: reportCards.title,
      createdBy: reportCards.createdBy,
      createdAt: reportCards.createdAt,
      creatorName: usersTable.name,
    })
    .from(reportCards)
    .where(eq(reportCards.classroomId, classroomId))
    .leftJoin(usersTable, eq(reportCards.createdBy, usersTable.id))
    .orderBy(desc(reportCards.createdAt));
  res.json(cards);
});

// Create report card (only for classroom owner)
router.post("/classrooms/:classroomId/report-cards", async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: "Unauthorized" });
  const classroomId = parseInt(req.params.classroomId);
  const { title, subjects } = req.body; // subjects: string[]
  if (!title || !subjects) return res.status(400).json({ error: "Missing title or subjects" });

  // Only allow if user owns the classroom
  const [classroom] = await db.select().from(classrooms)
    .where(and(eq(classrooms.id, classroomId), eq(classrooms.userId, req.user.id)));
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });

  const [card] = await db.insert(reportCards)
    .values({
      classroomId,
      title,
      subjects, // Save selected subjects
      createdBy: req.user.id,
    })
    .returning();
  res.status(201).json(card);
});

// Delete report card (only for classroom owner)
router.delete("/:id", async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);

  // Only allow if user owns the classroom
  const [card] = await db.select().from(reportCards).where(eq(reportCards.id, id));
  if (!card) return res.status(404).json({ error: "Not found" });

  const [classroom] = await db.select().from(classrooms)
    .where(and(eq(classrooms.id, card.classroomId), eq(classrooms.userId, req.user.id)));
  if (!classroom) return res.status(403).json({ error: "Forbidden" });

  await db.delete(reportCards).where(eq(reportCards.id, id));
  res.json({ success: true });
});

router.post("/:id/scores", async (req, res) => {
  const reportCardId = parseInt(req.params.id);
  const { scores } = req.body;
  try {
    for (const [studentId, scoreObjRaw] of Object.entries(scores)) {
      const scoreObj = cleanScoreObj(scoreObjRaw as ScoreObj);

      if (!studentId || !scoreObj) continue;

      await db
        .insert(reportCardScores)
        .values({
          reportCardId,
          studentId,
          absent: scoreObj.absent ?? "",
          scores: scoreObj,
          total: scoreObj.total ?? "",
          average: scoreObj.average ?? "",
          grade: scoreObj.grade ?? "",
          rank: scoreObj.rank ?? "",
        })
        .onConflictDoUpdate({
          target: [reportCardScores.reportCardId, reportCardScores.studentId],
          set: {
            absent: scoreObj.absent ?? "",
            scores: scoreObj,
            total: scoreObj.total ?? "",
            average: scoreObj.average ?? "",
            grade: scoreObj.grade ?? "",
            rank: scoreObj.rank ?? "",
          },
        });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save scores:", err);
    res.status(500).json({ error: "Failed to save scores" });
  }
});

router.get("/:id/scores", async (req, res) => {
  const reportCardId = parseInt(req.params.id);
  // Optionally: check classroom/report card ownership here
  const scores = await db
    .select()
    .from(reportCardScores)
    .where(eq(reportCardScores.reportCardId, reportCardId));
  // Return as { [studentId]: scoreObj }
  const result: Record<string, any> = {};
  for (const row of scores) {
    result[row.studentId] = row.scores;
  }
  res.json(result);
});

router.get("/report/:token", async (req, res) => {
  const { token } = req.params;
  console.log("Token received:", token); // <-- Add this
  const [row] = await db
    .select()
    .from(reportCardTokens)
    .where(eq(reportCardTokens.token, token));
  console.log("DB row:", row); // <-- Add this
  if (!row) return res.status(404).json({ error: "Invalid or expired link" });

  // Fetch student info
  const [student] = await db.select().from(students).where(eq(students.id, row.studentId));
  // Fetch report card info
  const [reportCard] = await db.select().from(reportCards).where(eq(reportCards.id, row.reportCardId));
  // Fetch scores
  const [score] = await db.select().from(reportCardScores)
    .where(and(eq(reportCardScores.reportCardId, row.reportCardId), eq(reportCardScores.studentId, row.studentId)));

  res.json({
    student,
    reportCard,
    score: score ? score.scores : null,
  });
});

// SMS sending route - matches frontend API call
router.post("/:id/send-sms", async (req, res) => {
  const reportCardId = parseInt(req.params.id);
  const { studentIds } = req.body;

  function toPlasgateFormat(phone: string): string {
    if (!phone) return "";
    phone = phone.replace(/[\s\-\(\)]/g, "");
    if (phone.startsWith("+855")) return phone.slice(1);
    if (phone.startsWith("855")) return phone;
    if (phone.startsWith("0") && phone.length >= 9) return "855" + phone.slice(1);
    return phone;
  }

  try {
    const studentList = await db
      .select({
        id: students.id,
        name: students.name,
        parentPhone: students.parentPhone,
      })
      .from(students)
      .where(inArray(students.id, studentIds));

    const results = [];

    for (const student of studentList) {
      if (!student.parentPhone || student.parentPhone.trim() === "") {
        results.push({
          student: student.name,
          phone: "N/A",
          status: "skipped",
          error: "No parent phone number"
        });
        continue;
      }

      const formattedPhone = toPlasgateFormat(student.parentPhone);
      const token = crypto.randomBytes(32).toString("hex");
      const reportUrl = `${process.env.FRONTEND_URL}/report/${token}`;
      // Fetch the report card to get its title
      const [reportCard] = await db.select().from(reportCards).where(eq(reportCards.id, reportCardId));
      const reportCardTitle = reportCard?.title || "";
      const smsMessage = `សូមចូលមើលរបាយការណ៍កូនអ្នក ${student.name} ប្រចាំ ${reportCardTitle}: ${reportUrl}`;

      // Insert the token into the DB (create or update)
      await db.insert(reportCardTokens).values({
        studentId: student.id,
        reportCardId,
        token,
        // createdAt will default to now
      }).onConflictDoNothing(); // Prevent duplicate tokens for same student/report

      console.log("Sending SMS to:", formattedPhone, "with message:", smsMessage);

      try {
        const response = await axios.post(
          `https://cloudapi.plasgate.com/rest/send?private_key=${process.env.PLASGATE_API_KEY}`,
          {
            sender: process.env.PLASGATE_SENDER,
            to: formattedPhone,
            content: smsMessage,
          },
          {
            headers: {
              "Content-Type": "application/json",
              "X-Secret": process.env.PLASGATE_X_SECRET,
            },
          }
        );
        console.log("PlasGate response:", response.data);

        results.push({
          student: student.name,
          phone: student.parentPhone,
          formattedPhone,
          status: "success",
          data: response.data,
          reportUrl,
        });
      } catch (smsError: any) {
        console.error("PlasGate error:", smsError.response?.data || smsError.message);
        results.push({
          student: student.name,
          phone: student.parentPhone,
          formattedPhone: toPlasgateFormat(student.parentPhone),
          status: "failed",
          error: smsError.response?.data || smsError.message,
        });
      }
    }

    res.json({
      success: true,
      results,
      totalStudents: studentList.length,
      successCount: results.filter((r) => r.status === "success").length,
      failedCount: results.filter((r) => r.status === "failed").length,
      skippedCount: results.filter((r) => r.status === "skipped").length,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to send report card SMS" });
  }
});

router.put("/report-cards/:id/subjects", async (req, res) => {
  const id = parseInt(req.params.id);
  const { subjects } = req.body;
  if (!Array.isArray(subjects)) return res.status(400).json({ error: "Invalid subjects" });

  await db.update(reportCards)
    .set({ subjects })
    .where(eq(reportCards.id, id));
  res.json({ success: true });
});

export default router;