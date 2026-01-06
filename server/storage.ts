import {
  students,
  learningOutcomes,
  evidence,
  evidenceOutcomes,
  organisations,
  organisationMembers,
  staffProfiles,
  studentSupportPlans,
  supportPlanAttachments,
  studentPlans,
  planEvidenceLinks,
  schemesOfWork,
  schemeStudentLinks,
  type Student,
  type InsertStudent,
  type LearningOutcome,
  type InsertLearningOutcome,
  type Evidence,
  type InsertEvidence,
  type EvidenceWithOutcomes,
  type StudentWithStats,
  type OutcomeCoverage,
  type PLUCoverage,
  type ElementCoverage,
  type StudentPLUCoverage,
  type Organisation,
  type InsertOrganisation,
  type OrganisationMember,
  type InsertOrganisationMember,
  type UserMembership,
  type StaffProfile,
  type InsertStaffProfile,
  type StudentSupportPlan,
  type InsertStudentSupportPlan,
  type SupportPlanAttachment,
  type InsertSupportPlanAttachment,
  type StudentSupportPlanWithAttachments,
  type StudentPlan,
  type InsertStudentPlan,
  type PlanEvidenceLink,
  type InsertPlanEvidenceLink,
  type StudentPlanWithEvidence,
  type SchemeOfWork,
  type InsertSchemeOfWork,
  type SchemeStudentLink,
  type InsertSchemeStudentLink,
  type SchemeOfWorkWithStudents,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, count, or, isNull } from "drizzle-orm";

export interface IStorage {
  // Organisations
  getOrganisation(id: string): Promise<Organisation | undefined>;
  getOrganisationByInviteCode(code: string): Promise<Organisation | undefined>;
  createOrganisation(data: InsertOrganisation): Promise<Organisation>;
  updateOrganisation(id: string, data: Partial<InsertOrganisation>): Promise<Organisation | undefined>;
  deleteOrganisation(id: string): Promise<boolean>;
  generateInviteCode(organisationId: string): Promise<string>;

  // Organisation Members
  getUserMembership(userId: string): Promise<UserMembership | undefined>;
  getOrganisationMembers(organisationId: string): Promise<OrganisationMember[]>;
  addMember(data: InsertOrganisationMember): Promise<OrganisationMember>;
  updateMemberRole(memberId: string, role: "admin" | "staff"): Promise<OrganisationMember | undefined>;
  removeMember(memberId: string): Promise<boolean>;
  joinOrganisationByCode(userId: string, inviteCode: string): Promise<OrganisationMember | undefined>;

  // Staff Profiles
  getStaffProfile(userId: string): Promise<StaffProfile | undefined>;
  getStaffProfilesByOrganisation(organisationId: string): Promise<StaffProfile[]>;
  createStaffProfile(data: InsertStaffProfile): Promise<StaffProfile>;
  updateStaffProfile(userId: string, data: Partial<InsertStaffProfile>): Promise<StaffProfile | undefined>;

  // Learning Outcomes (with programme filtering)
  getOutcomesByProgramme(cycle: string, programmeType: string): Promise<LearningOutcome[]>;
  deleteOutcomesByProgrammeFilter(cycle: string, programmeType: string): Promise<number>;

  // Students (scoped by organisation - all CRUD requires organisationId)
  getStudentsByOrganisation(organisationId: string): Promise<StudentWithStats[]>;
  getStudentByOrganisation(id: string, organisationId: string): Promise<Student | undefined>;
  createStudent(data: InsertStudent): Promise<Student>;
  updateStudentByOrganisation(id: string, organisationId: string, data: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudentByOrganisation(id: string, organisationId: string): Promise<boolean>;

  // Learning Outcomes
  getOutcomes(): Promise<LearningOutcome[]>;
  getOutcome(id: string): Promise<LearningOutcome | undefined>;
  createOutcome(data: InsertLearningOutcome): Promise<LearningOutcome>;
  createOutcomesBatch(data: InsertLearningOutcome[]): Promise<LearningOutcome[]>;
  deleteOutcomesByProgramme(programme: string): Promise<number>;

  // Evidence (scoped by organisation - all CRUD requires organisationId)
  getEvidenceByOrganisation(organisationId: string): Promise<EvidenceWithOutcomes[]>;
  getStudentEvidenceByOrganisation(studentId: string, organisationId: string): Promise<EvidenceWithOutcomes[]>;
  getEvidenceByOrgAndId(id: string, organisationId: string): Promise<EvidenceWithOutcomes | undefined>;
  createEvidence(data: InsertEvidence, outcomeIds: string[]): Promise<Evidence>;
  deleteEvidenceByOrganisation(id: string, organisationId: string): Promise<boolean>;

  // Coverage (scoped by organisation)
  getStudentCoverageByOrganisation(studentId: string, organisationId: string): Promise<OutcomeCoverage[]>;
  getStudentPLUCoverageByOrganisation(studentId: string, organisationId: string): Promise<StudentPLUCoverage>;

  // Evidence soft delete (admin only)
  softDeleteEvidence(id: string, organisationId: string): Promise<boolean>;

  // Student Support Plans
  getStudentSupportPlans(studentId: string, organisationId: string): Promise<StudentSupportPlanWithAttachments[]>;
  getStudentSupportPlan(id: string, organisationId: string): Promise<StudentSupportPlanWithAttachments | undefined>;
  createStudentSupportPlan(data: InsertStudentSupportPlan): Promise<StudentSupportPlan>;
  updateStudentSupportPlan(id: string, organisationId: string, data: Partial<InsertStudentSupportPlan>): Promise<StudentSupportPlan | undefined>;
  deleteStudentSupportPlan(id: string, organisationId: string): Promise<boolean>;

  // Support Plan Attachments
  addSupportPlanAttachment(data: InsertSupportPlanAttachment): Promise<SupportPlanAttachment>;
  deleteSupportPlanAttachment(id: string, organisationId: string): Promise<boolean>;

  // Student Plans (Weekly Planning)
  getStudentPlans(studentId: string, organisationId: string): Promise<StudentPlanWithEvidence[]>;
  getStudentPlan(id: string, organisationId: string): Promise<StudentPlanWithEvidence | undefined>;
  createStudentPlan(data: InsertStudentPlan): Promise<StudentPlan>;
  updateStudentPlan(id: string, organisationId: string, data: Partial<InsertStudentPlan>): Promise<StudentPlan | undefined>;
  deleteStudentPlan(id: string, organisationId: string): Promise<boolean>;
  linkEvidenceToPlan(data: InsertPlanEvidenceLink): Promise<PlanEvidenceLink>;
  unlinkEvidenceFromPlan(planId: string, evidenceId: string): Promise<boolean>;

  // Schemes of Work
  getSchemesOfWork(organisationId: string): Promise<SchemeOfWorkWithStudents[]>;
  getSchemeOfWork(id: string, organisationId: string): Promise<SchemeOfWorkWithStudents | undefined>;
  getStudentSchemes(studentId: string, organisationId: string, classGroup?: string): Promise<SchemeOfWorkWithStudents[]>;
  createSchemeOfWork(data: InsertSchemeOfWork): Promise<SchemeOfWork>;
  updateSchemeOfWork(id: string, organisationId: string, data: Partial<InsertSchemeOfWork>): Promise<SchemeOfWork | undefined>;
  deleteSchemeOfWork(id: string, organisationId: string): Promise<boolean>;
  linkStudentToScheme(data: InsertSchemeStudentLink): Promise<SchemeStudentLink>;
  unlinkStudentFromScheme(schemeId: string, studentId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // ==================== Organisations ====================
  async getOrganisation(id: string): Promise<Organisation | undefined> {
    const [org] = await db.select().from(organisations).where(eq(organisations.id, id));
    return org || undefined;
  }

  async getOrganisationByInviteCode(code: string): Promise<Organisation | undefined> {
    const [org] = await db.select().from(organisations).where(eq(organisations.inviteCode, code));
    return org || undefined;
  }

  async createOrganisation(data: InsertOrganisation): Promise<Organisation> {
    const inviteCode = this.generateRandomCode();
    const [org] = await db.insert(organisations).values({ ...data, inviteCode }).returning();
    return org;
  }

  async updateOrganisation(id: string, data: Partial<InsertOrganisation>): Promise<Organisation | undefined> {
    const [org] = await db.update(organisations).set(data).where(eq(organisations.id, id)).returning();
    return org || undefined;
  }

  async deleteOrganisation(id: string): Promise<boolean> {
    const result = await db.delete(organisations).where(eq(organisations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async generateInviteCode(organisationId: string): Promise<string> {
    const code = this.generateRandomCode();
    await db.update(organisations).set({ inviteCode: code }).where(eq(organisations.id, organisationId));
    return code;
  }

  private generateRandomCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ==================== Organisation Members ====================
  async getUserMembership(userId: string): Promise<UserMembership | undefined> {
    const [member] = await db
      .select({
        member: organisationMembers,
        organisation: organisations,
      })
      .from(organisationMembers)
      .innerJoin(organisations, eq(organisations.id, organisationMembers.organisationId))
      .where(eq(organisationMembers.userId, userId));

    if (!member) return undefined;

    return {
      organisation: member.organisation,
      role: member.member.role as "admin" | "staff",
      memberId: member.member.id,
    };
  }

  async getOrganisationMembers(organisationId: string): Promise<OrganisationMember[]> {
    return db
      .select()
      .from(organisationMembers)
      .where(eq(organisationMembers.organisationId, organisationId))
      .orderBy(organisationMembers.createdAt);
  }

  async addMember(data: InsertOrganisationMember): Promise<OrganisationMember> {
    const [member] = await db.insert(organisationMembers).values(data).returning();
    return member;
  }

  async updateMemberRole(memberId: string, role: "admin" | "staff"): Promise<OrganisationMember | undefined> {
    const [member] = await db
      .update(organisationMembers)
      .set({ role })
      .where(eq(organisationMembers.id, memberId))
      .returning();
    return member || undefined;
  }

  async removeMember(memberId: string): Promise<boolean> {
    const result = await db.delete(organisationMembers).where(eq(organisationMembers.id, memberId));
    return (result.rowCount ?? 0) > 0;
  }

  async joinOrganisationByCode(userId: string, inviteCode: string): Promise<OrganisationMember | undefined> {
    const org = await this.getOrganisationByInviteCode(inviteCode);
    if (!org) return undefined;

    const existing = await this.getUserMembership(userId);
    if (existing) return undefined;

    return this.addMember({
      organisationId: org.id,
      userId,
      role: "staff",
    });
  }

  // ==================== Staff Profiles ====================
  async getStaffProfile(userId: string): Promise<StaffProfile | undefined> {
    const [profile] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, userId));
    return profile || undefined;
  }

  async getStaffProfilesByOrganisation(organisationId: string): Promise<StaffProfile[]> {
    return db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.organisationId, organisationId))
      .orderBy(staffProfiles.firstName, staffProfiles.lastName);
  }

  async createStaffProfile(data: InsertStaffProfile): Promise<StaffProfile> {
    const [profile] = await db.insert(staffProfiles).values(data).returning();
    return profile;
  }

  async updateStaffProfile(userId: string, data: Partial<InsertStaffProfile>): Promise<StaffProfile | undefined> {
    const [profile] = await db
      .update(staffProfiles)
      .set(data)
      .where(eq(staffProfiles.userId, userId))
      .returning();
    return profile || undefined;
  }

  // ==================== Learning Outcomes (Programme Filtering) ====================
  async getOutcomesByProgramme(cycle: string, programmeType: string): Promise<LearningOutcome[]> {
    return db
      .select()
      .from(learningOutcomes)
      .where(
        and(
          eq(learningOutcomes.cycle, cycle),
          eq(learningOutcomes.programmeType, programmeType)
        )
      )
      .orderBy(learningOutcomes.pluNumber, learningOutcomes.outcomeCode);
  }

  async deleteOutcomesByProgrammeFilter(cycle: string, programmeType: string): Promise<number> {
    const result = await db.delete(learningOutcomes).where(
      and(
        eq(learningOutcomes.cycle, cycle),
        eq(learningOutcomes.programmeType, programmeType)
      )
    );
    return result.rowCount ?? 0;
  }

  // ==================== Students ====================
  async getStudents(userId: string): Promise<StudentWithStats[]> {
    const result = await db
      .select({
        student: students,
        evidenceCount: sql<number>`COALESCE(COUNT(DISTINCT ${evidence.id}), 0)::int`,
        outcomesCovered: sql<number>`COALESCE(COUNT(DISTINCT ${evidenceOutcomes.learningOutcomeId}), 0)::int`,
      })
      .from(students)
      .leftJoin(evidence, eq(evidence.studentId, students.id))
      .leftJoin(evidenceOutcomes, eq(evidenceOutcomes.evidenceId, evidence.id))
      .where(eq(students.userId, userId))
      .groupBy(students.id)
      .orderBy(students.firstName, students.lastName);

    return result.map((row) => ({
      ...row.student,
      evidenceCount: row.evidenceCount,
      outcomesCovered: row.outcomesCovered,
    }));
  }

  async getStudentsByOrganisation(organisationId: string): Promise<StudentWithStats[]> {
    const result = await db
      .select({
        student: students,
        evidenceCount: sql<number>`COALESCE(COUNT(DISTINCT ${evidence.id}), 0)::int`,
        outcomesCovered: sql<number>`COALESCE(COUNT(DISTINCT ${evidenceOutcomes.learningOutcomeId}), 0)::int`,
      })
      .from(students)
      .leftJoin(evidence, eq(evidence.studentId, students.id))
      .leftJoin(evidenceOutcomes, eq(evidenceOutcomes.evidenceId, evidence.id))
      .where(eq(students.organisationId, organisationId))
      .groupBy(students.id)
      .orderBy(students.firstName, students.lastName);

    return result.map((row) => ({
      ...row.student,
      evidenceCount: row.evidenceCount,
      outcomesCovered: row.outcomesCovered,
    }));
  }

  async getStudent(id: string, userId: string): Promise<Student | undefined> {
    const [student] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, id), eq(students.userId, userId)));
    return student || undefined;
  }

  async getStudentByOrganisation(id: string, organisationId: string): Promise<Student | undefined> {
    const [student] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, id), eq(students.organisationId, organisationId)));
    return student || undefined;
  }

  async createStudent(data: InsertStudent): Promise<Student> {
    if (!data.organisationId) {
      throw new Error("Organisation ID is required to create a student");
    }
    const [student] = await db.insert(students).values(data).returning();
    return student;
  }

  async updateStudent(id: string, userId: string, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const [student] = await db
      .update(students)
      .set(data)
      .where(and(eq(students.id, id), eq(students.userId, userId)))
      .returning();
    return student || undefined;
  }

  async updateStudentByOrganisation(id: string, organisationId: string, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const [student] = await db
      .update(students)
      .set(data)
      .where(and(eq(students.id, id), eq(students.organisationId, organisationId)))
      .returning();
    return student || undefined;
  }

  async deleteStudent(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(students)
      .where(and(eq(students.id, id), eq(students.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteStudentByOrganisation(id: string, organisationId: string): Promise<boolean> {
    const result = await db
      .delete(students)
      .where(and(eq(students.id, id), eq(students.organisationId, organisationId)));
    return (result.rowCount ?? 0) > 0;
  }

  // ==================== Learning Outcomes ====================
  async getOutcomes(): Promise<LearningOutcome[]> {
    return db.select().from(learningOutcomes).orderBy(learningOutcomes.pluNumber, learningOutcomes.outcomeCode);
  }

  async getOutcome(id: string): Promise<LearningOutcome | undefined> {
    const [outcome] = await db.select().from(learningOutcomes).where(eq(learningOutcomes.id, id));
    return outcome || undefined;
  }

  async createOutcome(data: InsertLearningOutcome): Promise<LearningOutcome> {
    const [outcome] = await db.insert(learningOutcomes).values(data).returning();
    return outcome;
  }

  async createOutcomesBatch(data: InsertLearningOutcome[]): Promise<LearningOutcome[]> {
    if (data.length === 0) return [];
    const outcomes = await db.insert(learningOutcomes).values(data).returning();
    return outcomes;
  }

  async deleteOutcomesByProgramme(programmeName: string): Promise<number> {
    const result = await db.delete(learningOutcomes).where(eq(learningOutcomes.programmeName, programmeName));
    return result.rowCount ?? 0;
  }

  // ==================== Evidence ====================
  async getAllEvidence(userId: string): Promise<EvidenceWithOutcomes[]> {
    const evidenceList = await db
      .select()
      .from(evidence)
      .where(eq(evidence.userId, userId))
      .orderBy(desc(evidence.dateOfActivity));

    return this.enrichEvidenceWithOutcomes(evidenceList);
  }

  async getEvidenceByOrganisation(organisationId: string): Promise<EvidenceWithOutcomes[]> {
    const evidenceList = await db
      .select()
      .from(evidence)
      .where(and(eq(evidence.organisationId, organisationId), isNull(evidence.deletedAt)))
      .orderBy(desc(evidence.dateOfActivity));

    return this.enrichEvidenceWithOutcomes(evidenceList);
  }

  async getStudentEvidence(studentId: string, userId: string): Promise<EvidenceWithOutcomes[]> {
    const evidenceList = await db
      .select()
      .from(evidence)
      .where(and(eq(evidence.studentId, studentId), eq(evidence.userId, userId)))
      .orderBy(desc(evidence.dateOfActivity));

    return this.enrichEvidenceWithOutcomes(evidenceList);
  }

  async getStudentEvidenceByOrganisation(studentId: string, organisationId: string): Promise<EvidenceWithOutcomes[]> {
    const evidenceList = await db
      .select()
      .from(evidence)
      .where(and(eq(evidence.studentId, studentId), eq(evidence.organisationId, organisationId), isNull(evidence.deletedAt)))
      .orderBy(desc(evidence.dateOfActivity));

    return this.enrichEvidenceWithOutcomes(evidenceList);
  }

  async getEvidence(id: string, userId: string): Promise<EvidenceWithOutcomes | undefined> {
    const [evidenceItem] = await db
      .select()
      .from(evidence)
      .where(and(eq(evidence.id, id), eq(evidence.userId, userId)));

    if (!evidenceItem) return undefined;

    const enriched = await this.enrichEvidenceWithOutcomes([evidenceItem]);
    return enriched[0];
  }

  async getEvidenceByOrgAndId(id: string, organisationId: string): Promise<EvidenceWithOutcomes | undefined> {
    const [evidenceItem] = await db
      .select()
      .from(evidence)
      .where(and(eq(evidence.id, id), eq(evidence.organisationId, organisationId)));

    if (!evidenceItem) return undefined;

    const enriched = await this.enrichEvidenceWithOutcomes([evidenceItem]);
    return enriched[0];
  }

  async createEvidence(data: InsertEvidence, outcomeIds: string[]): Promise<Evidence> {
    if (!data.organisationId) {
      throw new Error("Organisation ID is required to create evidence");
    }
    const [evidenceItem] = await db.insert(evidence).values(data).returning();

    if (outcomeIds.length > 0) {
      await db.insert(evidenceOutcomes).values(
        outcomeIds.map((outcomeId) => ({
          evidenceId: evidenceItem.id,
          learningOutcomeId: outcomeId,
        }))
      );
    }

    return evidenceItem;
  }

  async deleteEvidence(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(evidence)
      .where(and(eq(evidence.id, id), eq(evidence.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteEvidenceByOrganisation(id: string, organisationId: string): Promise<boolean> {
    const result = await db
      .delete(evidence)
      .where(and(eq(evidence.id, id), eq(evidence.organisationId, organisationId)));
    return (result.rowCount ?? 0) > 0;
  }

  private async enrichEvidenceWithOutcomes(evidenceList: Evidence[]): Promise<EvidenceWithOutcomes[]> {
    if (evidenceList.length === 0) return [];

    const evidenceIds = evidenceList.map((e) => e.id);
    const studentIds = Array.from(new Set(evidenceList.map((e) => e.studentId)));

    // Get all related outcomes
    const outcomeLinks = await db
      .select({
        evidenceId: evidenceOutcomes.evidenceId,
        outcome: learningOutcomes,
      })
      .from(evidenceOutcomes)
      .innerJoin(learningOutcomes, eq(learningOutcomes.id, evidenceOutcomes.learningOutcomeId))
      .where(sql`${evidenceOutcomes.evidenceId} = ANY(${evidenceIds})`);

    // Get all related students
    const studentList = await db
      .select()
      .from(students)
      .where(sql`${students.id} = ANY(${studentIds})`);

    const outcomesByEvidence = new Map<string, LearningOutcome[]>();
    outcomeLinks.forEach((link) => {
      const existing = outcomesByEvidence.get(link.evidenceId) || [];
      existing.push(link.outcome);
      outcomesByEvidence.set(link.evidenceId, existing);
    });

    const studentsById = new Map(studentList.map((s) => [s.id, s]));

    return evidenceList.map((e) => ({
      ...e,
      outcomes: outcomesByEvidence.get(e.id) || [],
      student: studentsById.get(e.studentId),
    }));
  }

  // ==================== Coverage ====================
  async getStudentCoverage(studentId: string, userId: string): Promise<OutcomeCoverage[]> {
    const allOutcomes = await this.getOutcomes();

    const coverageData = await db
      .select({
        learningOutcomeId: evidenceOutcomes.learningOutcomeId,
        evidenceCount: sql<number>`COUNT(DISTINCT ${evidenceOutcomes.evidenceId})::int`,
        lastEvidenceDate: sql<string | null>`MAX(${evidence.dateOfActivity})::text`,
      })
      .from(evidenceOutcomes)
      .innerJoin(evidence, eq(evidence.id, evidenceOutcomes.evidenceId))
      .where(and(eq(evidence.studentId, studentId), eq(evidence.userId, userId)))
      .groupBy(evidenceOutcomes.learningOutcomeId);

    const coverageMap = new Map(
      coverageData.map((c) => [c.learningOutcomeId, c])
    );

    return allOutcomes.map((outcome) => {
      const coverage = coverageMap.get(outcome.id);
      return {
        outcome,
        evidenceCount: coverage?.evidenceCount || 0,
        lastEvidenceDate: coverage?.lastEvidenceDate || null,
      };
    });
  }

  async getStudentPLUCoverage(studentId: string, userId: string): Promise<StudentPLUCoverage> {
    const allOutcomes = await this.getOutcomes();
    const student = await this.getStudent(studentId, userId);
    
    if (!student) {
      throw new Error("Student not found");
    }

    // Get all evidenced outcome IDs for this student
    const evidencedOutcomes = await db
      .select({
        learningOutcomeId: evidenceOutcomes.learningOutcomeId,
        evidenceCount: sql<number>`COUNT(DISTINCT ${evidenceOutcomes.evidenceId})::int`,
      })
      .from(evidenceOutcomes)
      .innerJoin(evidence, eq(evidence.id, evidenceOutcomes.evidenceId))
      .where(and(eq(evidence.studentId, studentId), eq(evidence.userId, userId)))
      .groupBy(evidenceOutcomes.learningOutcomeId);

    const evidenceMap = new Map(
      evidencedOutcomes.map((e) => [e.learningOutcomeId, e.evidenceCount])
    );

    // Group outcomes by PLU and Element
    const pluMap = new Map<number, { pluName: string; elements: Map<string, LearningOutcome[]> }>();
    
    allOutcomes.forEach((outcome) => {
      if (!pluMap.has(outcome.pluNumber)) {
        pluMap.set(outcome.pluNumber, {
          pluName: outcome.pluName,
          elements: new Map(),
        });
      }
      const plu = pluMap.get(outcome.pluNumber)!;
      if (!plu.elements.has(outcome.elementName)) {
        plu.elements.set(outcome.elementName, []);
      }
      plu.elements.get(outcome.elementName)!.push(outcome);
    });

    // Calculate coverage for each PLU
    const plusCoverage: PLUCoverage[] = [];
    const missingOutcomes: LearningOutcome[] = [];
    const weakOutcomes: { outcome: LearningOutcome; count: number }[] = [];

    pluMap.forEach((pluData, pluNumber) => {
      const elements: ElementCoverage[] = [];
      let pluTotalOutcomes = 0;
      let pluEvidencedOutcomes = 0;

      pluData.elements.forEach((outcomes, elementName) => {
        const totalInElement = outcomes.length;
        const evidencedInElement = outcomes.filter(o => evidenceMap.has(o.id)).length;
        const percentage = totalInElement > 0 ? Math.round((evidencedInElement / totalInElement) * 100) : 0;
        const hasMajority = evidencedInElement > totalInElement / 2;

        elements.push({
          elementName,
          totalOutcomes: totalInElement,
          evidencedOutcomes: evidencedInElement,
          percentage,
          hasMajority,
        });

        pluTotalOutcomes += totalInElement;
        pluEvidencedOutcomes += evidencedInElement;

        // Track missing and weak outcomes
        outcomes.forEach((outcome) => {
          const count = evidenceMap.get(outcome.id) || 0;
          if (count === 0) {
            missingOutcomes.push(outcome);
          } else if (count === 1) {
            weakOutcomes.push({ outcome, count });
          }
        });
      });

      // JCPA readiness: ALL elements must have majority coverage
      const isOnTrackForJCPA = elements.every(e => e.hasMajority);
      const pluPercentage = pluTotalOutcomes > 0 ? Math.round((pluEvidencedOutcomes / pluTotalOutcomes) * 100) : 0;

      plusCoverage.push({
        pluNumber,
        pluName: pluData.pluName,
        elements,
        totalOutcomes: pluTotalOutcomes,
        evidencedOutcomes: pluEvidencedOutcomes,
        percentage: pluPercentage,
        isOnTrackForJCPA,
      });
    });

    // Sort by PLU number
    plusCoverage.sort((a, b) => a.pluNumber - b.pluNumber);

    const totalOutcomes = allOutcomes.length;
    const totalEvidenced = evidenceMap.size; // Count unique outcomes with evidence
    const overallPercentage = totalOutcomes > 0 ? Math.round((totalEvidenced / totalOutcomes) * 100) : 0;

    return {
      student,
      plusCoverage,
      missingOutcomes,
      weakOutcomes,
      overallPercentage,
    };
  }

  async getStudentCoverageByOrganisation(studentId: string, organisationId: string): Promise<OutcomeCoverage[]> {
    const allOutcomes = await this.getOutcomes();

    const coverageData = await db
      .select({
        learningOutcomeId: evidenceOutcomes.learningOutcomeId,
        evidenceCount: sql<number>`COUNT(DISTINCT ${evidenceOutcomes.evidenceId})::int`,
        lastEvidenceDate: sql<string | null>`MAX(${evidence.dateOfActivity})::text`,
      })
      .from(evidenceOutcomes)
      .innerJoin(evidence, eq(evidence.id, evidenceOutcomes.evidenceId))
      .where(and(eq(evidence.studentId, studentId), eq(evidence.organisationId, organisationId)))
      .groupBy(evidenceOutcomes.learningOutcomeId);

    const coverageMap = new Map(
      coverageData.map((c) => [c.learningOutcomeId, c])
    );

    return allOutcomes.map((outcome) => {
      const coverage = coverageMap.get(outcome.id);
      return {
        outcome,
        evidenceCount: coverage?.evidenceCount || 0,
        lastEvidenceDate: coverage?.lastEvidenceDate || null,
      };
    });
  }

  async getStudentPLUCoverageByOrganisation(studentId: string, organisationId: string): Promise<StudentPLUCoverage> {
    const allOutcomes = await this.getOutcomes();
    const student = await this.getStudentByOrganisation(studentId, organisationId);
    
    if (!student) {
      throw new Error("Student not found");
    }

    const evidencedOutcomes = await db
      .select({
        learningOutcomeId: evidenceOutcomes.learningOutcomeId,
        evidenceCount: sql<number>`COUNT(DISTINCT ${evidenceOutcomes.evidenceId})::int`,
      })
      .from(evidenceOutcomes)
      .innerJoin(evidence, eq(evidence.id, evidenceOutcomes.evidenceId))
      .where(and(eq(evidence.studentId, studentId), eq(evidence.organisationId, organisationId)))
      .groupBy(evidenceOutcomes.learningOutcomeId);

    const evidenceMap = new Map(
      evidencedOutcomes.map((e) => [e.learningOutcomeId, e.evidenceCount])
    );

    const pluMap = new Map<number, { pluName: string; elements: Map<string, LearningOutcome[]> }>();
    
    allOutcomes.forEach((outcome) => {
      if (!pluMap.has(outcome.pluNumber)) {
        pluMap.set(outcome.pluNumber, {
          pluName: outcome.pluName,
          elements: new Map(),
        });
      }
      const plu = pluMap.get(outcome.pluNumber)!;
      if (!plu.elements.has(outcome.elementName)) {
        plu.elements.set(outcome.elementName, []);
      }
      plu.elements.get(outcome.elementName)!.push(outcome);
    });

    const plusCoverage: PLUCoverage[] = [];
    const missingOutcomes: LearningOutcome[] = [];
    const weakOutcomes: { outcome: LearningOutcome; count: number }[] = [];

    pluMap.forEach((pluData, pluNumber) => {
      const elements: ElementCoverage[] = [];
      let pluTotalOutcomes = 0;
      let pluEvidencedOutcomes = 0;

      pluData.elements.forEach((outcomes, elementName) => {
        const totalInElement = outcomes.length;
        const evidencedInElement = outcomes.filter(o => evidenceMap.has(o.id)).length;
        const percentage = totalInElement > 0 ? Math.round((evidencedInElement / totalInElement) * 100) : 0;
        const hasMajority = evidencedInElement > totalInElement / 2;

        elements.push({
          elementName,
          totalOutcomes: totalInElement,
          evidencedOutcomes: evidencedInElement,
          percentage,
          hasMajority,
        });

        pluTotalOutcomes += totalInElement;
        pluEvidencedOutcomes += evidencedInElement;

        outcomes.forEach((outcome) => {
          const count = evidenceMap.get(outcome.id) || 0;
          if (count === 0) {
            missingOutcomes.push(outcome);
          } else if (count === 1) {
            weakOutcomes.push({ outcome, count });
          }
        });
      });

      const isOnTrackForJCPA = elements.every(e => e.hasMajority);
      const pluPercentage = pluTotalOutcomes > 0 ? Math.round((pluEvidencedOutcomes / pluTotalOutcomes) * 100) : 0;

      plusCoverage.push({
        pluNumber,
        pluName: pluData.pluName,
        elements,
        totalOutcomes: pluTotalOutcomes,
        evidencedOutcomes: pluEvidencedOutcomes,
        percentage: pluPercentage,
        isOnTrackForJCPA,
      });
    });

    plusCoverage.sort((a, b) => a.pluNumber - b.pluNumber);

    const totalOutcomes = allOutcomes.length;
    const totalEvidenced = evidenceMap.size;
    const overallPercentage = totalOutcomes > 0 ? Math.round((totalEvidenced / totalOutcomes) * 100) : 0;

    return {
      student,
      plusCoverage,
      missingOutcomes,
      weakOutcomes,
      overallPercentage,
    };
  }

  // ==================== Evidence Soft Delete ====================
  async softDeleteEvidence(id: string, organisationId: string): Promise<boolean> {
    const result = await db
      .update(evidence)
      .set({ deletedAt: new Date() })
      .where(and(eq(evidence.id, id), eq(evidence.organisationId, organisationId)))
      .returning();
    return result.length > 0;
  }

  // ==================== Student Support Plans ====================
  async getStudentSupportPlans(studentId: string, organisationId: string): Promise<StudentSupportPlanWithAttachments[]> {
    const plans = await db
      .select()
      .from(studentSupportPlans)
      .where(and(eq(studentSupportPlans.studentId, studentId), eq(studentSupportPlans.organisationId, organisationId)))
      .orderBy(desc(studentSupportPlans.updatedAt));

    return this.enrichPlansWithAttachments(plans);
  }

  async getStudentSupportPlan(id: string, organisationId: string): Promise<StudentSupportPlanWithAttachments | undefined> {
    const [plan] = await db
      .select()
      .from(studentSupportPlans)
      .where(and(eq(studentSupportPlans.id, id), eq(studentSupportPlans.organisationId, organisationId)));

    if (!plan) return undefined;
    const enriched = await this.enrichPlansWithAttachments([plan]);
    return enriched[0];
  }

  async createStudentSupportPlan(data: InsertStudentSupportPlan): Promise<StudentSupportPlan> {
    const [plan] = await db.insert(studentSupportPlans).values(data).returning();
    return plan;
  }

  async updateStudentSupportPlan(id: string, organisationId: string, data: Partial<InsertStudentSupportPlan>): Promise<StudentSupportPlan | undefined> {
    const [plan] = await db
      .update(studentSupportPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(studentSupportPlans.id, id), eq(studentSupportPlans.organisationId, organisationId)))
      .returning();
    return plan || undefined;
  }

  async deleteStudentSupportPlan(id: string, organisationId: string): Promise<boolean> {
    const result = await db
      .delete(studentSupportPlans)
      .where(and(eq(studentSupportPlans.id, id), eq(studentSupportPlans.organisationId, organisationId)));
    return (result.rowCount ?? 0) > 0;
  }

  private async enrichPlansWithAttachments(plans: StudentSupportPlan[]): Promise<StudentSupportPlanWithAttachments[]> {
    if (plans.length === 0) return [];

    const planIds = plans.map((p) => p.id);
    const attachments = await db
      .select()
      .from(supportPlanAttachments)
      .where(sql`${supportPlanAttachments.supportPlanId} = ANY(${planIds})`);

    const attachmentsByPlan = new Map<string, SupportPlanAttachment[]>();
    attachments.forEach((att) => {
      const existing = attachmentsByPlan.get(att.supportPlanId) || [];
      existing.push(att);
      attachmentsByPlan.set(att.supportPlanId, existing);
    });

    return plans.map((plan) => ({
      ...plan,
      attachments: attachmentsByPlan.get(plan.id) || [],
    }));
  }

  // ==================== Support Plan Attachments ====================
  async addSupportPlanAttachment(data: InsertSupportPlanAttachment): Promise<SupportPlanAttachment> {
    const [attachment] = await db.insert(supportPlanAttachments).values(data).returning();
    return attachment;
  }

  async deleteSupportPlanAttachment(id: string, organisationId: string): Promise<boolean> {
    const result = await db
      .delete(supportPlanAttachments)
      .where(
        and(
          eq(supportPlanAttachments.id, id),
          sql`${supportPlanAttachments.supportPlanId} IN (
            SELECT id FROM student_support_plans WHERE organisation_id = ${organisationId}
          )`
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  // ==================== Student Plans ====================
  async getStudentPlans(studentId: string, organisationId: string): Promise<StudentPlanWithEvidence[]> {
    const plans = await db
      .select()
      .from(studentPlans)
      .where(and(eq(studentPlans.studentId, studentId), eq(studentPlans.organisationId, organisationId)))
      .orderBy(desc(studentPlans.weekStartDate));

    return this.enrichPlansWithEvidence(plans, organisationId);
  }

  async getStudentPlan(id: string, organisationId: string): Promise<StudentPlanWithEvidence | undefined> {
    const [plan] = await db
      .select()
      .from(studentPlans)
      .where(and(eq(studentPlans.id, id), eq(studentPlans.organisationId, organisationId)));

    if (!plan) return undefined;
    const enriched = await this.enrichPlansWithEvidence([plan], organisationId);
    return enriched[0];
  }

  async createStudentPlan(data: InsertStudentPlan): Promise<StudentPlan> {
    const [plan] = await db.insert(studentPlans).values(data).returning();
    return plan;
  }

  async updateStudentPlan(id: string, organisationId: string, data: Partial<InsertStudentPlan>): Promise<StudentPlan | undefined> {
    const [plan] = await db
      .update(studentPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(studentPlans.id, id), eq(studentPlans.organisationId, organisationId)))
      .returning();
    return plan || undefined;
  }

  async deleteStudentPlan(id: string, organisationId: string): Promise<boolean> {
    const result = await db
      .delete(studentPlans)
      .where(and(eq(studentPlans.id, id), eq(studentPlans.organisationId, organisationId)));
    return (result.rowCount ?? 0) > 0;
  }

  async linkEvidenceToPlan(data: InsertPlanEvidenceLink): Promise<PlanEvidenceLink> {
    const [link] = await db.insert(planEvidenceLinks).values(data).returning();
    return link;
  }

  async unlinkEvidenceFromPlan(planId: string, evidenceId: string): Promise<boolean> {
    const result = await db
      .delete(planEvidenceLinks)
      .where(and(eq(planEvidenceLinks.planId, planId), eq(planEvidenceLinks.evidenceId, evidenceId)));
    return (result.rowCount ?? 0) > 0;
  }

  private async enrichPlansWithEvidence(plans: StudentPlan[], organisationId: string): Promise<StudentPlanWithEvidence[]> {
    if (plans.length === 0) return [];

    const planIds = plans.map((p) => p.id);
    const links = await db
      .select({
        planId: planEvidenceLinks.planId,
        evidence: evidence,
      })
      .from(planEvidenceLinks)
      .innerJoin(evidence, eq(evidence.id, planEvidenceLinks.evidenceId))
      .where(sql`${planEvidenceLinks.planId} = ANY(${planIds})`);

    const evidenceByPlan = new Map<string, Evidence[]>();
    links.forEach((link) => {
      const existing = evidenceByPlan.get(link.planId) || [];
      existing.push(link.evidence);
      evidenceByPlan.set(link.planId, existing);
    });

    return plans.map((plan) => ({
      ...plan,
      linkedEvidence: evidenceByPlan.get(plan.id) || [],
    }));
  }

  // ==================== Schemes of Work ====================
  async getSchemesOfWork(organisationId: string): Promise<SchemeOfWorkWithStudents[]> {
    const schemes = await db
      .select()
      .from(schemesOfWork)
      .where(eq(schemesOfWork.organisationId, organisationId))
      .orderBy(desc(schemesOfWork.createdAt));

    return this.enrichSchemesWithStudents(schemes);
  }

  async getSchemeOfWork(id: string, organisationId: string): Promise<SchemeOfWorkWithStudents | undefined> {
    const [scheme] = await db
      .select()
      .from(schemesOfWork)
      .where(and(eq(schemesOfWork.id, id), eq(schemesOfWork.organisationId, organisationId)));

    if (!scheme) return undefined;
    const enriched = await this.enrichSchemesWithStudents([scheme]);
    return enriched[0];
  }

  async getStudentSchemes(studentId: string, organisationId: string, classGroup?: string): Promise<SchemeOfWorkWithStudents[]> {
    const directlyAssignedIds = await db
      .select({ schemeId: schemeStudentLinks.schemeId })
      .from(schemeStudentLinks)
      .where(eq(schemeStudentLinks.studentId, studentId));

    const directIds = directlyAssignedIds.map((r) => r.schemeId);

    let schemes: SchemeOfWork[];
    if (classGroup) {
      schemes = await db
        .select()
        .from(schemesOfWork)
        .where(
          and(
            eq(schemesOfWork.organisationId, organisationId),
            or(
              sql`${schemesOfWork.id} = ANY(${directIds})`,
              eq(schemesOfWork.classGroup, classGroup)
            )
          )
        )
        .orderBy(desc(schemesOfWork.createdAt));
    } else if (directIds.length > 0) {
      schemes = await db
        .select()
        .from(schemesOfWork)
        .where(
          and(
            eq(schemesOfWork.organisationId, organisationId),
            sql`${schemesOfWork.id} = ANY(${directIds})`
          )
        )
        .orderBy(desc(schemesOfWork.createdAt));
    } else {
      return [];
    }

    return this.enrichSchemesWithStudents(schemes);
  }

  async createSchemeOfWork(data: InsertSchemeOfWork): Promise<SchemeOfWork> {
    const [scheme] = await db.insert(schemesOfWork).values(data).returning();
    return scheme;
  }

  async updateSchemeOfWork(id: string, organisationId: string, data: Partial<InsertSchemeOfWork>): Promise<SchemeOfWork | undefined> {
    const [scheme] = await db
      .update(schemesOfWork)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schemesOfWork.id, id), eq(schemesOfWork.organisationId, organisationId)))
      .returning();
    return scheme || undefined;
  }

  async deleteSchemeOfWork(id: string, organisationId: string): Promise<boolean> {
    const result = await db
      .delete(schemesOfWork)
      .where(and(eq(schemesOfWork.id, id), eq(schemesOfWork.organisationId, organisationId)));
    return (result.rowCount ?? 0) > 0;
  }

  async linkStudentToScheme(data: InsertSchemeStudentLink): Promise<SchemeStudentLink> {
    const [link] = await db.insert(schemeStudentLinks).values(data).returning();
    return link;
  }

  async unlinkStudentFromScheme(schemeId: string, studentId: string): Promise<boolean> {
    const result = await db
      .delete(schemeStudentLinks)
      .where(and(eq(schemeStudentLinks.schemeId, schemeId), eq(schemeStudentLinks.studentId, studentId)));
    return (result.rowCount ?? 0) > 0;
  }

  private async enrichSchemesWithStudents(schemes: SchemeOfWork[]): Promise<SchemeOfWorkWithStudents[]> {
    if (schemes.length === 0) return [];

    const schemeIds = schemes.map((s) => s.id);
    const links = await db
      .select({
        schemeId: schemeStudentLinks.schemeId,
        student: students,
      })
      .from(schemeStudentLinks)
      .innerJoin(students, eq(students.id, schemeStudentLinks.studentId))
      .where(sql`${schemeStudentLinks.schemeId} = ANY(${schemeIds})`);

    const studentsByScheme = new Map<string, Student[]>();
    links.forEach((link) => {
      const existing = studentsByScheme.get(link.schemeId) || [];
      existing.push(link.student);
      studentsByScheme.set(link.schemeId, existing);
    });

    return schemes.map((scheme) => ({
      ...scheme,
      linkedStudents: studentsByScheme.get(scheme.id) || [],
    }));
  }
}

export const storage = new DatabaseStorage();
