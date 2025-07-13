"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_1 = require("../database/drizzle");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
router.get("/report/:token", async (req, res) => {
    const { token } = req.params;
    const [row] = await drizzle_1.db
        .select()
        .from(schema_1.reportCardTokens)
        .where((0, drizzle_orm_1.eq)(schema_1.reportCardTokens.token, token));
    if (!row)
        return res.status(404).json({ error: "Invalid link" });
    const [student] = await drizzle_1.db
        .select({
        id: schema_1.students.id,
        student_id: schema_1.students.studentId,
        name: schema_1.students.name,
        gender: schema_1.students.gender,
        avatar: schema_1.students.avatar,
    })
        .from(schema_1.students)
        .where((0, drizzle_orm_1.eq)(schema_1.students.id, row.studentId));
    const [reportCard] = await drizzle_1.db.select().from(schema_1.reportCards).where((0, drizzle_orm_1.eq)(schema_1.reportCards.id, row.reportCardId));
    const [score] = await drizzle_1.db.select().from(schema_1.reportCardScores)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reportCardScores.reportCardId, row.reportCardId), (0, drizzle_orm_1.eq)(schema_1.reportCardScores.studentId, row.studentId)));
    // Use subjects from reportCard
    const subjectsToShow = reportCard?.subjects || [];
    // Filter scores to only selected subjects
    let filteredScores = {};
    if (score && subjectsToShow.length > 0) {
        const scoresObj = score.scores;
        for (const key of subjectsToShow) {
            if (scoresObj[key] !== undefined) {
                filteredScores[key] = scoresObj[key];
            }
        }
        ["absent", "total", "average", "grade", "rank"].forEach((k) => {
            if (scoresObj[k] !== undefined)
                filteredScores[k] = scoresObj[k];
        });
    }
    // Fetch total students in the classroom
    let totalStudents = 0;
    if (reportCard) {
        totalStudents = await drizzle_1.db
            .select()
            .from(schema_1.classroomStudents)
            .where((0, drizzle_orm_1.eq)(schema_1.classroomStudents.classroomId, reportCard.classroomId))
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
exports.default = router;
