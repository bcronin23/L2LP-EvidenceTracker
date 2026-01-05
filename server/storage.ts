import {
  students,
  learningOutcomes,
  evidence,
  evidenceOutcomes,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, count } from "drizzle-orm";

export interface IStorage {
  // Students
  getStudents(userId: string): Promise<StudentWithStats[]>;
  getStudent(id: string, userId: string): Promise<Student | undefined>;
  createStudent(data: InsertStudent): Promise<Student>;
  updateStudent(id: string, userId: string, data: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: string, userId: string): Promise<boolean>;

  // Learning Outcomes
  getOutcomes(): Promise<LearningOutcome[]>;
  getOutcome(id: string): Promise<LearningOutcome | undefined>;
  createOutcome(data: InsertLearningOutcome): Promise<LearningOutcome>;
  createOutcomesBatch(data: InsertLearningOutcome[]): Promise<LearningOutcome[]>;

  // Evidence
  getAllEvidence(userId: string): Promise<EvidenceWithOutcomes[]>;
  getStudentEvidence(studentId: string, userId: string): Promise<EvidenceWithOutcomes[]>;
  getEvidence(id: string, userId: string): Promise<EvidenceWithOutcomes | undefined>;
  createEvidence(data: InsertEvidence, outcomeIds: string[]): Promise<Evidence>;
  deleteEvidence(id: string, userId: string): Promise<boolean>;

  // Coverage
  getStudentCoverage(studentId: string, userId: string): Promise<OutcomeCoverage[]>;
  getStudentPLUCoverage(studentId: string, userId: string): Promise<StudentPLUCoverage>;
}

export class DatabaseStorage implements IStorage {
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

  async getStudent(id: string, userId: string): Promise<Student | undefined> {
    const [student] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, id), eq(students.userId, userId)));
    return student || undefined;
  }

  async createStudent(data: InsertStudent): Promise<Student> {
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

  async deleteStudent(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(students)
      .where(and(eq(students.id, id), eq(students.userId, userId)));
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

  // ==================== Evidence ====================
  async getAllEvidence(userId: string): Promise<EvidenceWithOutcomes[]> {
    const evidenceList = await db
      .select()
      .from(evidence)
      .where(eq(evidence.userId, userId))
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

  async getEvidence(id: string, userId: string): Promise<EvidenceWithOutcomes | undefined> {
    const [evidenceItem] = await db
      .select()
      .from(evidence)
      .where(and(eq(evidence.id, id), eq(evidence.userId, userId)));

    if (!evidenceItem) return undefined;

    const enriched = await this.enrichEvidenceWithOutcomes([evidenceItem]);
    return enriched[0];
  }

  async createEvidence(data: InsertEvidence, outcomeIds: string[]): Promise<Evidence> {
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

  private async enrichEvidenceWithOutcomes(evidenceList: Evidence[]): Promise<EvidenceWithOutcomes[]> {
    if (evidenceList.length === 0) return [];

    const evidenceIds = evidenceList.map((e) => e.id);
    const studentIds = [...new Set(evidenceList.map((e) => e.studentId))];

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
}

export const storage = new DatabaseStorage();
