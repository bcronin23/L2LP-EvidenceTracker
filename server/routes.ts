import type { Express } from "express";
import { createServer, type Server } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, objectStorageService } from "./replit_integrations/object_storage";
import { insertStudentSchema, insertEvidenceSchema } from "@shared/schema";
import { z } from "zod";

// Load official L2LP outcomes from JSON file
function loadOfficialOutcomes() {
  const filePath = join(process.cwd(), "data", "l2lp_outcomes.json");
  const data = readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

// Transform JSON outcomes from snake_case to camelCase for database
function transformOutcomesForDb(jsonOutcomes: any[]) {
  return jsonOutcomes.map((o: any) => ({
    programme: o.programme,
    pluNumber: o.plu_number,
    pluName: o.plu_name,
    elementName: o.element_name,
    outcomeCode: o.outcome_code,
    outcomeText: o.outcome_text,
  }));
}

async function seedOutcomesIfNeeded() {
  try {
    const existing = await storage.getOutcomes();
    if (existing.length === 0) {
      console.log("Seeding L2LP learning outcomes from official JSON file...");
      const officialOutcomes = loadOfficialOutcomes();
      const outcomesToInsert = transformOutcomesForDb(officialOutcomes);
      await storage.createOutcomesBatch(outcomesToInsert);
      console.log(`Seeded ${outcomesToInsert.length} learning outcomes across 5 PLUs`);
    }
  } catch (error) {
    console.error("Error seeding outcomes:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // Setup object storage routes
  registerObjectStorageRoutes(app);

  // Seed learning outcomes on startup
  await seedOutcomesIfNeeded();

  // ==================== Organisation API ====================
  // Get current user's organisation membership (alias for /api/organisation for semantic clarity)
  app.get("/api/me/organisation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      if (!membership) {
        return res.status(404).json({ message: "No organisation found", needsSetup: true });
      }
      res.json(membership);
    } catch (error) {
      console.error("Error fetching organisation:", error);
      res.status(500).json({ message: "Failed to fetch organisation" });
    }
  });

  app.get("/api/organisation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      if (!membership) {
        return res.status(404).json({ message: "No organisation found", needsSetup: true });
      }
      res.json(membership);
    } catch (error) {
      console.error("Error fetching organisation:", error);
      res.status(500).json({ message: "Failed to fetch organisation" });
    }
  });

  app.post("/api/organisation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, allowedDomains } = req.body;

      const existing = await storage.getUserMembership(userId);
      if (existing) {
        return res.status(400).json({ message: "You already belong to an organisation" });
      }

      const org = await storage.createOrganisation({ name, allowedDomains: allowedDomains || [] });
      await storage.addMember({ organisationId: org.id, userId, role: "admin" });

      const membership = await storage.getUserMembership(userId);
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error creating organisation:", error);
      res.status(500).json({ message: "Failed to create organisation" });
    }
  });

  app.post("/api/organisation/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { inviteCode } = req.body;

      if (!inviteCode) {
        return res.status(400).json({ message: "Invite code is required" });
      }

      const existing = await storage.getUserMembership(userId);
      if (existing) {
        return res.status(400).json({ message: "You already belong to an organisation" });
      }

      const member = await storage.joinOrganisationByCode(userId, inviteCode.toUpperCase());
      if (!member) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      const membership = await storage.getUserMembership(userId);
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error joining organisation:", error);
      res.status(500).json({ message: "Failed to join organisation" });
    }
  });

  app.post("/api/organisation/regenerate-code", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);

      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const newCode = await storage.generateInviteCode(membership.organisation.id);
      res.json({ inviteCode: newCode });
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      res.status(500).json({ message: "Failed to regenerate invite code" });
    }
  });

  // Update organisation branding (admin only)
  const updateBrandingSchema = z.object({
    displayName: z.string().nullable().optional(),
    accentColor: z.string().nullable().optional(),
    logoStoragePath: z.string().nullable().optional(),
  });

  app.patch("/api/organisation/branding", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);

      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const data = updateBrandingSchema.parse(req.body);
      const updated = await storage.updateOrganisation(membership.organisation.id, data);
      
      if (!updated) {
        return res.status(404).json({ message: "Organisation not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating branding:", error);
      res.status(500).json({ message: "Failed to update branding" });
    }
  });

  // Get signed URL for logo upload (admin only)
  app.get("/api/organisation/logo-upload-url", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);

      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadUrl });
    } catch (error) {
      console.error("Error getting logo upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Get signed URL for reading organisation logo
  app.get("/api/organisation/logo-url", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);

      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required" });
      }

      const logoPath = membership.organisation.logoStoragePath;
      if (!logoPath) {
        return res.status(404).json({ message: "No logo configured" });
      }

      const signedUrl = await objectStorageService.getSignedReadUrl(logoPath, 3600);
      res.json({ signedUrl, expiresIn: 3600 });
    } catch (error) {
      console.error("Error getting logo URL:", error);
      res.status(500).json({ message: "Failed to get logo URL" });
    }
  });

  app.get("/api/organisation/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);

      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const members = await storage.getOrganisationMembers(membership.organisation.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.patch("/api/organisation/members/:memberId/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);

      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      if (!["admin", "staff"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updated = await storage.updateMemberRole(req.params.memberId, role);
      if (!updated) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  app.delete("/api/organisation/members/:memberId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);

      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (membership.memberId === req.params.memberId) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }

      const deleted = await storage.removeMember(req.params.memberId);
      if (!deleted) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // ==================== Students API ====================
  app.get("/api/students", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const students = await storage.getStudentsByOrganisation(membership.organisation.id);
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get("/api/students/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const student = await storage.getStudentByOrganisation(req.params.id, membership.organisation.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.post("/api/students", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const data = insertStudentSchema.parse({ 
        ...req.body, 
        userId,
        organisationId: membership.organisation.id
      });
      const student = await storage.createStudent(data);
      res.status(201).json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating student:", error);
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.patch("/api/students/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const student = await storage.updateStudentByOrganisation(req.params.id, membership.organisation.id, req.body);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      if (membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required to delete students" });
      }
      
      const deleted = await storage.deleteStudentByOrganisation(req.params.id, membership.organisation.id);
      if (!deleted) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // ==================== Student Evidence & Coverage ====================
  app.get("/api/students/:id/evidence", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const evidence = await storage.getStudentEvidenceByOrganisation(req.params.id, membership.organisation.id);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching student evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  app.get("/api/students/:id/coverage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const coverage = await storage.getStudentCoverageByOrganisation(req.params.id, membership.organisation.id);
      res.json(coverage);
    } catch (error) {
      console.error("Error fetching coverage:", error);
      res.status(500).json({ message: "Failed to fetch coverage" });
    }
  });

  app.get("/api/students/:id/plu-coverage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const coverage = await storage.getStudentPLUCoverageByOrganisation(req.params.id, membership.organisation.id);
      res.json(coverage);
    } catch (error) {
      console.error("Error fetching PLU coverage:", error);
      res.status(500).json({ message: "Failed to fetch PLU coverage" });
    }
  });

  // ==================== Learning Outcomes API ====================
  app.get("/api/outcomes", isAuthenticated, async (req, res) => {
    try {
      const outcomes = await storage.getOutcomes();
      res.json(outcomes);
    } catch (error) {
      console.error("Error fetching outcomes:", error);
      res.status(500).json({ message: "Failed to fetch outcomes" });
    }
  });

  app.post("/api/outcomes/seed", isAuthenticated, async (req, res) => {
    try {
      const { outcomes } = req.body;
      if (!Array.isArray(outcomes)) {
        return res.status(400).json({ message: "outcomes must be an array" });
      }
      const created = await storage.createOutcomesBatch(outcomes);
      res.status(201).json({ message: `Created ${created.length} outcomes`, outcomes: created });
    } catch (error) {
      console.error("Error seeding outcomes:", error);
      res.status(500).json({ message: "Failed to seed outcomes" });
    }
  });

  // Admin endpoint to reset and import official L2LP outcomes
  app.post("/api/admin/reset-outcomes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Delete all existing L2LP outcomes
      const deleted = await storage.deleteOutcomesByProgramme("L2LP");
      console.log(`Deleted ${deleted} existing L2LP outcomes`);

      // Load and import official outcomes from JSON file
      const officialOutcomes = loadOfficialOutcomes();
      const outcomesToInsert = transformOutcomesForDb(officialOutcomes);
      const created = await storage.createOutcomesBatch(outcomesToInsert);
      
      // Calculate totals per PLU
      const pluTotals: Record<number, number> = {};
      created.forEach((o) => {
        pluTotals[o.pluNumber] = (pluTotals[o.pluNumber] || 0) + 1;
      });

      // Log totals for verification
      console.log("L2LP Outcomes imported successfully:");
      console.log(`  PLU1=${pluTotals[1] || 0}, PLU2=${pluTotals[2] || 0}, PLU3=${pluTotals[3] || 0}, PLU4=${pluTotals[4] || 0}, PLU5=${pluTotals[5] || 0}`);
      console.log(`  Total: ${created.length} outcomes`);

      // Spot-check verification
      const spotChecks = ["1.1", "2.1", "3.1", "4.1", "5.1"];
      const verified = spotChecks.filter(code => 
        created.some(o => o.outcomeCode === code)
      );

      res.json({
        message: "Official L2LP outcomes imported successfully",
        deleted,
        imported: created.length,
        pluTotals,
        spotChecksVerified: verified.length === spotChecks.length,
      });
    } catch (error) {
      console.error("Error resetting outcomes:", error);
      res.status(500).json({ message: "Failed to reset outcomes" });
    }
  });

  // ==================== Evidence API ====================
  app.get("/api/evidence", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const evidence = await storage.getEvidenceByOrganisation(membership.organisation.id);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  app.get("/api/evidence/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const evidence = await storage.getEvidenceByOrgAndId(req.params.id, membership.organisation.id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  const createEvidenceSchema = z.object({
    studentId: z.string(),
    dateOfActivity: z.string(),
    setting: z.enum(["classroom", "community"]),
    assessmentActivity: z.string().nullable().optional(),
    successCriteria: z.string().nullable().optional(),
    observations: z.string().nullable().optional(),
    nextSteps: z.string().nullable().optional(),
    evidenceType: z.string(),
    staffInitials: z.string().nullable().optional(),
    independenceLevel: z.string(),
    fileUrl: z.string().nullable().optional(),
    fileName: z.string().nullable().optional(),
    fileType: z.string().nullable().optional(),
    fileSize: z.number().nullable().optional(),
    outcomeIds: z.array(z.string()),
  });

  app.post("/api/evidence", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const { outcomeIds, ...data } = createEvidenceSchema.parse(req.body);

      const evidence = await storage.createEvidence(
        { ...data, userId, organisationId: membership.organisation.id },
        outcomeIds
      );
      res.status(201).json(evidence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating evidence:", error);
      res.status(500).json({ message: "Failed to create evidence" });
    }
  });

  // Admin-only: Soft delete evidence (sets deletedAt timestamp)
  app.delete("/api/evidence/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      // Only admins can delete evidence
      if (membership.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can delete evidence" });
      }
      
      const deleted = await storage.softDeleteEvidence(req.params.id, membership.organisation.id);
      if (!deleted) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting evidence:", error);
      res.status(500).json({ message: "Failed to delete evidence" });
    }
  });

  // Get signed URL for evidence file (private storage access)
  app.get("/api/evidence/:id/signed-url", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const evidence = await storage.getEvidenceByOrgAndId(req.params.id, membership.organisation.id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      
      if (!evidence.storagePath) {
        return res.status(400).json({ message: "Evidence has no associated file" });
      }
      
      // Generate signed URL with 1 hour expiry
      const signedUrl = await objectStorageService.getSignedReadUrl(evidence.storagePath, 3600);
      res.json({ signedUrl, expiresIn: 3600 });
    } catch (error) {
      console.error("Error generating signed URL:", error);
      res.status(500).json({ message: "Failed to generate signed URL" });
    }
  });

  return httpServer;
}
