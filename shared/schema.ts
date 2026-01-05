import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, index, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ============================================
// ORGANISATIONS TABLE
// ============================================
export const organisations = pgTable("organisations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  allowedDomains: text("allowed_domains").array(),
  inviteCode: varchar("invite_code", { length: 20 }).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_organisations_invite_code").on(table.inviteCode),
]);

export const organisationsRelations = relations(organisations, ({ many }) => ({
  members: many(organisationMembers),
  students: many(students),
}));

export const insertOrganisationSchema = createInsertSchema(organisations).omit({
  id: true,
  createdAt: true,
});

export type InsertOrganisation = z.infer<typeof insertOrganisationSchema>;
export type Organisation = typeof organisations.$inferSelect;

// ============================================
// ORGANISATION MEMBERS TABLE
// ============================================
export const memberRoleEnum = ["admin", "staff"] as const;

export const organisationMembers = pgTable("organisation_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organisationId: varchar("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_org_members_org_id").on(table.organisationId),
  index("idx_org_members_user_id").on(table.userId),
]);

export const organisationMembersRelations = relations(organisationMembers, ({ one }) => ({
  organisation: one(organisations, {
    fields: [organisationMembers.organisationId],
    references: [organisations.id],
  }),
}));

export const insertOrganisationMemberSchema = createInsertSchema(organisationMembers).omit({
  id: true,
  createdAt: true,
});

export type InsertOrganisationMember = z.infer<typeof insertOrganisationMemberSchema>;
export type OrganisationMember = typeof organisationMembers.$inferSelect;

// ============================================
// STUDENTS TABLE
// ============================================
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  organisationId: varchar("organisation_id").references(() => organisations.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  classGroup: varchar("class_group", { length: 50 }),
  yearGroup: varchar("year_group", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_students_user_id").on(table.userId),
  index("idx_students_organisation_id").on(table.organisationId),
]);

export const studentsRelations = relations(students, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [students.organisationId],
    references: [organisations.id],
  }),
  evidence: many(evidence),
}));

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
}).extend({
  organisationId: z.string().min(1, "Organisation ID is required"),
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// ============================================
// LEARNING OUTCOMES TABLE (PLU → Element → Outcome)
// ============================================
export const learningOutcomes = pgTable("learning_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programme: varchar("programme", { length: 50 }).notNull().default("L2LP"),
  pluNumber: integer("plu_number").notNull(),
  pluName: varchar("plu_name", { length: 100 }).notNull(),
  elementName: varchar("element_name", { length: 150 }).notNull(),
  outcomeCode: varchar("outcome_code", { length: 20 }).notNull(),
  outcomeText: text("outcome_text").notNull(),
}, (table) => [
  index("idx_learning_outcomes_plu").on(table.pluNumber),
  index("idx_learning_outcomes_code").on(table.outcomeCode),
  index("idx_learning_outcomes_element").on(table.elementName),
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
// EVIDENCE TABLE (Observation Sheet Structure)
// ============================================
export const evidenceTypeEnum = ["photo", "video", "audio", "work_sample", "other"] as const;
export const settingEnum = ["classroom", "community"] as const;
export const independenceLevelEnum = ["independent", "prompted", "partial", "refused"] as const;

export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  organisationId: varchar("organisation_id").references(() => organisations.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  dateOfActivity: date("date_of_activity").notNull(),
  setting: varchar("setting", { length: 20 }).notNull(),
  assessmentActivity: text("assessment_activity"),
  successCriteria: text("success_criteria"),
  observations: text("observations"),
  nextSteps: text("next_steps"),
  evidenceType: varchar("evidence_type", { length: 30 }).notNull(),
  staffInitials: varchar("staff_initials", { length: 10 }),
  independenceLevel: varchar("independence_level", { length: 20 }).notNull(),
  fileUrl: text("file_url"),
  fileName: varchar("file_name", { length: 255 }),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_evidence_user_id").on(table.userId),
  index("idx_evidence_organisation_id").on(table.organisationId),
  index("idx_evidence_student_id").on(table.studentId),
  index("idx_evidence_date").on(table.dateOfActivity),
  index("idx_evidence_setting").on(table.setting),
]);

export const evidenceRelations = relations(evidence, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [evidence.organisationId],
    references: [organisations.id],
  }),
  student: one(students, {
    fields: [evidence.studentId],
    references: [students.id],
  }),
  evidenceOutcomes: many(evidenceOutcomes),
}));

export const insertEvidenceSchema = createInsertSchema(evidence).omit({
  id: true,
  createdAt: true,
}).extend({
  organisationId: z.string().min(1, "Organisation ID is required"),
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
  lastEvidenceDate: string | null;
};

export type StudentWithStats = Student & {
  evidenceCount: number;
  outcomesCovered: number;
};

// PLU Coverage types for JCPA readiness
export type ElementCoverage = {
  elementName: string;
  totalOutcomes: number;
  evidencedOutcomes: number;
  percentage: number;
  hasMajority: boolean;
};

export type PLUCoverage = {
  pluNumber: number;
  pluName: string;
  elements: ElementCoverage[];
  totalOutcomes: number;
  evidencedOutcomes: number;
  percentage: number;
  isOnTrackForJCPA: boolean;
};

export type StudentPLUCoverage = {
  student: Student;
  plusCoverage: PLUCoverage[];
  missingOutcomes: LearningOutcome[];
  weakOutcomes: { outcome: LearningOutcome; count: number }[];
  overallPercentage: number;
};

// Organisation types
export type OrganisationWithMembers = Organisation & {
  members: OrganisationMember[];
  memberCount: number;
  studentCount: number;
};

export type UserMembership = {
  organisation: Organisation;
  role: "admin" | "staff";
  memberId: string;
};

export type MemberWithUser = OrganisationMember & {
  userName?: string;
  email?: string;
};
