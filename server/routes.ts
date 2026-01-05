import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { insertStudentSchema, insertEvidenceSchema } from "@shared/schema";
import { z } from "zod";

// L2LP Learning Outcomes based on NCCA L2LP Guidelines
// Organized by PLU → Element → Outcomes
const L2LP_OUTCOMES = [
  // PLU 1: Communicating and literacy
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Listening and responding", outcomeCode: "1.1", outcomeText: "Listen and respond to information in a variety of situations" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Listening and responding", outcomeCode: "1.2", outcomeText: "Follow instructions in familiar contexts" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Listening and responding", outcomeCode: "1.3", outcomeText: "Identify key information from spoken communications" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Speaking and communicating", outcomeCode: "1.4", outcomeText: "Express needs, wants and preferences clearly" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Speaking and communicating", outcomeCode: "1.5", outcomeText: "Engage in conversations with others" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Speaking and communicating", outcomeCode: "1.6", outcomeText: "Use appropriate language in different situations" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Reading", outcomeCode: "1.7", outcomeText: "Recognise and read familiar words and symbols" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Reading", outcomeCode: "1.8", outcomeText: "Read simple texts for information and enjoyment" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Reading", outcomeCode: "1.9", outcomeText: "Use reading to support daily activities" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Writing", outcomeCode: "1.10", outcomeText: "Write personal information accurately" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Writing", outcomeCode: "1.11", outcomeText: "Write for different purposes using appropriate formats" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Writing", outcomeCode: "1.12", outcomeText: "Use technology for written communication" },

  // PLU 2: Numeracy
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Number", outcomeCode: "2.1", outcomeText: "Recognise and use numbers in everyday contexts" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Number", outcomeCode: "2.2", outcomeText: "Perform simple calculations for daily activities" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Number", outcomeCode: "2.3", outcomeText: "Understand and use basic mathematical vocabulary" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Money", outcomeCode: "2.4", outcomeText: "Recognise coins and notes and their values" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Money", outcomeCode: "2.5", outcomeText: "Handle money in everyday transactions" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Money", outcomeCode: "2.6", outcomeText: "Budget for simple purchases" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Time", outcomeCode: "2.7", outcomeText: "Tell the time using digital and analogue clocks" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Time", outcomeCode: "2.8", outcomeText: "Understand and use calendars and timetables" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Time", outcomeCode: "2.9", outcomeText: "Manage time for daily activities" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Measures", outcomeCode: "2.10", outcomeText: "Use appropriate measures for length, weight and capacity" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Measures", outcomeCode: "2.11", outcomeText: "Apply measurement skills in practical situations" },

  // PLU 3: Personal care
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Personal hygiene", outcomeCode: "3.1", outcomeText: "Maintain personal hygiene routines independently" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Personal hygiene", outcomeCode: "3.2", outcomeText: "Understand the importance of hygiene for health" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Personal hygiene", outcomeCode: "3.3", outcomeText: "Select and use appropriate hygiene products" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Dressing and appearance", outcomeCode: "3.4", outcomeText: "Select appropriate clothing for different occasions" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Dressing and appearance", outcomeCode: "3.5", outcomeText: "Dress independently and appropriately" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Dressing and appearance", outcomeCode: "3.6", outcomeText: "Maintain personal appearance" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Health and wellbeing", outcomeCode: "3.7", outcomeText: "Make healthy choices about food and exercise" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Health and wellbeing", outcomeCode: "3.8", outcomeText: "Recognise signs of illness and seek help appropriately" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Health and wellbeing", outcomeCode: "3.9", outcomeText: "Understand personal safety in different environments" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Food preparation", outcomeCode: "3.10", outcomeText: "Prepare simple snacks and meals safely" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Food preparation", outcomeCode: "3.11", outcomeText: "Follow basic food hygiene practices" },

  // PLU 4: Living in a community
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Home and family", outcomeCode: "4.1", outcomeText: "Contribute to household tasks and routines" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Home and family", outcomeCode: "4.2", outcomeText: "Demonstrate awareness of family roles and responsibilities" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Home and family", outcomeCode: "4.3", outcomeText: "Maintain personal space and belongings" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Neighbourhood and community", outcomeCode: "4.4", outcomeText: "Navigate familiar community environments safely" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Neighbourhood and community", outcomeCode: "4.5", outcomeText: "Access and use local facilities and services" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Neighbourhood and community", outcomeCode: "4.6", outcomeText: "Follow rules and expectations in community settings" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Transport", outcomeCode: "4.7", outcomeText: "Use public transport with appropriate support" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Transport", outcomeCode: "4.8", outcomeText: "Plan journeys using familiar routes" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Leisure and recreation", outcomeCode: "4.9", outcomeText: "Participate in chosen leisure activities" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Leisure and recreation", outcomeCode: "4.10", outcomeText: "Make choices about recreational activities" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Leisure and recreation", outcomeCode: "4.11", outcomeText: "Engage appropriately with others during leisure activities" },

  // PLU 5: Preparing for work
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Self-awareness and advocacy", outcomeCode: "5.1", outcomeText: "Identify personal strengths, interests and abilities" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Self-awareness and advocacy", outcomeCode: "5.2", outcomeText: "Express preferences and make choices about activities" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Self-awareness and advocacy", outcomeCode: "5.3", outcomeText: "Ask for help and support when needed" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Working with others", outcomeCode: "5.4", outcomeText: "Work cooperatively as part of a team" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Working with others", outcomeCode: "5.5", outcomeText: "Follow instructions and accept feedback" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Working with others", outcomeCode: "5.6", outcomeText: "Demonstrate appropriate workplace behaviours" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work-related skills", outcomeCode: "5.7", outcomeText: "Complete tasks independently within expected timeframes" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work-related skills", outcomeCode: "5.8", outcomeText: "Use equipment and materials safely and appropriately" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work-related skills", outcomeCode: "5.9", outcomeText: "Demonstrate reliability and punctuality" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work experience", outcomeCode: "5.10", outcomeText: "Participate in work experience or work-related activities" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work experience", outcomeCode: "5.11", outcomeText: "Reflect on work experience and identify learning" },
];

async function seedOutcomesIfNeeded() {
  try {
    const existing = await storage.getOutcomes();
    if (existing.length === 0) {
      console.log("Seeding L2LP learning outcomes...");
      await storage.createOutcomesBatch(L2LP_OUTCOMES);
      console.log(`Seeded ${L2LP_OUTCOMES.length} learning outcomes across 5 PLUs`);
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

  app.delete("/api/evidence/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        return res.status(403).json({ message: "Organisation membership required", needsSetup: true });
      }
      
      const deleted = await storage.deleteEvidenceByOrganisation(req.params.id, membership.organisation.id);
      if (!deleted) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting evidence:", error);
      res.status(500).json({ message: "Failed to delete evidence" });
    }
  });

  return httpServer;
}
