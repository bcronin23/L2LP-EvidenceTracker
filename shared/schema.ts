import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ============================================
// STUDENTS TABLE
// ============================================
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  classGroup: varchar("class_group", { length: 50 }),
  year: varchar("year", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_students_user_id").on(table.userId),
]);

export const studentsRelations = relations(students, ({ many }) => ({
  evidence: many(evidence),
}));

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// ============================================
// LEARNING OUTCOMES TABLE
// ============================================
export const learningOutcomes = pgTable("learning_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull(),
  strand: varchar("strand", { length: 100 }).notNull(),
  description: text("description").notNull(),
  programme: varchar("programme", { length: 50 }).notNull().default("L2LP"),
}, (table) => [
  index("idx_learning_outcomes_code").on(table.code),
  index("idx_learning_outcomes_strand").on(table.strand),
]);

export const learningOutcomesRelations = relations(learningOutcomes, ({ many }) => ({
  evidenceOutcomes: many(evidenceOutcomes),
}));

export const insertLearningOutcomeSchema = createInsertSchema(learningOutcomes).omit({
  id: true,
});

export type InsertLearningOutcome = z.infer<typeof insertLearningOutcomeSchema>;
export type LearningOutcome = typeof learningOutcomes.$inferSelect;

// ============================================
// EVIDENCE TABLE
// ============================================
export const evidenceTypeEnum = ["photo", "video", "work_sample", "observation", "audio", "other"] as const;
export const contextSourceEnum = ["morning_work", "task_box", "community_trip", "lesson", "other"] as const;
export const independenceLevelEnum = ["independent", "partial", "prompted", "refused"] as const;

export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  dateOfActivity: timestamp("date_of_activity").notNull(),
  evidenceType: varchar("evidence_type", { length: 30 }).notNull(),
  contextSource: varchar("context_source", { length: 30 }).notNull(),
  staffInitials: varchar("staff_initials", { length: 10 }),
  notes: text("notes"),
  independenceLevel: varchar("independence_level", { length: 20 }).notNull(),
  fileUrl: text("file_url"),
  fileName: varchar("file_name", { length: 255 }),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_evidence_user_id").on(table.userId),
  index("idx_evidence_student_id").on(table.studentId),
  index("idx_evidence_date").on(table.dateOfActivity),
]);

export const evidenceRelations = relations(evidence, ({ one, many }) => ({
  student: one(students, {
    fields: [evidence.studentId],
    references: [students.id],
  }),
  evidenceOutcomes: many(evidenceOutcomes),
}));

export const insertEvidenceSchema = createInsertSchema(evidence).omit({
  id: true,
  createdAt: true,
});

export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidence.$inferSelect;

// ============================================
// EVIDENCE OUTCOMES JOIN TABLE (many-to-many)
// ============================================
export const evidenceOutcomes = pgTable("evidence_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  evidenceId: varchar("evidence_id").notNull().references(() => evidence.id, { onDelete: "cascade" }),
  learningOutcomeId: varchar("learning_outcome_id").notNull().references(() => learningOutcomes.id, { onDelete: "cascade" }),
}, (table) => [
  index("idx_evidence_outcomes_evidence").on(table.evidenceId),
  index("idx_evidence_outcomes_outcome").on(table.learningOutcomeId),
]);

export const evidenceOutcomesRelations = relations(evidenceOutcomes, ({ one }) => ({
  evidence: one(evidence, {
    fields: [evidenceOutcomes.evidenceId],
    references: [evidence.id],
  }),
  learningOutcome: one(learningOutcomes, {
    fields: [evidenceOutcomes.learningOutcomeId],
    references: [learningOutcomes.id],
  }),
}));

export const insertEvidenceOutcomeSchema = createInsertSchema(evidenceOutcomes).omit({
  id: true,
});

export type InsertEvidenceOutcome = z.infer<typeof insertEvidenceOutcomeSchema>;
export type EvidenceOutcome = typeof evidenceOutcomes.$inferSelect;

// ============================================
// API RESPONSE TYPES
// ============================================
export type EvidenceWithOutcomes = Evidence & {
  outcomes: LearningOutcome[];
  student?: Student;
};

export type OutcomeCoverage = {
  outcome: LearningOutcome;
  evidenceCount: number;
  lastEvidenceDate: Date | null;
};

export type StudentWithStats = Student & {
  evidenceCount: number;
  outcomesCovered: number;
};
