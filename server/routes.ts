import type { Express } from "express";
import { createServer, type Server } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { insertStudentSchema, insertEvidenceSchema } from "@shared/schema";
import { z } from "zod";

// Load official L2LP outcomes from JSON file
function loadOfficialOutcomes() {
  const filePath = join(process.cwd(), "data", "l2lp_outcomes.json");
  const data = readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

// L2LP Learning Outcomes based on NCCA L2LP Guidelines (curriculumonline.ie)
// Complete dataset with all outcomes organized by PLU → Element → Outcomes
const L2LP_OUTCOMES = [
  // =============================================================================
  // PLU 1: COMMUNICATING AND LITERACY (37 outcomes)
  // =============================================================================
  // Element: Speaking appropriately for a variety of purposes and demonstrating attentiveness as a listener
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Speaking and listening", outcomeCode: "1.1", outcomeText: "Listen to obtain information relating to more than one option" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Speaking and listening", outcomeCode: "1.2", outcomeText: "Ask questions to obtain information" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Speaking and listening", outcomeCode: "1.3", outcomeText: "Follow a series of spoken instructions under supervision" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Speaking and listening", outcomeCode: "1.4", outcomeText: "Express personal opinions, facts and feelings appropriately" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Speaking and listening", outcomeCode: "1.5", outcomeText: "Participate in practical, formal and informal communications" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Speaking and listening", outcomeCode: "1.6", outcomeText: "Listen to and respond to a range of stories" },
  // Element: Using non-verbal behaviour to get the message across
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Non-verbal communication", outcomeCode: "1.7", outcomeText: "Identify a range of non-verbal communications methods" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Non-verbal communication", outcomeCode: "1.8", outcomeText: "Use appropriate non-verbal behaviour in communicating a simple idea" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Non-verbal communication", outcomeCode: "1.9", outcomeText: "Relay a response or request non-verbally" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Non-verbal communication", outcomeCode: "1.10", outcomeText: "Respond to non-verbal signals and signs encountered in daily life" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Non-verbal communication", outcomeCode: "1.11", outcomeText: "Follow the sequence of non-verbal instructions or directions for a frequent activity" },
  // Element: Reading to obtain basic information
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Reading", outcomeCode: "1.12", outcomeText: "Read familiar words that are commonly used and personally relevant" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Reading", outcomeCode: "1.13", outcomeText: "Use simple rules and text conventions that support meaning" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Reading", outcomeCode: "1.14", outcomeText: "Interpret different forms of writing and text, including social signs and symbols" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Reading", outcomeCode: "1.15", outcomeText: "Find key information from different forms of writing" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Reading", outcomeCode: "1.16", outcomeText: "Use a range of reading strategies" },
  // Element: Using a range of writing forms to express opinions
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Writing", outcomeCode: "1.17", outcomeText: "Write/type notes and messages needed for simple tasks" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Writing", outcomeCode: "1.18", outcomeText: "Write/type at least five sentences so that they convey meaning or information" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Writing", outcomeCode: "1.19", outcomeText: "Use the main rules of writing appropriately" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Writing", outcomeCode: "1.20", outcomeText: "Use a range of spelling patterns" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Writing", outcomeCode: "1.21", outcomeText: "Use a range of different forms of writing to suit purpose and audience" },
  // Element: Using expressive arts to communicate
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Expressive arts", outcomeCode: "1.22", outcomeText: "Participate in a performance or a presentation" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Expressive arts", outcomeCode: "1.23", outcomeText: "Create a range of images using a variety of materials" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Expressive arts", outcomeCode: "1.24", outcomeText: "Produce a piece of work for display" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Expressive arts", outcomeCode: "1.25", outcomeText: "Listen to a range of music and respond by discussing thoughts and feelings" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Expressive arts", outcomeCode: "1.26", outcomeText: "Use drama or dance to explore real and imaginary situations" },
  // Element: Using suitable technologies for a range of purposes
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.27", outcomeText: "Identify three everyday uses of technology" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.28", outcomeText: "Use technology requiring not more than three functions" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.29", outcomeText: "Use technology to communicate in an activity with others" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.30", outcomeText: "Use a new piece of ICT equipment" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.31", outcomeText: "Turn a personal computer on and off safely" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.32", outcomeText: "Identify the information symbols on a desktop" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.33", outcomeText: "Use frequently used keys appropriately" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.34", outcomeText: "Use a software package, involving opening, entering text/image/data, save, print and exit" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.35", outcomeText: "Access a range of websites on the internet" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.36", outcomeText: "Find information for a project on the web" },
  { programme: "L2LP", pluNumber: 1, pluName: "Communicating and literacy", elementName: "Technology and ICT", outcomeCode: "1.37", outcomeText: "Send and open an email" },

  // =============================================================================
  // PLU 2: NUMERACY (38 outcomes)
  // =============================================================================
  // Element: Managing money
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Managing money", outcomeCode: "2.1", outcomeText: "Recognise frequently used Euro notes and coins" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Managing money", outcomeCode: "2.2", outcomeText: "Pay for an item correctly and count the change in a shopping transaction" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Managing money", outcomeCode: "2.3", outcomeText: "Explain a shopping receipt, in relation to what was bought, money tendered and change" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Managing money", outcomeCode: "2.4", outcomeText: "Understand a common household bill in relation to service, charges and payment" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Managing money", outcomeCode: "2.5", outcomeText: "Recognise the difference between essential items and luxury items" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Managing money", outcomeCode: "2.6", outcomeText: "Plan a personal budget for a week" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Managing money", outcomeCode: "2.7", outcomeText: "Save a small amount of money each week to buy an item" },
  // Element: Developing an awareness of number
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Number awareness", outcomeCode: "2.8", outcomeText: "Recognise numbers up to 100" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Number awareness", outcomeCode: "2.9", outcomeText: "Recognise place value in relation to units, tens and hundreds" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Number awareness", outcomeCode: "2.10", outcomeText: "Add two digit whole numbers that total less than 100 in an everyday situation" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Number awareness", outcomeCode: "2.11", outcomeText: "Subtract two digit whole numbers in the context of an everyday situation" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Number awareness", outcomeCode: "2.12", outcomeText: "Estimate quantities to the nearest value in broad terms" },
  // Element: Developing an awareness of temperature
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Temperature", outcomeCode: "2.13", outcomeText: "Use appropriate words to describe temperature" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Temperature", outcomeCode: "2.14", outcomeText: "Identify instruments used for indicating and adjusting temperature" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Temperature", outcomeCode: "2.15", outcomeText: "Relate temperatures to everyday situations" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Temperature", outcomeCode: "2.16", outcomeText: "Locate appropriate temperatures on a cooker dial" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Temperature", outcomeCode: "2.17", outcomeText: "Compare temperatures for the different times of the year" },
  // Element: Developing an awareness of weight and capacity
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Weight and capacity", outcomeCode: "2.18", outcomeText: "Use appropriate vocabulary to describe the units of weight and capacity" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Weight and capacity", outcomeCode: "2.19", outcomeText: "Identify the marks for the units of weight and capacity" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Weight and capacity", outcomeCode: "2.20", outcomeText: "List some examples of weight and capacity from daily life" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Weight and capacity", outcomeCode: "2.21", outcomeText: "Use a graduated vessel to work out the capacity of liquids" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Weight and capacity", outcomeCode: "2.22", outcomeText: "Use a weighing scales to work out the weight of powders and solids" },
  // Element: Developing an awareness of length and distance
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Length and distance", outcomeCode: "2.23", outcomeText: "Use appropriate vocabulary to describe the units in length and distance" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Length and distance", outcomeCode: "2.24", outcomeText: "Identify the units of length and distance on a ruler, metre stick and measuring tape" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Length and distance", outcomeCode: "2.25", outcomeText: "Use a ruler to draw and measure different lengths of lines" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Length and distance", outcomeCode: "2.26", outcomeText: "Estimate the length of common objects" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Length and distance", outcomeCode: "2.27", outcomeText: "Measure the length of common places using a measuring tape" },
  // Element: Using a calculator
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Calculator skills", outcomeCode: "2.28", outcomeText: "Find digits 0-9, decimal point and operation buttons on a calculator" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Calculator skills", outcomeCode: "2.29", outcomeText: "Use a calculator to solve simple problems" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Calculator skills", outcomeCode: "2.30", outcomeText: "Use a calculator to correct work completed without the calculator" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Calculator skills", outcomeCode: "2.31", outcomeText: "Find and use a calculator on a mobile phone" },
  // Element: Developing spatial awareness
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Spatial awareness", outcomeCode: "2.32", outcomeText: "Use appropriate vocabulary to describe 2D and 3D shapes" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Spatial awareness", outcomeCode: "2.33", outcomeText: "Identify 2D shapes in the environment" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Spatial awareness", outcomeCode: "2.34", outcomeText: "Identify 3D shapes in the environment" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Spatial awareness", outcomeCode: "2.35", outcomeText: "Complete a simple pattern using shapes" },
  // Element: Developing an awareness of time
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Time", outcomeCode: "2.36", outcomeText: "Tell the time to the quarter hour on analogue and digital clocks" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Time", outcomeCode: "2.37", outcomeText: "Interpret simple timetables" },
  { programme: "L2LP", pluNumber: 2, pluName: "Numeracy", elementName: "Time", outcomeCode: "2.38", outcomeText: "Use a calendar to record important dates and events" },

  // =============================================================================
  // PLU 3: PERSONAL CARE (29 outcomes)
  // =============================================================================
  // Element: Looking after myself
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Looking after myself", outcomeCode: "3.1", outcomeText: "Understand the importance of personal hygiene and cleanliness" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Looking after myself", outcomeCode: "3.2", outcomeText: "Maintain personal hygiene routines independently" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Looking after myself", outcomeCode: "3.3", outcomeText: "Select and use appropriate personal hygiene products" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Looking after myself", outcomeCode: "3.4", outcomeText: "Dress appropriately for different occasions and weather" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Looking after myself", outcomeCode: "3.5", outcomeText: "Maintain personal appearance and grooming" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Looking after myself", outcomeCode: "3.6", outcomeText: "Identify when clothing needs to be changed or laundered" },
  // Element: Making healthy choices
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Healthy choices", outcomeCode: "3.7", outcomeText: "Identify foods that are healthy and foods to eat in moderation" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Healthy choices", outcomeCode: "3.8", outcomeText: "Plan simple healthy meals for the day" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Healthy choices", outcomeCode: "3.9", outcomeText: "Understand the importance of regular exercise" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Healthy choices", outcomeCode: "3.10", outcomeText: "Participate in physical activities regularly" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Healthy choices", outcomeCode: "3.11", outcomeText: "Understand the importance of adequate sleep and rest" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Healthy choices", outcomeCode: "3.12", outcomeText: "Recognise the effects of substances on health" },
  // Element: Keeping safe
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Keeping safe", outcomeCode: "3.13", outcomeText: "Identify trusted adults who can help in different situations" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Keeping safe", outcomeCode: "3.14", outcomeText: "Recognise and respond to unsafe situations" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Keeping safe", outcomeCode: "3.15", outcomeText: "Follow safety rules in different environments" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Keeping safe", outcomeCode: "3.16", outcomeText: "Use emergency services appropriately" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Keeping safe", outcomeCode: "3.17", outcomeText: "Understand personal boundaries and consent" },
  // Element: Food preparation and nutrition
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Food preparation", outcomeCode: "3.18", outcomeText: "Identify and use kitchen equipment safely" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Food preparation", outcomeCode: "3.19", outcomeText: "Follow basic food hygiene practices" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Food preparation", outcomeCode: "3.20", outcomeText: "Prepare simple cold snacks independently" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Food preparation", outcomeCode: "3.21", outcomeText: "Prepare simple hot foods with supervision" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Food preparation", outcomeCode: "3.22", outcomeText: "Store food safely and appropriately" },
  // Element: Health and wellbeing
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Health and wellbeing", outcomeCode: "3.23", outcomeText: "Recognise signs of common illnesses" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Health and wellbeing", outcomeCode: "3.24", outcomeText: "Know when and how to seek medical help" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Health and wellbeing", outcomeCode: "3.25", outcomeText: "Take medication safely with guidance" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Health and wellbeing", outcomeCode: "3.26", outcomeText: "Understand the importance of dental hygiene" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Health and wellbeing", outcomeCode: "3.27", outcomeText: "Identify strategies to manage stress and emotions" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Health and wellbeing", outcomeCode: "3.28", outcomeText: "Understand changes in the body during adolescence" },
  { programme: "L2LP", pluNumber: 3, pluName: "Personal care", elementName: "Health and wellbeing", outcomeCode: "3.29", outcomeText: "Maintain positive mental health and seek support when needed" },

  // =============================================================================
  // PLU 4: LIVING IN A COMMUNITY (32 outcomes)
  // =============================================================================
  // Element: Me and my home
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Me and my home", outcomeCode: "4.1", outcomeText: "State own name, address and phone number" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Me and my home", outcomeCode: "4.2", outcomeText: "Describe family members and their roles" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Me and my home", outcomeCode: "4.3", outcomeText: "Contribute to household chores and routines" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Me and my home", outcomeCode: "4.4", outcomeText: "Keep personal belongings organised" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Me and my home", outcomeCode: "4.5", outcomeText: "Show respect for shared spaces and others belongings" },
  // Element: Using facilities in my community
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Community facilities", outcomeCode: "4.6", outcomeText: "Identify local shops and services in the community" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Community facilities", outcomeCode: "4.7", outcomeText: "Use local shops to make purchases independently" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Community facilities", outcomeCode: "4.8", outcomeText: "Access community services such as library or post office" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Community facilities", outcomeCode: "4.9", outcomeText: "Use recreational facilities in the community" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Community facilities", outcomeCode: "4.10", outcomeText: "Follow rules and expectations in public places" },
  // Element: Getting around
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Getting around", outcomeCode: "4.11", outcomeText: "Navigate familiar routes independently" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Getting around", outcomeCode: "4.12", outcomeText: "Cross roads safely using pedestrian crossings" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Getting around", outcomeCode: "4.13", outcomeText: "Read and interpret common signs in the community" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Getting around", outcomeCode: "4.14", outcomeText: "Use public transport with appropriate support" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Getting around", outcomeCode: "4.15", outcomeText: "Plan simple journeys using timetables" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Getting around", outcomeCode: "4.16", outcomeText: "Know what to do if lost or plans change unexpectedly" },
  // Element: Getting on with others
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Social skills", outcomeCode: "4.17", outcomeText: "Greet and interact appropriately with different people" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Social skills", outcomeCode: "4.18", outcomeText: "Maintain friendships and positive relationships" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Social skills", outcomeCode: "4.19", outcomeText: "Resolve conflicts in a constructive way" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Social skills", outcomeCode: "4.20", outcomeText: "Show respect for others opinions and differences" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Social skills", outcomeCode: "4.21", outcomeText: "Participate in group activities cooperatively" },
  // Element: Leisure and recreation
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Leisure and recreation", outcomeCode: "4.22", outcomeText: "Identify personal interests and hobbies" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Leisure and recreation", outcomeCode: "4.23", outcomeText: "Participate in leisure activities independently or with others" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Leisure and recreation", outcomeCode: "4.24", outcomeText: "Use technology for leisure appropriately" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Leisure and recreation", outcomeCode: "4.25", outcomeText: "Plan and organise leisure time" },
  // Element: Rights and responsibilities
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Rights and responsibilities", outcomeCode: "4.26", outcomeText: "Understand personal rights and responsibilities" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Rights and responsibilities", outcomeCode: "4.27", outcomeText: "Recognise and report unfair treatment" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Rights and responsibilities", outcomeCode: "4.28", outcomeText: "Respect the rights of others" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Rights and responsibilities", outcomeCode: "4.29", outcomeText: "Understand the role of community helpers and services" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Rights and responsibilities", outcomeCode: "4.30", outcomeText: "Care for the environment and community spaces" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Rights and responsibilities", outcomeCode: "4.31", outcomeText: "Demonstrate awareness of being a citizen of Ireland" },
  { programme: "L2LP", pluNumber: 4, pluName: "Living in a community", elementName: "Rights and responsibilities", outcomeCode: "4.32", outcomeText: "Participate in community events and activities" },

  // =============================================================================
  // PLU 5: PREPARING FOR WORK (30 outcomes)
  // =============================================================================
  // Element: Self-awareness
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Self-awareness", outcomeCode: "5.1", outcomeText: "Identify personal strengths, skills and interests" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Self-awareness", outcomeCode: "5.2", outcomeText: "Set realistic personal goals" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Self-awareness", outcomeCode: "5.3", outcomeText: "Identify areas for personal development" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Self-awareness", outcomeCode: "5.4", outcomeText: "Advocate for personal needs and preferences" },
  // Element: Exploring the world of work
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "World of work", outcomeCode: "5.5", outcomeText: "Identify different types of jobs and workplaces" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "World of work", outcomeCode: "5.6", outcomeText: "Describe the work of familiar people" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "World of work", outcomeCode: "5.7", outcomeText: "Explore jobs related to personal interests" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "World of work", outcomeCode: "5.8", outcomeText: "Understand why people work" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "World of work", outcomeCode: "5.9", outcomeText: "Recognise different pathways after school" },
  // Element: Work-related skills
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work-related skills", outcomeCode: "5.10", outcomeText: "Follow instructions to complete tasks" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work-related skills", outcomeCode: "5.11", outcomeText: "Complete tasks within expected timeframes" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work-related skills", outcomeCode: "5.12", outcomeText: "Use equipment and materials safely" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work-related skills", outcomeCode: "5.13", outcomeText: "Organise work materials and space" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work-related skills", outcomeCode: "5.14", outcomeText: "Solve simple problems that arise during tasks" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work-related skills", outcomeCode: "5.15", outcomeText: "Ask for help appropriately when needed" },
  // Element: Working with others
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Working with others", outcomeCode: "5.16", outcomeText: "Work cooperatively as part of a team" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Working with others", outcomeCode: "5.17", outcomeText: "Accept and respond to feedback constructively" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Working with others", outcomeCode: "5.18", outcomeText: "Communicate effectively with colleagues" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Working with others", outcomeCode: "5.19", outcomeText: "Show respect for supervisors and co-workers" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Working with others", outcomeCode: "5.20", outcomeText: "Contribute ideas during group work" },
  // Element: Workplace behaviours
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Workplace behaviours", outcomeCode: "5.21", outcomeText: "Demonstrate reliability and punctuality" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Workplace behaviours", outcomeCode: "5.22", outcomeText: "Dress appropriately for the workplace" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Workplace behaviours", outcomeCode: "5.23", outcomeText: "Maintain appropriate behaviour in the workplace" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Workplace behaviours", outcomeCode: "5.24", outcomeText: "Follow health and safety rules in the workplace" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Workplace behaviours", outcomeCode: "5.25", outcomeText: "Show initiative and willingness to learn" },
  // Element: Work experience
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work experience", outcomeCode: "5.26", outcomeText: "Participate in work experience or simulated work activities" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work experience", outcomeCode: "5.27", outcomeText: "Reflect on work experience and identify learning" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work experience", outcomeCode: "5.28", outcomeText: "Create a simple CV or personal profile" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work experience", outcomeCode: "5.29", outcomeText: "Prepare for and participate in a practice interview" },
  { programme: "L2LP", pluNumber: 5, pluName: "Preparing for work", elementName: "Work experience", outcomeCode: "5.30", outcomeText: "Plan for transition after school" },
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
      
      // Transform JSON format to database format (snake_case to camelCase)
      const outcomesToInsert = officialOutcomes.map((o: any) => ({
        programme: o.programme,
        pluNumber: o.plu_number,
        pluName: o.plu_name,
        elementName: o.element_name,
        outcomeCode: o.outcome_code,
        outcomeText: o.outcome_text,
      }));

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
