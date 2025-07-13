"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const drizzle_1 = require("../database/drizzle");
const schema_1 = require("../database/schema");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
const ALLOWED_SUBJECT_KEYS = [
    "khmerLiterature",
    "mathematics",
    "biology",
    "chemistry",
    "physics",
    "history",
    // ...add all your subject keys here
];
function cleanScoreObj(scoreObj) {
    const cleaned = {
        absent: "",
        total: "",
        average: "",
        grade: "",
        rank: "",
    };
    for (const key in scoreObj) {
        if (["absent", "total", "average", "grade", "rank"].includes(key) ||
            ALLOWED_SUBJECT_KEYS.includes(key)) {
            cleaned[key] = scoreObj[key];
        }
    }
    return cleaned;
}
// List report cards for a classroom (only for the classroom owner)
router.get("/classrooms/:classroomId/report-cards", async (req, res) => {
    if (!req.user || !req.user.id)
        return res.status(401).json({ error: "Unauthorized" });
    const classroomId = parseInt(req.params.classroomId);
    // Only show report cards for classrooms owned by this user
    const [classroom] = await drizzle_1.db.select().from(schema_1.classrooms)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.id, classroomId), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)));
    if (!classroom)
        return res.status(404).json({ error: "Classroom not found" });
    // Join with usersTable to get creator name
    const cards = await drizzle_1.db
        .select({
        id: schema_1.reportCards.id,
        title: schema_1.reportCards.title,
        createdBy: schema_1.reportCards.createdBy,
        createdAt: schema_1.reportCards.createdAt,
        creatorName: schema_1.usersTable.name,
    })
        .from(schema_1.reportCards)
        .where((0, drizzle_orm_1.eq)(schema_1.reportCards.classroomId, classroomId))
        .leftJoin(schema_1.usersTable, (0, drizzle_orm_1.eq)(schema_1.reportCards.createdBy, schema_1.usersTable.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.reportCards.createdAt));
    res.json(cards);
});
// Create report card (only for classroom owner)
router.post("/classrooms/:classroomId/report-cards", async (req, res) => {
    if (!req.user || !req.user.id)
        return res.status(401).json({ error: "Unauthorized" });
    const classroomId = parseInt(req.params.classroomId);
    const { title, subjects } = req.body; // subjects: string[]
    if (!title || !subjects)
        return res.status(400).json({ error: "Missing title or subjects" });
    // Only allow if user owns the classroom
    const [classroom] = await drizzle_1.db.select().from(schema_1.classrooms)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.id, classroomId), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)));
    if (!classroom)
        return res.status(404).json({ error: "Classroom not found" });
    const [card] = await drizzle_1.db.insert(schema_1.reportCards)
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
    if (!req.user || !req.user.id)
        return res.status(401).json({ error: "Unauthorized" });
    const id = parseInt(req.params.id);
    // Only allow if user owns the classroom
    const [card] = await drizzle_1.db.select().from(schema_1.reportCards).where((0, drizzle_orm_1.eq)(schema_1.reportCards.id, id));
    if (!card)
        return res.status(404).json({ error: "Not found" });
    const [classroom] = await drizzle_1.db.select().from(schema_1.classrooms)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classrooms.id, card.classroomId), (0, drizzle_orm_1.eq)(schema_1.classrooms.userId, req.user.id)));
    if (!classroom)
        return res.status(403).json({ error: "Forbidden" });
    await drizzle_1.db.delete(schema_1.reportCards).where((0, drizzle_orm_1.eq)(schema_1.reportCards.id, id));
    res.json({ success: true });
});
router.post("/:id/scores", async (req, res) => {
    const reportCardId = parseInt(req.params.id);
    const { scores } = req.body;
    try {
        for (const [studentId, scoreObjRaw] of Object.entries(scores)) {
            const scoreObj = cleanScoreObj(scoreObjRaw);
            if (!studentId || !scoreObj)
                continue;
            await drizzle_1.db
                .insert(schema_1.reportCardScores)
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
                target: [schema_1.reportCardScores.reportCardId, schema_1.reportCardScores.studentId],
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
    }
    catch (err) {
        console.error("Failed to save scores:", err);
        res.status(500).json({ error: "Failed to save scores" });
    }
});
router.get("/:id/scores", async (req, res) => {
    const reportCardId = parseInt(req.params.id);
    // Optionally: check classroom/report card ownership here
    const scores = await drizzle_1.db
        .select()
        .from(schema_1.reportCardScores)
        .where((0, drizzle_orm_1.eq)(schema_1.reportCardScores.reportCardId, reportCardId));
    // Return as { [studentId]: scoreObj }
    const result = {};
    for (const row of scores) {
        result[row.studentId] = row.scores;
    }
    res.json(result);
});
router.get("/report/:token", async (req, res) => {
    const { token } = req.params;
    console.log("Token received:", token); // <-- Add this
    const [row] = await drizzle_1.db
        .select()
        .from(schema_1.reportCardTokens)
        .where((0, drizzle_orm_1.eq)(schema_1.reportCardTokens.token, token));
    console.log("DB row:", row); // <-- Add this
    if (!row)
        return res.status(404).json({ error: "Invalid or expired link" });
    // Fetch student info
    const [student] = await drizzle_1.db.select().from(schema_1.students).where((0, drizzle_orm_1.eq)(schema_1.students.id, row.studentId));
    // Fetch report card info
    const [reportCard] = await drizzle_1.db.select().from(schema_1.reportCards).where((0, drizzle_orm_1.eq)(schema_1.reportCards.id, row.reportCardId));
    // Fetch scores
    const [score] = await drizzle_1.db.select().from(schema_1.reportCardScores)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reportCardScores.reportCardId, row.reportCardId), (0, drizzle_orm_1.eq)(schema_1.reportCardScores.studentId, row.studentId)));
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
    function toPlasgateFormat(phone) {
        if (!phone)
            return "";
        phone = phone.replace(/[\s\-\(\)]/g, "");
        if (phone.startsWith("+855"))
            return phone.slice(1);
        if (phone.startsWith("855"))
            return phone;
        if (phone.startsWith("0") && phone.length >= 9)
            return "855" + phone.slice(1);
        return phone;
    }
    try {
        const studentList = await drizzle_1.db
            .select({
            id: schema_1.students.id,
            name: schema_1.students.name,
            parentPhone: schema_1.students.parentPhone,
        })
            .from(schema_1.students)
            .where((0, drizzle_orm_1.inArray)(schema_1.students.id, studentIds));
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
            const token = crypto_1.default.randomBytes(32).toString("hex");
            const reportUrl = `${process.env.FRONTEND_URL}/report/${token}`;
            // Fetch the report card to get its title
            const [reportCard] = await drizzle_1.db.select().from(schema_1.reportCards).where((0, drizzle_orm_1.eq)(schema_1.reportCards.id, reportCardId));
            const reportCardTitle = reportCard?.title || "";
            const smsMessage = `សូមចូលមើលរបាយការណ៍កូនអ្នក ${student.name} ប្រចាំ ${reportCardTitle}: ${reportUrl}`;
            // Insert the token into the DB (create or update)
            await drizzle_1.db.insert(schema_1.reportCardTokens).values({
                studentId: student.id,
                reportCardId,
                token,
                // createdAt will default to now
            }).onConflictDoNothing(); // Prevent duplicate tokens for same student/report
            console.log("Sending SMS to:", formattedPhone, "with message:", smsMessage);
            try {
                const response = await axios_1.default.post(`https://cloudapi.plasgate.com/rest/send?private_key=${process.env.PLASGATE_API_KEY}`, {
                    sender: process.env.PLASGATE_SENDER,
                    to: formattedPhone,
                    content: smsMessage,
                }, {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Secret": process.env.PLASGATE_X_SECRET,
                    },
                });
                console.log("PlasGate response:", response.data);
                results.push({
                    student: student.name,
                    phone: student.parentPhone,
                    formattedPhone,
                    status: "success",
                    data: response.data,
                    reportUrl,
                });
            }
            catch (smsError) {
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
    }
    catch (err) {
        res.status(500).json({ error: "Failed to send report card SMS" });
    }
});
// Update subjects for a report card
router.put("/:id/subjects", async (req, res) => {
    const id = parseInt(req.params.id);
    const { subjects } = req.body;
    if (!Array.isArray(subjects))
        return res.status(400).json({ error: "Invalid subjects" });
    await drizzle_1.db.update(schema_1.reportCards)
        .set({ subjects })
        .where((0, drizzle_orm_1.eq)(schema_1.reportCards.id, id));
    res.json({ success: true });
});
exports.default = router;
