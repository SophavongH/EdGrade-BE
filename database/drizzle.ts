import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { usersTable, students, classrooms, classroomStudents, reportCards, reportCardScores } from './schema';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Remove or comment out the ssl property for local Postgres!
  // ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema: { usersTable, students, classrooms, classroomStudents,  reportCards, reportCardScores } });
