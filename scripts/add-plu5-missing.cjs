const fs = require('fs');
const crypto = require('crypto');

const seedPath = 'data/all_learning_outcomes_seed.json';
let outcomes = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// Check if JC_L2LP 5.24+ already exists
const existing = outcomes.filter(o => 
  o.programme === 'JC_L2LP' && 
  o.plu_or_module_code === 'JC-L2-PLU5' &&
  parseFloat(o.outcome_code) >= 5.24
);

if (existing.length > 0) {
  console.log('JC_L2LP outcomes 5.24+ already exist:', existing.length);
  process.exit(0);
}

// Missing outcomes 5.24-5.32 for JC_L2LP Preparing for Work
const newOutcomes = [
  { code: "5.24", text: "Gather background information to help plan and participate in the activity" },
  { code: "5.25", text: "Sequence a number of steps to be taken to successfully complete the activity" },
  { code: "5.26", text: "Assume a role in the activity and identify tasks linked with the role" },
  { code: "5.27", text: "Use key words associated with the activity correctly" },
  { code: "5.28", text: "Identify safety procedures and/or permissions required for the activity" },
  { code: "5.29", text: "Learn how to use tools or equipment associated with the activity safely and correctly" },
  { code: "5.30", text: "Participate in the activity" },
  { code: "5.31", text: "Review the activity to evaluate its success" },
  { code: "5.32", text: "Assess effectiveness of own role in the activity" }
];

// Add new outcomes
newOutcomes.forEach((outcome, idx) => {
  const uid = crypto.randomBytes(6).toString('hex');
  outcomes.push({
    uid,
    programme: "JC_L2LP",
    plu_or_module_code: "JC-L2-PLU5",
    plu_or_module_title: "Preparing for work",
    element_title: "Participating in an enterprise activity",
    outcome_code: outcome.code,
    outcome_text: outcome.text,
    sort_order: 24 + idx
  });
});

fs.writeFileSync(seedPath, JSON.stringify(outcomes, null, 2));

// Verify
const jcL2Plu5 = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  .filter(o => o.programme === 'JC_L2LP' && o.plu_or_module_code === 'JC-L2-PLU5');
console.log(`Added ${newOutcomes.length} new outcomes to JC_L2LP Preparing for Work`);
console.log(`New total: ${jcL2Plu5.length} outcomes (expected: 32)`);
