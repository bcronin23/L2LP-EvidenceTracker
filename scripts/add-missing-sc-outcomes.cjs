const fs = require('fs');
const crypto = require('crypto');

function generateUid(programme, moduleCode, elementTitle, outcomeCode) {
  const key = `${programme}::${moduleCode}::${elementTitle || ''}::${outcomeCode}`;
  return crypto.createHash('md5').update(key).digest('hex').slice(0, 12);
}

const missingSCL1CommunicationLiteracy = [
  { module: "Exploring Communication", element: "Communication", outcomes: [
    { code: "a.", text: "Demonstrate awareness of sensory stimuli in the learning environment" },
    { code: "b.", text: "Interact with familiar and unfamiliar people in their environment" },
    { code: "c.", text: "Respond to verbal and nonverbal cues relating to familiar communicative routines" },
    { code: "d.", text: "Respond to familiar questions and statements" },
    { code: "e.", text: "Express contentment, happiness, sadness or upset" },
    { code: "f.", text: "Communicate with a partner by using devices or other communicative means" },
    { code: "g.", text: "Communicate own interests, preferences, choices or opinions" },
    { code: "h.", text: "Communicate needs" },
    { code: "i.", text: "Communicate to ask questions" },
    { code: "j.", text: "Demonstrate an understanding of the use of gestures, tone and volume of vocalisations" },
    { code: "k.", text: "Maintain patterns of attending to stimuli, sensory stimuli, people and activities in their environment" },
    { code: "l.", text: "Show signs of anticipation and prediction to familiar activity when presented with stimuli and sensory stimuli" },
  ]},
  { module: "Communicating with others", element: "Communicating with others", outcomes: [
    { code: "a.", text: "Demonstrate choice to preferred activities and/or objects" },
    { code: "b.", text: "Request repetition, change of objects, activity" },
    { code: "c.", text: "Participate in turn taking with others" },
    { code: "d.", text: "Engage in a range of interactions and exchanges with others including in play" },
    { code: "e.", text: "Respond to increased use of words and vocabulary, spoken and in text" },
    { code: "f.", text: "Show signs of engagement and enjoyment to a text being shared" },
    { code: "g.", text: "Demonstrate recognition of some familiar words, symbols, visuals, signs and objects of reference" },
    { code: "h.", text: "Independently or with support, follow simple instructions, verbal and non-verbal" },
  ]},
  { module: "Exploring Expression", element: "Expression", outcomes: [
    { code: "a.", text: "Engage with the mechanics of creating a text, appropriate to the student" },
    { code: "b.", text: "Indicate enjoyment or dislike while creating an appropriate form of text, verbally or non-verbally" },
    { code: "c.", text: "Use a variety of materials and surfaces for creating texts" },
    { code: "d.", text: "Indicate or choose a material to create text" },
    { code: "e.", text: "Indicate verbally or non-verbally the understanding that texts, symbols, visuals and music carry meaning" },
    { code: "f.", text: "Show understanding of the left to right and top to bottom orientation of written text and page turning" },
    { code: "g.", text: "Indicate awareness of important and familiar letters, words, sounds, music, smells or tastes" },
    { code: "h.", text: "Engage with the creation of letters of personal importance" },
    { code: "i.", text: "Progressively use signs, symbols or text to share experiences, thoughts, opinions, preferences with others" },
    { code: "j.", text: "Demonstrate an ability to engage with the process of drawing with some level of control and direction" },
  ]},
];

const missingSCL1Numeracy = [
  { module: "Demonstrating an awareness of number", element: "Demonstrating an awareness of number", outcomes: [
    { code: "a.", text: "Explore, experience or participate in counting activities (concrete and non-concrete)" },
    { code: "b.", text: "Demonstrate one on one correspondence when counting" },
    { code: "c.", text: "Explore how counting can be used to solve problems relating to their everyday world" },
    { code: "d.", text: "Demonstrate an awareness of more, less and many" },
    { code: "e.", text: "Count forwards with verbal, concrete manipulatives, and pictorial support" },
    { code: "f.", text: "Count and quantify objects or people with support" },
    { code: "g.", text: "Connect numbers to counted objects using supports" },
    { code: "h.", text: "Demonstrate how numbers are used for quantifying sets" },
    { code: "i.", text: "Demonstrate that the last number in a counted group indicates the quantity of the set" },
    { code: "j.", text: "Use number appropriately in play situations" },
    { code: "k.", text: "Demonstrate knowledge of number with the use of appropriate materials and supports" },
    { code: "l.", text: "Recognise numbers of personal significance" },
    { code: "m.", text: "Demonstrate a knowledge of one, more than one, some and a lot" },
    { code: "n.", text: "Demonstrate an understanding of the concept of none, zero and all gone" },
    { code: "o.", text: "Recognise the number zero represents nothing/none in terms of quantity" },
    { code: "p.", text: "Represent data with objects of reference such as pictures or symbols" },
  ]},
  { module: "Understanding money", element: "Understanding money", outcomes: [
    { code: "a.", text: "Demonstrate an awareness that coins and paper notes are both money" },
    { code: "b.", text: "Demonstrate an awareness that money has a purpose and value" },
    { code: "c.", text: "Demonstrate an awareness that items can be bought using coins, paper notes or a card" },
    { code: "d.", text: "Recognise the euro and cent symbols and that they represent money" },
    { code: "e.", text: "Recognise and use the language associated with money" },
    { code: "f.", text: "Purchase items using money" },
    { code: "g.", text: "Purchase items as part of a cashless transaction" },
    { code: "h.", text: "Attend to and/or count money" },
  ]},
  { module: "Reading and measuring time", element: "Reading and measuring time", outcomes: [
    { code: "a.", text: "Experience the physical movement of the hands on an analogue clock in a clockwise direction to indicate the passing of time" },
    { code: "b.", text: "Demonstrate an awareness of the clock as a tool for the measurement of time" },
    { code: "c.", text: "Engage with the order of daily routine (at home and at school)" },
    { code: "d.", text: "Engage with key transitions throughout the day" },
    { code: "e.", text: "Show an awareness of or recognise key times of the school day" },
    { code: "f.", text: "Demonstrate awareness of the difference between nighttime and daytime, morning time and evening time" },
    { code: "g.", text: "Experience and attend to the language of time in relation to self, family and school events and activities" },
    { code: "h.", text: "Experience and attend to the language of days, months and key seasonal events" },
    { code: "i.", text: "With the use of appropriate aids, sequence events according to time" },
    { code: "j.", text: "Recognise a personally meaningful day of the week or month" },
  ]},
  { module: "Measurement", element: "Measurement", outcomes: [
    { code: "a.", text: "Explore everyday items and objects in relation to measurement or size" },
    { code: "b.", text: "Engage with the language and real world activities associated with measurement" },
    { code: "c.", text: "Engage in comparing items or objects in relation to measurement" },
    { code: "d.", text: "Engage with using non-standard units for measurement" },
    { code: "e.", text: "Demonstrate an awareness that length, weight, capacity and time can be measured" },
    { code: "f.", text: "Recognise and name instruments that are used for measuring" },
    { code: "g.", text: "Engage in measuring activities with support" },
    { code: "h.", text: "Recognise and sort coins and paper notes" },
  ]},
];

const missingSCL1Environment = [
  { module: "Looking after my Environment", element: "Their environment", outcomes: [
    { code: "a.", text: "Observe some of the distinctive natural features of their environments" },
    { code: "b.", text: "Observe some of the distinctive human-made features of their environments" },
    { code: "c.", text: "Observe different flora and fauna" },
    { code: "d.", text: "Identify people, occupations and organisations/groups who live and work in the locality and their roles in the community" },
    { code: "e.", text: "Recognise and record features encountered on routine journeys" },
    { code: "f.", text: "Record and display simple weather observations by using charts and/or common meteorological symbols" },
    { code: "g.", text: "Recognise different weather conditions and changes in weather" },
    { code: "h.", text: "Identify and plan for the impact of weather on daily routines" },
  ]},
  { module: "Looking after my Environment", element: "Individual and community responsibility", outcomes: [
    { code: "i.", text: "Use appropriate tools and equipment safely while undertaking an environmental activity" },
    { code: "j.", text: "Participate in the care of a plant or animal in their environment" },
    { code: "k.", text: "Recognise the importance of caring for plants or animals in their environment" },
    { code: "l.", text: "Engage in activities that have a positive impact on the environment, such as reducing energy consumption, waste generation and water usage" },
    { code: "m.", text: "Use appropriate tools and equipment safely while undertaking an environmental activity" },
    { code: "n.", text: "Demonstrate safe working practices while undertaking an environmental activity" },
    { code: "o.", text: "Identify everyday items that can be reused" },
    { code: "p.", text: "Reuse a common household material or item" },
    { code: "q.", text: "Upcycle a common household item" },
    { code: "r.", text: "Recognise symbols and signs related to recycling" },
    { code: "s.", text: "Separate recyclable materials into categories (plastic, paper, metal, etc.)" },
  ]},
];

const missingSCL2CommunicationLiteracy = [
  { module: "Exploring Communication", element: "Non-verbal communication", outcomes: [
    { code: "a.", text: "Use a variety of non-verbal communication methods" },
    { code: "b.", text: "Demonstrate understanding and ability to use and respond to non-verbal and non-written communication" },
    { code: "c.", text: "Demonstrate the use of non-verbal communication to express and share feelings" },
    { code: "d.", text: "Demonstrate the use of non-verbal communication to express understanding of the feelings of others" },
    { code: "e.", text: "Follow non-verbal instructions and directions" },
    { code: "f.", text: "Initiate, engage or maintain eye contact when being spoken to or otherwise demonstrate attention" },
  ]},
  { module: "Exploring Communication", element: "Communicating with others", outcomes: [
    { code: "g.", text: "Participate in pair work, group work and classroom discussion" },
    { code: "h.", text: "Ask questions to progress a task and make suggestions to progress a task when working collaboratively" },
    { code: "i.", text: "Increase awareness of appropriate social conventions in all interactions" },
    { code: "j.", text: "Demonstrate understanding by responding to the stories of others" },
    { code: "k.", text: "Identify changes in language styles and tone dependent upon relationship and audience" },
    { code: "l.", text: "Distinguish between formal and informal language" },
    { code: "m.", text: "Show understanding by following instructions, requests, and explanations" },
    { code: "n.", text: "Present a story to a group using sequencing and/or oral vocabulary and/or visual supports" },
  ]},
  { module: "Promoting Engagement", element: "Engaging with intent", outcomes: [
    { code: "a.", text: "Listen to others and demonstrate attention by responding" },
    { code: "b.", text: "Ask for, seek clarification or challenge the views and opinions of another" },
    { code: "c.", text: "Build upon what has already been said" },
    { code: "d.", text: "Provide an appropriate response to a comment or question" },
    { code: "e.", text: "Extract meaning from a conversation and provide a response" },
    { code: "f.", text: "Ask question(s) to extend own understanding and knowledge" },
    { code: "g.", text: "Present to peers on a topic of interest or address an audience" },
  ]},
  { module: "Promoting Engagement", element: "Self-expression", outcomes: [
    { code: "h.", text: "Communicate personal needs, emotions and make requests" },
    { code: "i.", text: "Communicate hobbies or interests in a formal and an informal setting" },
    { code: "j.", text: "Communicate feelings and opinions in pair or group discussions" },
    { code: "k.", text: "Communicate a personal preference and give a rationale for that opinion" },
    { code: "l.", text: "Give an informed opinion or make a point on others' work" },
    { code: "m.", text: "Actively attend to and respond to the feelings and opinions of others" },
    { code: "n.", text: "Know how to ask for help, advice or make a complaint in person or via online appropriately and with confidence" },
  ]},
  { module: "Exploring Reading", element: "Reading for pleasure", outcomes: [
    { code: "a.", text: "Identify themselves as a reader" },
    { code: "b.", text: "Recognise that reading can be for pleasure and to gain information" },
    { code: "c.", text: "Independently choose a piece of reading" },
    { code: "d.", text: "Share opinions on a piece of reading and listen to others' opinions" },
    { code: "e.", text: "Identify accompanying images and use them to aid comprehension and enjoyment of text" },
    { code: "f.", text: "Identify new vocabulary from reading and relate it to known vocabulary" },
    { code: "g.", text: "Build upon functional reading fluidity" },
    { code: "h.", text: "Seek clarification and ask questions about a piece of text" },
    { code: "i.", text: "Identify characters and events in a story" },
    { code: "j.", text: "Make predictions about what will happen next in a story" },
    { code: "k.", text: "Use context clues to determine the meaning of unfamiliar words" },
    { code: "l.", text: "Summarise the main points of a piece of text" },
  ]},
  { module: "Expression through Writing", element: "Writing for purpose", outcomes: [
    { code: "a.", text: "Demonstrate an understanding that writing is a form of communication" },
    { code: "b.", text: "Write for a range of purposes" },
    { code: "c.", text: "Plan and organise ideas before writing" },
    { code: "d.", text: "Use appropriate vocabulary in writing" },
    { code: "e.", text: "Use correct grammar and punctuation in writing" },
    { code: "f.", text: "Edit and revise own writing" },
    { code: "g.", text: "Present written work neatly and clearly" },
    { code: "h.", text: "Use digital tools for writing when appropriate" },
  ]},
];

const missingSCL2Numeracy = [
  { module: "Understanding number and money", element: "Numbers", outcomes: [
    { code: "a.", text: "Identify how many zeros for tens, hundreds thousands and millions" },
    { code: "b.", text: "Estimate quantities to the nearest value in real world contexts in 10s, 100s or 1000s" },
    { code: "c.", text: "Use numbers to designate an amount or quantity" },
    { code: "d.", text: "Identify situations where it is appropriate to add or subtract numbers and complete the operation" },
    { code: "e.", text: "Identify, recognise and use symbols for addition and subtraction" },
    { code: "f.", text: "Identify natural numbers from 0 to 1000" },
    { code: "g.", text: "Identify situations where one would multiply or divide and engage in the multiplication or division operation in real world contexts" },
    { code: "h.", text: "Construct any sentence using + - / = x or words" },
    { code: "i.", text: "Recognise and name equal parts of a whole such as halves, quarters, thirds" },
    { code: "j.", text: "Connect halves and quarters to equal sharing and to groups" },
    { code: "k.", text: "Identify, name and express fractions of a quantity such as length, weight and capacity" },
    { code: "l.", text: "Identify, name and express fractions of a quantity such as time, an amount or a shape" },
    { code: "m.", text: "Engage with a fraction chart and identify equal fractions" },
    { code: "n.", text: "Demonstrate the rules of equal sharing in real world scenarios" },
    { code: "o.", text: "Use ratio to describe the relationship between two quantities" },
  ]},
  { module: "Understanding number and money", element: "Money", outcomes: [
    { code: "p.", text: "Sort coins and paper notes into groups to create a total amount" },
    { code: "q.", text: "Recognise that different coins and paper notes have different values in a shopping experience" },
    { code: "r.", text: "Undertake transactions using money" },
    { code: "s.", text: "Calculate the total cost of a list of items" },
    { code: "t.", text: "Round off prices to nearest one, ten, fifty, hundred euro" },
    { code: "u.", text: "Estimate a bill or a receipt and estimate change due" },
    { code: "v.", text: "Interpret a bill or a receipt" },
    { code: "w.", text: "Recognise that money is received and spent in different ways" },
    { code: "x.", text: "Plan and estimate the cost and savings required to attend an event or purchase an item" },
    { code: "y.", text: "Make a payment or transfer money online/using a device" },
  ]},
  { module: "Understanding and managing time", element: "Reading and measuring time", outcomes: [
    { code: "a.", text: "Recognise different instruments for telling the time" },
    { code: "b.", text: "Identify times on an analogue clock" },
    { code: "c.", text: "Read the time from a digital clock" },
    { code: "d.", text: "Examine time in 12 hour and 24-hour formats" },
    { code: "e.", text: "Recognise or identify the difference between a.m. and p.m." },
    { code: "f.", text: "Use language related to time in different settings" },
    { code: "g.", text: "Recognise key times of the day on a clock" },
    { code: "h.", text: "Recognise how many seconds in a minute, minutes in an hour, hours in a day, days in a week, weeks in a month, months in a year" },
    { code: "i.", text: "Interpret and use a timeline" },
    { code: "j.", text: "Interpret and use a timetable" },
    { code: "k.", text: "Demonstrate the ability to calculate and interpret the passage of time" },
    { code: "l.", text: "Relate a difference in time to different places/regions" },
  ]},
  { module: "Understanding and managing time", element: "Time management", outcomes: [
    { code: "m.", text: "Identify and use time management skills such as: adapt to be ready on time, prepare before a given time, allow time to clear up" },
    { code: "n.", text: "Identify and sequence events in their daily routine using associated language and aid" },
    { code: "o.", text: "Identify the importance of time management for everyday activities" },
    { code: "p.", text: "Use calendars and schedules to plan activities" },
  ]},
  { module: "Understanding measurement, location and position", element: "Measurement", outcomes: [
    { code: "a.", text: "Estimate, compare and measure length using appropriate measuring instruments" },
    { code: "b.", text: "Estimate, compare and measure weight using appropriate measuring instruments" },
    { code: "c.", text: "Estimate, compare and measure capacity using appropriate measuring instruments" },
    { code: "d.", text: "Recognise and use standard units of measurement" },
    { code: "e.", text: "Apply measurement skills in real world contexts" },
    { code: "f.", text: "Calculate perimeter and area of simple shapes" },
  ]},
  { module: "Understanding measurement, location and position", element: "Location and position", outcomes: [
    { code: "g.", text: "Use positional language to describe location" },
    { code: "h.", text: "Follow and give directions" },
    { code: "i.", text: "Read and interpret simple maps" },
    { code: "j.", text: "Use grid references to locate places" },
    { code: "k.", text: "Understand the concept of scale on maps" },
  ]},
];

function buildOutcomes(programme, curriculumArea, moduleCode, data) {
  const outcomes = [];
  let sortOrder = 1;
  
  for (const section of data) {
    for (const outcome of section.outcomes) {
      const fullModuleCode = `${programme}-${curriculumArea}-${section.module.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
      const uid = generateUid(programme, fullModuleCode, section.element, outcome.code);
      outcomes.push({
        uid,
        programme,
        plu_or_module_code: fullModuleCode,
        plu_or_module_title: `${curriculumArea}: ${section.module}`,
        element_title: section.element,
        outcome_code: outcome.code,
        outcome_text: outcome.text,
        sort_order: sortOrder++
      });
    }
  }
  return outcomes;
}

const scl1CommLit = buildOutcomes('SC_L1LP', 'Communication and Literacy', 'COMM-LIT', missingSCL1CommunicationLiteracy);
const scl1Numeracy = buildOutcomes('SC_L1LP', 'Numeracy', 'NUMERACY', missingSCL1Numeracy);
const scl1Environment = buildOutcomes('SC_L1LP', 'Looking after my Environment', 'ENVIRONMENT', missingSCL1Environment);
const scl2CommLit = buildOutcomes('SC_L2LP', 'Communication and Literacy', 'COMM-LIT', missingSCL2CommunicationLiteracy);
const scl2Numeracy = buildOutcomes('SC_L2LP', 'Numeracy', 'NUMERACY', missingSCL2Numeracy);

const allNewOutcomes = [
  ...scl1CommLit,
  ...scl1Numeracy,
  ...scl1Environment,
  ...scl2CommLit,
  ...scl2Numeracy
];

console.log('New outcomes to add:');
console.log(`SC_L1LP Communication and Literacy: ${scl1CommLit.length}`);
console.log(`SC_L1LP Numeracy: ${scl1Numeracy.length}`);
console.log(`SC_L1LP Looking after my Environment: ${scl1Environment.length}`);
console.log(`SC_L2LP Communication and Literacy: ${scl2CommLit.length}`);
console.log(`SC_L2LP Numeracy: ${scl2Numeracy.length}`);
console.log(`Total new: ${allNewOutcomes.length}`);

const existingSeed = JSON.parse(fs.readFileSync('data/all_learning_outcomes_seed.json', 'utf-8'));
console.log(`Existing outcomes: ${existingSeed.length}`);

const existingUids = new Set(existingSeed.map(o => o.uid));
const uniqueNewOutcomes = allNewOutcomes.filter(o => !existingUids.has(o.uid));
console.log(`Unique new outcomes (not duplicates): ${uniqueNewOutcomes.length}`);

const merged = [...existingSeed, ...uniqueNewOutcomes];
fs.writeFileSync('data/all_learning_outcomes_seed.json', JSON.stringify(merged, null, 2));
console.log(`New total: ${merged.length}`);
console.log('Seed file updated successfully!');
