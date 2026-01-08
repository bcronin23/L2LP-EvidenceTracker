const fs = require('fs');
const crypto = require('crypto');

const seedPath = 'data/all_learning_outcomes_seed.json';
let outcomes = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// Define the 3 SC Personal Care modules based on NCCA structure
// Each outcome code appears in 3 columns (a, b, c) in source data
// Column pattern: col1 = Looking After My Wellbeing, col2 = Relationships, col3 = Personal Safety

const moduleMapping = {
  // Column 1: Looking After My Wellbeing (self-focused outcomes)
  'wellbeing': {
    code: 'LOOKING-AFTER-MY-WELLBEING',
    title: 'Looking After My Wellbeing',
    keywords: ['self', 'personal care', 'hygiene', 'clothes', 'body', 'physical', 'transition', 'daily', 'routine', 'preferences', 'self-reliance', 'goal', 'changing clothes', 'cleanliness', 'sexual', 'clothing', 'covering', 'coping', 'stress', 'self-regulation']
  },
  // Column 2: Relationships (social/interpersonal outcomes)
  'relationships': {
    code: 'RELATIONSHIPS',
    title: 'Relationships',
    keywords: ['others', 'peer', 'relationship', 'social', 'interaction', 'cooperation', 'cooperative', 'family', 'boundaries', 'consent', 'permission', 'yes', 'no', 'empathy', 'emotions', 'feelings', 'engagement', 'initiate', 'engage']
  },
  // Column 3: Personal Safety
  'safety': {
    code: 'PERSONAL-SAFETY',
    title: 'Personal Safety',
    keywords: ['safe', 'safety', 'danger', 'unsafe', 'hazard', 'emergency', 'help', 'medicine', 'refusal', 'inappropriate', 'appropriate behaviour', 'discomfort']
  }
};

function determineModule(outcomeText, programmeCode) {
  const text = outcomeText.toLowerCase();
  
  // Check for safety keywords first (most specific)
  for (const kw of moduleMapping.safety.keywords) {
    if (text.includes(kw)) {
      return `${programmeCode}-${moduleMapping.safety.code}`;
    }
  }
  
  // Check for relationships keywords
  for (const kw of moduleMapping.relationships.keywords) {
    if (text.includes(kw)) {
      return `${programmeCode}-${moduleMapping.relationships.code}`;
    }
  }
  
  // Default to wellbeing
  return `${programmeCode}-${moduleMapping.wellbeing.code}`;
}

function getModuleTitle(moduleCode) {
  if (moduleCode.includes('LOOKING-AFTER')) return 'Looking After My Wellbeing';
  if (moduleCode.includes('RELATIONSHIPS')) return 'Relationships';
  if (moduleCode.includes('PERSONAL-SAFETY')) return 'Personal Safety';
  return 'Personal Care';
}

// Process SC Personal Care outcomes
let updatedCount = 0;
const moduleCounts = { SC_L1LP: {}, SC_L2LP: {} };

outcomes = outcomes.map(o => {
  if ((o.programme === 'SC_L1LP' || o.programme === 'SC_L2LP') && 
      o.plu_or_module_title?.includes('Personal Care')) {
    const newCode = determineModule(o.outcome_text, o.programme);
    const newTitle = getModuleTitle(newCode);
    
    if (!moduleCounts[o.programme][newCode]) {
      moduleCounts[o.programme][newCode] = 0;
    }
    moduleCounts[o.programme][newCode]++;
    
    updatedCount++;
    return {
      ...o,
      plu_or_module_code: newCode,
      plu_or_module_title: newTitle
    };
  }
  return o;
});

fs.writeFileSync(seedPath, JSON.stringify(outcomes, null, 2));

console.log(`Updated ${updatedCount} SC Personal Care outcomes into 3 modules:`);
console.log('\nSC_L1LP:');
Object.entries(moduleCounts.SC_L1LP).forEach(([code, count]) => {
  console.log(`  ${getModuleTitle(code)}: ${count} outcomes`);
});
console.log('\nSC_L2LP:');
Object.entries(moduleCounts.SC_L2LP).forEach(([code, count]) => {
  console.log(`  ${getModuleTitle(code)}: ${count} outcomes`);
});
