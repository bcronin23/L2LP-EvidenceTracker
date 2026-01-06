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
  displayName: varchar("display_name", { length: 200 }),
  logoStoragePath: text("logo_storage_path"),
  accentColor: varchar("accent_color", { length: 7 }),
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
  storagePath: text("storage_path"),
  fileName: varchar("file_name", { length: 255 }),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
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
// STUDENT SUPPORT PLANS TABLE
// ============================================
export const studentSupportPlans = pgTable("student_support_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  organisationId: varchar("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  keyNeeds: text("key_needs"),
  strengths: text("strengths"),
  communicationSupports: text("communication_supports"),
  regulationSupports: text("regulation_supports"),
  targets: text("targets"),
  strategies: text("strategies"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ssp_student_id").on(table.studentId),
  index("idx_ssp_organisation_id").on(table.organisationId),
]);

export const studentSupportPlansRelations = relations(studentSupportPlans, ({ one, many }) => ({
  student: one(students, {
    fields: [studentSupportPlans.studentId],
    references: [students.id],
  }),
  organisation: one(organisations, {
    fields: [studentSupportPlans.organisationId],
    references: [organisations.id],
  }),
  attachments: many(supportPlanAttachments),
}));

export const insertStudentSupportPlanSchema = createInsertSchema(studentSupportPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStudentSupportPlan = z.infer<typeof insertStudentSupportPlanSchema>;
export type StudentSupportPlan = typeof studentSupportPlans.$inferSelect;

// ============================================
// SUPPORT PLAN ATTACHMENTS TABLE
// ============================================
export const supportPlanAttachments = pgTable("support_plan_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supportPlanId: varchar("support_plan_id").notNull().references(() => studentSupportPlans.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_spa_support_plan_id").on(table.supportPlanId),
]);

export const supportPlanAttachmentsRelations = relations(supportPlanAttachments, ({ one }) => ({
  supportPlan: one(studentSupportPlans, {
    fields: [supportPlanAttachments.supportPlanId],
    references: [studentSupportPlans.id],
  }),
}));

export const insertSupportPlanAttachmentSchema = createInsertSchema(supportPlanAttachments).omit({
  id: true,
  createdAt: true,
});

export type InsertSupportPlanAttachment = z.infer<typeof insertSupportPlanAttachmentSchema>;
export type SupportPlanAttachment = typeof supportPlanAttachments.$inferSelect;

// ============================================
// STUDENT PLANS TABLE (Weekly Planning)
// ============================================
export const studentPlans = pgTable("student_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  organisationId: varchar("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  weekStartDate: date("week_start_date").notNull(),
  planText: text("plan_text"),
  nextSteps: text("next_steps"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_sp_student_id").on(table.studentId),
  index("idx_sp_organisation_id").on(table.organisationId),
  index("idx_sp_week_start").on(table.weekStartDate),
]);

export const studentPlansRelations = relations(studentPlans, ({ one, many }) => ({
  student: one(students, {
    fields: [studentPlans.studentId],
    references: [students.id],
  }),
  organisation: one(organisations, {
    fields: [studentPlans.organisationId],
    references: [organisations.id],
  }),
  evidenceLinks: many(planEvidenceLinks),
}));

export const insertStudentPlanSchema = createInsertSchema(studentPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStudentPlan = z.infer<typeof insertStudentPlanSchema>;
export type StudentPlan = typeof studentPlans.$inferSelect;

// ============================================
// PLAN-EVIDENCE LINKS TABLE
// ============================================
export const planEvidenceLinks = pgTable("plan_evidence_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => studentPlans.id, { onDelete: "cascade" }),
  evidenceId: varchar("evidence_id").notNull().references(() => evidence.id, { onDelete: "cascade" }),
}, (table) => [
  index("idx_pel_plan_id").on(table.planId),
  index("idx_pel_evidence_id").on(table.evidenceId),
]);

export const planEvidenceLinksRelations = relations(planEvidenceLinks, ({ one }) => ({
  plan: one(studentPlans, {
    fields: [planEvidenceLinks.planId],
    references: [studentPlans.id],
  }),
  evidence: one(evidence, {
    fields: [planEvidenceLinks.evidenceId],
    references: [evidence.id],
  }),
}));

export const insertPlanEvidenceLinkSchema = createInsertSchema(planEvidenceLinks).omit({
  id: true,
});

export type InsertPlanEvidenceLink = z.infer<typeof insertPlanEvidenceLinkSchema>;
export type PlanEvidenceLink = typeof planEvidenceLinks.$inferSelect;

// ============================================
// SCHEMES OF WORK TABLE
// ============================================
export const schemesOfWork = pgTable("schemes_of_work", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organisationId: varchar("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  classGroup: varchar("class_group", { length: 50 }),
  term: varchar("term", { length: 50 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  storagePath: text("storage_path"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_sow_organisation_id").on(table.organisationId),
  index("idx_sow_class_group").on(table.classGroup),
  index("idx_sow_term").on(table.term),
]);

export const schemesOfWorkRelations = relations(schemesOfWork, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [schemesOfWork.organisationId],
    references: [organisations.id],
  }),
  studentLinks: many(schemeStudentLinks),
}));

export const insertSchemeOfWorkSchema = createInsertSchema(schemesOfWork).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSchemeOfWork = z.infer<typeof insertSchemeOfWorkSchema>;
export type SchemeOfWork = typeof schemesOfWork.$inferSelect;

// ============================================
// SCHEME-STUDENT LINKS TABLE
// ============================================
export const schemeStudentLinks = pgTable("scheme_student_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schemeId: varchar("scheme_id").notNull().references(() => schemesOfWork.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
}, (table) => [
  index("idx_ssl_scheme_id").on(table.schemeId),
  index("idx_ssl_student_id").on(table.studentId),
]);

export const schemeStudentLinksRelations = relations(schemeStudentLinks, ({ one }) => ({
  scheme: one(schemesOfWork, {
    fields: [schemeStudentLinks.schemeId],
    references: [schemesOfWork.id],
  }),
  student: one(students, {
    fields: [schemeStudentLinks.studentId],
    references: [students.id],
  }),
}));

export const insertSchemeStudentLinkSchema = createInsertSchema(schemeStudentLinks).omit({
  id: true,
});

export type InsertSchemeStudentLink = z.infer<typeof insertSchemeStudentLinkSchema>;
export type SchemeStudentLink = typeof schemeStudentLinks.$inferSelect;

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

// Student Support Plan types
export type StudentSupportPlanWithAttachments = StudentSupportPlan & {
  attachments: SupportPlanAttachment[];
};

// Student Plan types
export type StudentPlanWithEvidence = StudentPlan & {
  linkedEvidence: Evidence[];
};

// Scheme of Work types
export type SchemeOfWorkWithStudents = SchemeOfWork & {
  linkedStudents: Student[];
};
