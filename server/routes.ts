import type { Express } from "express";
import { createServer, type Server } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, objectStorageService } from "./replit_integrations/object_storage";
import { insertStudentSchema, insertEvidenceSchema } from "@shared/schema";
import { z } from "zod";

// Load official learning outcomes from JSON file (all 4 programmes)
function loadAllProgrammeOutcomes() {
  const filePath = join(process.cwd(), "data", "all_learning_outcomes_seed.json");
  console.log("Loading outcomes from:", filePath);
  const data = readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

// Transform JSON outcomes to database format for new schema
function transformOutcomesForNewSchema(jsonOutcomes: any[], programmeMap: Map<string, string>) {
  return jsonOutcomes.map((o: any) => ({
    uid: o.uid,
    programmeId: programmeMap.get(o.programme),
    programmeCode: o.programme,
    pluOrModuleCode: o.plu_or_module_code,
    pluOrModuleTitle: o.plu_or_module_title,
    elementName: o.element_title || null,
    outcomeCode: o.outcome_code,
    outcomeText: o.outcome_text,
    sortOrder: o.sort_order || 0,
  }));
}

// Legacy transform for backward compatibility
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
      console.log("Seeding learning outcomes from official JSON file...");
      try {
        // Try to load new multi-programme outcomes
        const allProgrammes = await storage.getProgrammes();
        const programmeMap = new Map(allProgrammes.map(p => [p.code, p.id]));
        const allOutcomes = loadAllProgrammeOutcomes();
        const outcomesToInsert = transformOutcomesForNewSchema(allOutcomes, programmeMap);
        await storage.createOutcomesBatch(outcomesToInsert);
        console.log(`Seeded ${outcomesToInsert.length} learning outcomes across all programmes`);
      } catch (fileError: any) {
        console.error("Seed file error:", fileError.message);
        console.log("No seed file found - outcomes will need to be imported via admin");
      }
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
      const { 
        name, 
        rollNumber, 
        allowedDomains, 
        accentColor,
        adminFirstName,
        adminLastName,
        adminJobTitle
      } = req.body;

      const existing = await storage.getUserMembership(userId);
      if (existing) {
        return res.status(400).json({ message: "You already belong to an organisation" });
      }

      const org = await storage.createOrganisation({ 
        name, 
        rollNumber: rollNumber || null,
        allowedDomains: allowedDomains || [],
        accentColor: accentColor || null,
      });
      await storage.addMember({ organisationId: org.id, userId, role: "admin" });

      if (adminFirstName && adminLastName) {
        await storage.createStaffProfile({
          organisationId: org.id,
          userId,
          firstName: adminFirstName,
          lastName: adminLastName,
          jobTitle: adminJobTitle || null,
        });
      }

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
      const { inviteCode, firstName, lastName, jobTitle } = req.body;

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

      if (firstName && lastName) {
        await storage.createStaffProfile({
          organisationId: member.organisationId,
          userId,
          firstName,
          lastName,
          jobTitle: jobTitle || null,
        });
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

  // ==================== Student Photo Upload ====================
  // Get signed URL for student photo upload (admin/staff only)
  app.get("/api/students/:id/photo-upload-url", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required" });
      }
      
      if (membership.role !== "admin" && membership.role !== "staff") {
        return res.status(403).json({ message: "Admin or staff access required" });
      }
      
      // Verify student belongs to this organisation
      const student = await storage.getStudentByOrganisation(req.params.id, membership.organisation.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadUrl });
    } catch (error) {
      console.error("Error getting student photo upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Update student photo metadata after upload
  app.patch("/api/students/:id/photo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required" });
      }
      
      if (membership.role !== "admin" && membership.role !== "staff") {
        return res.status(403).json({ message: "Admin or staff access required" });
      }
      
      const { storagePath, fileName, mimeType } = req.body;
      if (!storagePath) {
        return res.status(400).json({ message: "Storage path is required" });
      }
      
      const student = await storage.updateStudentByOrganisation(req.params.id, membership.organisation.id, {
        photoStoragePath: storagePath,
        photoFileName: fileName || null,
        photoMime: mimeType || null,
        photoUpdatedAt: new Date(),
      } as any);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json(student);
    } catch (error) {
      console.error("Error updating student photo:", error);
      res.status(500).json({ message: "Failed to update student photo" });
    }
  });

  // Remove student photo (admin/staff only)
  app.delete("/api/students/:id/photo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required" });
      }
      
      if (membership.role !== "admin" && membership.role !== "staff") {
        return res.status(403).json({ message: "Admin or staff access required" });
      }
      
      const student = await storage.updateStudentByOrganisation(req.params.id, membership.organisation.id, {
        photoStoragePath: null,
        photoFileName: null,
        photoMime: null,
        photoUpdatedAt: null,
      } as any);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      res.json(student);
    } catch (error) {
      console.error("Error removing student photo:", error);
      res.status(500).json({ message: "Failed to remove student photo" });
    }
  });

  // Get signed URL for reading student photo (private storage)
  app.get("/api/students/:id/photo-url", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required" });
      }
      
      const student = await storage.getStudentByOrganisation(req.params.id, membership.organisation.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      if (!student.photoStoragePath) {
        return res.status(404).json({ message: "No photo configured" });
      }
      
      const signedUrl = await objectStorageService.getSignedReadUrl(student.photoStoragePath, 3600);
      res.json({ signedUrl, expiresIn: 3600 });
    } catch (error) {
      console.error("Error getting student photo URL:", error);
      res.status(500).json({ message: "Failed to get photo URL" });
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

  // Admin endpoint to reset and import official outcomes (legacy endpoint - now redirects to import-all)
  app.post("/api/admin/reset-outcomes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get programme ID map
      const allProgrammes = await storage.getProgrammes();
      const programmeMap = new Map(allProgrammes.map(p => [p.code, p.id]));

      // Clear existing outcomes
      const deleted = await storage.clearAllOutcomes();
      console.log(`Deleted ${deleted} existing outcomes`);

      // Load and import all programme outcomes
      const allOutcomes = loadAllProgrammeOutcomes();
      const outcomesToInsert = transformOutcomesForNewSchema(allOutcomes, programmeMap);
      
      // Insert in batches
      const batchSize = 100;
      let insertedCount = 0;
      for (let i = 0; i < outcomesToInsert.length; i += batchSize) {
        const batch = outcomesToInsert.slice(i, i + batchSize);
        await storage.createOutcomesBatch(batch);
        insertedCount += batch.length;
      }

      // Calculate totals per programme
      const programmeTotals: Record<string, number> = {};
      allOutcomes.forEach((o: any) => {
        programmeTotals[o.programme] = (programmeTotals[o.programme] || 0) + 1;
      });

      console.log("All programme outcomes imported successfully:");
      Object.entries(programmeTotals).forEach(([prog, count]) => {
        console.log(`  ${prog}: ${count} outcomes`);
      });
      console.log(`  Total: ${insertedCount} outcomes`);

      res.json({
        message: "All programme outcomes imported successfully",
        deleted,
        imported: insertedCount,
        programmeTotals,
      });
    } catch (error) {
      console.error("Error resetting outcomes:", error);
      res.status(500).json({ message: "Failed to reset outcomes" });
    }
  });

  // ==================== Programmes API ====================
  app.get("/api/programmes", isAuthenticated, async (req: any, res) => {
    try {
      const allProgrammes = await storage.getProgrammes();
      res.json(allProgrammes);
    } catch (error) {
      console.error("Error fetching programmes:", error);
      res.status(500).json({ message: "Failed to fetch programmes" });
    }
  });

  // Admin endpoint to import ALL programme outcomes from seed file
  app.post("/api/admin/import-all-outcomes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get programme ID map
      const allProgrammes = await storage.getProgrammes();
      const programmeMap = new Map(allProgrammes.map(p => [p.code, p.id]));

      // Clear existing outcomes
      const deleted = await storage.clearAllOutcomes();
      console.log(`Deleted ${deleted} existing outcomes`);

      // Load and import all programme outcomes
      const allOutcomes = loadAllProgrammeOutcomes();
      const outcomesToInsert = transformOutcomesForNewSchema(allOutcomes, programmeMap);
      
      // Insert in batches
      const batchSize = 100;
      let insertedCount = 0;
      for (let i = 0; i < outcomesToInsert.length; i += batchSize) {
        const batch = outcomesToInsert.slice(i, i + batchSize);
        await storage.createOutcomesBatch(batch);
        insertedCount += batch.length;
      }

      // Calculate totals per programme
      const programmeTotals: Record<string, number> = {};
      allOutcomes.forEach((o: any) => {
        programmeTotals[o.programme] = (programmeTotals[o.programme] || 0) + 1;
      });

      console.log("All programme outcomes imported successfully:");
      Object.entries(programmeTotals).forEach(([prog, count]) => {
        console.log(`  ${prog}: ${count} outcomes`);
      });
      console.log(`  Total: ${insertedCount} outcomes`);

      res.json({
        message: "All programme outcomes imported successfully",
        deleted,
        imported: insertedCount,
        programmeTotals,
      });
    } catch (error) {
      console.error("Error importing outcomes:", error);
      res.status(500).json({ message: "Failed to import outcomes" });
    }
  });

  // Get outcomes by programme code
  app.get("/api/outcomes/programme/:code", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.params;
      const outcomes = await storage.getOutcomesByProgrammeCode(code);
      res.json(outcomes);
    } catch (error) {
      console.error("Error fetching outcomes by programme:", error);
      res.status(500).json({ message: "Failed to fetch outcomes" });
    }
  });

  // Admin QA endpoint - get outcome statistics and anomalies
  app.get("/api/admin/outcomes-qa", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const outcomes = await storage.getOutcomes();
      
      // Calculate totals by programme
      const programmeTotals: Record<string, number> = {};
      outcomes.forEach(o => {
        const prog = o.programmeCode || "Unknown";
        programmeTotals[prog] = (programmeTotals[prog] || 0) + 1;
      });

      // Calculate totals by module
      const moduleTotals: Record<string, Record<string, number>> = {};
      outcomes.forEach(o => {
        const prog = o.programmeCode || "Unknown";
        const module = o.pluOrModuleTitle || o.pluOrModuleCode || "Unknown";
        if (!moduleTotals[prog]) moduleTotals[prog] = {};
        moduleTotals[prog][module] = (moduleTotals[prog][module] || 0) + 1;
      });

      // Check for anomalies
      const anomalies: { type: string; message: string; severity: string }[] = [];

      // Check JC_L2LP Preparing for Work should have 32 outcomes
      const jcL2Plu5Count = outcomes.filter(o => 
        o.programmeCode === "JC_L2LP" && o.pluOrModuleCode === "JC-L2-PLU5"
      ).length;
      if (jcL2Plu5Count < 32) {
        anomalies.push({
          type: "missing_outcomes",
          message: `JC_L2LP Preparing for Work has ${jcL2Plu5Count} outcomes (expected 32)`,
          severity: "error",
        });
      }

      // Check SC Personal Care should have 3 modules each
      for (const prog of ["SC_L1LP", "SC_L2LP"]) {
        const personalCareModules = new Set(
          outcomes
            .filter(o => 
              o.programmeCode === prog && 
              (o.pluOrModuleTitle?.includes("Wellbeing") ||
               o.pluOrModuleTitle?.includes("Relationships") ||
               o.pluOrModuleTitle?.includes("Safety"))
            )
            .map(o => o.pluOrModuleCode)
        );
        if (personalCareModules.size !== 3) {
          anomalies.push({
            type: "module_count",
            message: `${prog} Personal Care has ${personalCareModules.size} modules (expected 3)`,
            severity: personalCareModules.size < 3 ? "error" : "warning",
          });
        }
      }

      // Check for programmes with very low outcome counts
      for (const [prog, count] of Object.entries(programmeTotals)) {
        if (count < 50 && prog !== "Unknown") {
          anomalies.push({
            type: "low_count",
            message: `${prog} has only ${count} outcomes (may be incomplete)`,
            severity: "warning",
          });
        }
      }

      res.json({
        totalOutcomes: outcomes.length,
        programmeTotals,
        moduleTotals,
        anomalies,
      });
    } catch (error) {
      console.error("Error fetching outcomes QA data:", error);
      res.status(500).json({ message: "Failed to fetch QA data" });
    }
  });

  // ==================== Student Programme Overrides API ====================
  app.get("/api/students/:id/programme-overrides", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const overrides = await storage.getStudentProgrammeOverrides(req.params.id);
      res.json(overrides);
    } catch (error) {
      console.error("Error fetching programme overrides:", error);
      res.status(500).json({ message: "Failed to fetch programme overrides" });
    }
  });

  app.post("/api/students/:id/programme-overrides", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const { areaCode, programmeId } = req.body;
      
      const override = await storage.createStudentProgrammeOverride({
        organisationId: membership.organisation.id,
        studentId: req.params.id,
        areaCode,
        programmeId,
        createdBy: userId,
      });
      
      res.status(201).json(override);
    } catch (error) {
      console.error("Error creating programme override:", error);
      res.status(500).json({ message: "Failed to create programme override" });
    }
  });

  app.delete("/api/students/:studentId/programme-overrides/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const deleted = await storage.deleteStudentProgrammeOverride(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Programme override not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting programme override:", error);
      res.status(500).json({ message: "Failed to delete programme override" });
    }
  });

  // Get effective programme for a student and area
  app.get("/api/students/:id/effective-programme/:areaCode", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const programmeId = await storage.getEffectiveProgrammeId(req.params.id, req.params.areaCode);
      
      if (!programmeId) {
        return res.status(404).json({ message: "No programme found for student" });
      }
      
      res.json({ programmeId });
    } catch (error) {
      console.error("Error fetching effective programme:", error);
      res.status(500).json({ message: "Failed to fetch effective programme" });
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

  // ==================== Student Support Plans API ====================
  
  // Get all SSPs for a student (ordered by createdAt desc)
  app.get("/api/students/:studentId/ssp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const student = await storage.getStudentByOrganisation(req.params.studentId, membership.organisation.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const ssps = await storage.getStudentSupportPlans(req.params.studentId, membership.organisation.id);
      res.json(ssps);
    } catch (error) {
      console.error("Error fetching SSPs:", error);
      res.status(500).json({ message: "Failed to fetch support plans" });
    }
  });
  
  // Get single SSP
  app.get("/api/ssp/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const ssp = await storage.getStudentSupportPlan(req.params.id, membership.organisation.id);
      if (!ssp) {
        return res.status(404).json({ message: "Support plan not found" });
      }
      res.json(ssp);
    } catch (error) {
      console.error("Error fetching SSP:", error);
      res.status(500).json({ message: "Failed to fetch support plan" });
    }
  });
  
  // Create SSP (auto-archives previous active SSP)
  const createSspSchema = z.object({
    studentId: z.string().min(1),
    keyNeeds: z.string().optional(),
    strengths: z.string().optional(),
    communicationSupports: z.string().optional(),
    regulationSupports: z.string().optional(),
    targets: z.string().optional(),
    strategies: z.string().optional(),
    notes: z.string().optional(),
  });
  
  app.post("/api/ssp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const data = createSspSchema.parse(req.body);
      
      const student = await storage.getStudentByOrganisation(data.studentId, membership.organisation.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Archive any existing active SSP for this student
      const existingSsps = await storage.getStudentSupportPlans(data.studentId, membership.organisation.id);
      for (const ssp of existingSsps) {
        if (ssp.status === "active") {
          await storage.updateStudentSupportPlan(ssp.id, membership.organisation.id, { status: "archived" });
        }
      }
      
      const ssp = await storage.createStudentSupportPlan({
        ...data,
        organisationId: membership.organisation.id,
        createdBy: userId,
        status: "active",
      });
      
      res.status(201).json(ssp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating SSP:", error);
      res.status(500).json({ message: "Failed to create support plan" });
    }
  });
  
  // Update SSP
  app.patch("/api/ssp/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const data = createSspSchema.partial().parse(req.body);
      const ssp = await storage.updateStudentSupportPlan(req.params.id, membership.organisation.id, data);
      
      if (!ssp) {
        return res.status(404).json({ message: "Support plan not found" });
      }
      
      res.json(ssp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating SSP:", error);
      res.status(500).json({ message: "Failed to update support plan" });
    }
  });
  
  // ==================== Weekly Plans API ====================
  
  // Get all plans for a student
  app.get("/api/students/:studentId/plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const student = await storage.getStudentByOrganisation(req.params.studentId, membership.organisation.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const plans = await storage.getStudentPlans(req.params.studentId, membership.organisation.id);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });
  
  // Get single plan
  app.get("/api/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const plan = await storage.getStudentPlan(req.params.id, membership.organisation.id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(500).json({ message: "Failed to fetch plan" });
    }
  });
  
  // Create weekly plan
  const createPlanSchema = z.object({
    studentId: z.string().min(1),
    weekStartDate: z.string().min(1),
    focusPlu: z.string().optional(),
    focusElement: z.string().optional(),
    focusOutcomeCodes: z.array(z.string()).optional(),
    planText: z.string().optional(),
    nextSteps: z.string().optional(),
  });
  
  app.post("/api/plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const data = createPlanSchema.parse(req.body);
      
      const student = await storage.getStudentByOrganisation(data.studentId, membership.organisation.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const plan = await storage.createStudentPlan({
        ...data,
        organisationId: membership.organisation.id,
        createdBy: userId,
      });
      
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating plan:", error);
      res.status(500).json({ message: "Failed to create plan" });
    }
  });
  
  // Update plan
  app.patch("/api/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const data = createPlanSchema.partial().parse(req.body);
      const plan = await storage.updateStudentPlan(req.params.id, membership.organisation.id, data);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating plan:", error);
      res.status(500).json({ message: "Failed to update plan" });
    }
  });
  
  // Delete plan
  app.delete("/api/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const deleted = await storage.deleteStudentPlan(req.params.id, membership.organisation.id);
      if (!deleted) {
        return res.status(404).json({ message: "Plan not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ message: "Failed to delete plan" });
    }
  });
  
  // Link evidence to plan
  app.post("/api/plans/:planId/evidence/:evidenceId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const plan = await storage.getStudentPlan(req.params.planId, membership.organisation.id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      const evidence = await storage.getEvidenceByOrgAndId(req.params.evidenceId, membership.organisation.id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      
      const link = await storage.linkEvidenceToPlan({
        planId: req.params.planId,
        evidenceId: req.params.evidenceId,
      });
      
      res.status(201).json(link);
    } catch (error) {
      console.error("Error linking evidence:", error);
      res.status(500).json({ message: "Failed to link evidence" });
    }
  });
  
  // Unlink evidence from plan
  app.delete("/api/plans/:planId/evidence/:evidenceId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const deleted = await storage.unlinkEvidenceFromPlan(req.params.planId, req.params.evidenceId);
      if (!deleted) {
        return res.status(404).json({ message: "Link not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error unlinking evidence:", error);
      res.status(500).json({ message: "Failed to unlink evidence" });
    }
  });
  
  // ==================== Schemes of Work API ====================
  
  // Get all schemes for organisation
  app.get("/api/schemes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const schemes = await storage.getSchemesOfWork(membership.organisation.id);
      res.json(schemes);
    } catch (error) {
      console.error("Error fetching schemes:", error);
      res.status(500).json({ message: "Failed to fetch schemes" });
    }
  });
  
  // Get schemes assigned to a student (directly or via class group)
  app.get("/api/students/:studentId/schemes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const student = await storage.getStudentByOrganisation(req.params.studentId, membership.organisation.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const schemes = await storage.getStudentSchemes(req.params.studentId, membership.organisation.id, student.classGroup || undefined);
      res.json(schemes);
    } catch (error) {
      console.error("Error fetching student schemes:", error);
      res.status(500).json({ message: "Failed to fetch schemes" });
    }
  });
  
  // Get single scheme
  app.get("/api/schemes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const scheme = await storage.getSchemeOfWork(req.params.id, membership.organisation.id);
      if (!scheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }
      res.json(scheme);
    } catch (error) {
      console.error("Error fetching scheme:", error);
      res.status(500).json({ message: "Failed to fetch scheme" });
    }
  });
  
  // Create scheme
  const createSchemeSchema = z.object({
    title: z.string().min(1),
    term: z.string().optional(),
    classGroup: z.string().optional(),
    description: z.string().optional(),
    storagePath: z.string().optional(),
  });
  
  app.post("/api/schemes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const data = createSchemeSchema.parse(req.body);
      
      const scheme = await storage.createSchemeOfWork({
        ...data,
        organisationId: membership.organisation.id,
        createdBy: userId,
      });
      
      res.status(201).json(scheme);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating scheme:", error);
      res.status(500).json({ message: "Failed to create scheme" });
    }
  });
  
  // Update scheme
  app.patch("/api/schemes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const data = createSchemeSchema.partial().parse(req.body);
      const scheme = await storage.updateSchemeOfWork(req.params.id, membership.organisation.id, data);
      
      if (!scheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }
      
      res.json(scheme);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating scheme:", error);
      res.status(500).json({ message: "Failed to update scheme" });
    }
  });
  
  // Delete scheme (admin only)
  app.delete("/api/schemes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      if (membership.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can delete schemes" });
      }
      
      const deleted = await storage.deleteSchemeOfWork(req.params.id, membership.organisation.id);
      if (!deleted) {
        return res.status(404).json({ message: "Scheme not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting scheme:", error);
      res.status(500).json({ message: "Failed to delete scheme" });
    }
  });
  
  // Assign scheme to student
  app.post("/api/schemes/:schemeId/students/:studentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const scheme = await storage.getSchemeOfWork(req.params.schemeId, membership.organisation.id);
      if (!scheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }
      
      const student = await storage.getStudentByOrganisation(req.params.studentId, membership.organisation.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const link = await storage.linkStudentToScheme({
        schemeId: req.params.schemeId,
        studentId: req.params.studentId,
      });
      
      res.status(201).json(link);
    } catch (error) {
      console.error("Error assigning scheme:", error);
      res.status(500).json({ message: "Failed to assign scheme" });
    }
  });
  
  // Unassign scheme from student (admin only)
  app.delete("/api/schemes/:schemeId/students/:studentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      if (membership.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can unassign schemes" });
      }
      
      const deleted = await storage.unlinkStudentFromScheme(req.params.schemeId, req.params.studentId);
      if (!deleted) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error unassigning scheme:", error);
      res.status(500).json({ message: "Failed to unassign scheme" });
    }
  });
  
  // Get presigned upload URL for scheme files
  app.get("/api/schemes/upload-url", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      const storagePath = objectStorageService.normalizeObjectEntityPath(uploadUrl);
      
      res.json({ uploadUrl, storagePath });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });
  
  // Get signed download URL for scheme file
  app.get("/api/schemes/:id/signed-url", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const scheme = await storage.getSchemeOfWork(req.params.id, membership.organisation.id);
      if (!scheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }
      
      if (!scheme.storagePath) {
        return res.status(400).json({ message: "Scheme has no associated file" });
      }
      
      const signedUrl = await objectStorageService.getSignedReadUrl(scheme.storagePath, 3600);
      res.json({ signedUrl, expiresIn: 3600 });
    } catch (error) {
      console.error("Error generating signed URL:", error);
      res.status(500).json({ message: "Failed to generate signed URL" });
    }
  });

  return httpServer;
}
